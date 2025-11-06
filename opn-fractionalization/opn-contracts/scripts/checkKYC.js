// scripts/checkKYC.js
const hre = require("hardhat");

async function main() {
  const addressToCheck = process.env.CHECK_ADDRESS || process.argv[2];

  if (!addressToCheck) {
    console.error("❌ Please provide a wallet address to check!");
    console.error("Usage: npx hardhat run scripts/checkKYC.js --network sage -- 0xYourAddress");
    console.error("   or: CHECK_ADDRESS=0xYourAddress npx hardhat run scripts/checkKYC.js --network sage");
    process.exit(1);
  }

  const network = hre.network.name;
  console.log("Network:", network);
  console.log("🔍 Checking KYC status for:", addressToCheck);

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

  // Get contract instance (no signer needed for read-only)
  const KYCRegistry = await ethers.getContractAt("KYCRegistry", KYC_ADDRESS);

  try {
    // Check if verified
    const isVerified = await KYCRegistry.isVerified(addressToCheck);
    console.log("\n✅ KYC Status:", isVerified ? "VERIFIED" : "NOT VERIFIED");

    if (isVerified) {
      // Get detailed KYC data
      const kycData = await KYCRegistry.getUserKYCData(addressToCheck);
      console.log("\n📋 KYC Details:");
      console.log("- Verified:", kycData.verified);
      console.log("- Verification Date:", new Date(Number(kycData.verificationDate) * 1000).toLocaleString());
      console.log("- Expiry Date:", new Date(Number(kycData.expiryDate) * 1000).toLocaleString());
      console.log("- Verified By:", kycData.verifiedBy);
      console.log("- Document Hash:", kycData.documentHash);
      console.log("- Blacklisted:", kycData.isBlacklisted);

      const now = Math.floor(Date.now() / 1000);
      if (Number(kycData.expiryDate) < now) {
        console.log("\n⚠️  Warning: KYC has expired!");
      }
    }

    // Check if testnet mode is available
    try {
      const isTestnet = await KYCRegistry.isTestnet();
      console.log("\nTestnet Mode:", isTestnet);

      if (isTestnet && !isVerified) {
        console.log("\n💡 Tip: On testnet, you can self-verify by calling completeMockKYC() from your wallet");
      }
    } catch (e) {
      // Method might not exist on contract
    }

  } catch (error) {
    console.error("❌ Error checking KYC:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
