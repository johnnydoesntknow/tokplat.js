// scripts/completeMockKYC.js
const hre = require("hardhat");

async function main() {
  const network = hre.network.name;
  const [signer] = await ethers.getSigners();

  console.log("Network:", network);
  console.log("Wallet:", signer.address);

  // Contract addresses by network
  const KYC_ADDRESSES = {
    sage: "0x097774d0Ae34988C108b0609298Abe993B8e4b39",
    opn: "0x7d6de0Ab2b00875a6CEf64B4350c86A6F1e779CC"
  };

  const KYC_ADDRESS = KYC_ADDRESSES[network];

  if (!KYC_ADDRESS) {
    console.error("❌ No KYC contract address found for network:", network);
    process.exit(1);
  }

  console.log("KYC Contract:", KYC_ADDRESS);

  // Get contract instance
  const KYCRegistry = await ethers.getContractAt("KYCRegistry", KYC_ADDRESS, signer);

  try {
    // Check if already verified
    const isVerified = await KYCRegistry.isVerified(signer.address);

    if (isVerified) {
      console.log("\n✅ Your wallet is already KYC verified!");

      // Show details
      const kycData = await KYCRegistry.getUserKYCData(signer.address);
      console.log("\n📋 KYC Details:");
      console.log("- Verified:", kycData.verified);
      console.log("- Verification Date:", new Date(Number(kycData.verificationDate) * 1000).toLocaleString());
      console.log("- Expiry Date:", new Date(Number(kycData.expiryDate) * 1000).toLocaleString());
      return;
    }

    // Check if testnet
    let isTestnet = false;
    try {
      isTestnet = await KYCRegistry.isTestnet();
      console.log("Testnet Mode:", isTestnet);
    } catch (e) {
      console.log("Could not check testnet status");
    }

    if (!isTestnet) {
      console.log("\n⚠️  This is not a testnet. You need to be verified by a KYC verifier.");
      console.log("Contact the admin to get your wallet verified.");
      return;
    }

    console.log("\n📝 Completing mock KYC for your wallet...");

    // Complete mock KYC
    const tx = await KYCRegistry.completeMockKYC();
    console.log("Transaction hash:", tx.hash);

    const receipt = await tx.wait();
    console.log("✅ Mock KYC completed! Gas used:", receipt.gasUsed.toString());

    // Verify status
    const isVerifiedAfter = await KYCRegistry.isVerified(signer.address);
    console.log("\n✅ KYC Status:", isVerifiedAfter ? "VERIFIED" : "NOT VERIFIED");

    if (isVerifiedAfter) {
      const kycData = await KYCRegistry.getUserKYCData(signer.address);
      console.log("\n📋 KYC Details:");
      console.log("- Verified:", kycData.verified);
      console.log("- Verification Date:", new Date(Number(kycData.verificationDate) * 1000).toLocaleString());
      console.log("- Expiry Date:", new Date(Number(kycData.expiryDate) * 1000).toLocaleString());

      console.log("\n🎉 You can now create fractionalization requests!");
    }

  } catch (error) {
    console.error("\n❌ Error:", error.message);

    if (error.message.includes("Testnet mode is disabled")) {
      console.log("\n⚠️  Mock KYC is only available in testnet mode.");
      console.log("Contact the admin to get your wallet verified.");
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
