// scripts/verifyWallet.js
const hre = require("hardhat");

async function main() {
  // Get the wallet address to verify from command line or use a default
  const addressToVerify = process.env.VERIFY_ADDRESS || null;
  
  // Get network name
  const network = hre.network.name;
  console.log("Network:", network);

  // Get deployer (will use this as the address to verify if not specified)
  const [deployer] = await ethers.getSigners();
  const walletToVerify = addressToVerify || deployer.address;

  console.log("🔐 Verifying KYC for wallet:", walletToVerify);
  console.log("Using account:", deployer.address);

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
  const KYCRegistry = await ethers.getContractFactory("KYCRegistry");
  const kyc = KYCRegistry.attach(KYC_ADDRESS);
  
  // Check if deployer has KYC_VERIFIER_ROLE
  const KYC_VERIFIER_ROLE = await kyc.KYC_VERIFIER_ROLE();
  const hasRole = await kyc.hasRole(KYC_VERIFIER_ROLE, deployer.address);
  
  if (!hasRole) {
    console.log("⚠️  Deployer doesn't have KYC_VERIFIER_ROLE. Granting role...");
    const grantTx = await kyc.grantRole(KYC_VERIFIER_ROLE, deployer.address);
    await grantTx.wait();
    console.log("✅ KYC_VERIFIER_ROLE granted to deployer");
  }
  
  // Check current KYC status
  const isVerifiedBefore = await kyc.isVerified(walletToVerify);
  console.log("\nCurrent KYC status:", isVerifiedBefore);

  if (!isVerifiedBefore) {
    console.log("\n📝 Verifying KYC...");

    // Verify KYC for the specified address
    const tx = await kyc.verifyKYC(
      walletToVerify,
      "QmKYCDocument" + Date.now(), // Unique document hash
      0 // Use default validity period (365 days)
    );

    await tx.wait();
    console.log("✅ KYC verification transaction confirmed!");

    // Check status again
    const isVerifiedAfter = await kyc.isVerified(walletToVerify);
    console.log("New KYC status:", isVerifiedAfter);
  } else {
    console.log("✅ Wallet is already KYC verified!");
  }

  // Show KYC details
  try {
    const kycData = await kyc.getUserKYCData(walletToVerify);
    console.log("\n📋 KYC Details:");
    console.log("- Verified:", kycData.verified);
    console.log("- Verification Date:", new Date(Number(kycData.verificationDate) * 1000).toLocaleString());
    console.log("- Expiry Date:", new Date(Number(kycData.expiryDate) * 1000).toLocaleString());
    console.log("- Verified By:", kycData.verifiedBy);
    console.log("- Document Hash:", kycData.documentHash);
  } catch (error) {
    console.log("Could not fetch detailed KYC data");
  }

  console.log("\n✅ Wallet", walletToVerify, "can now create fractionalization requests!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });