// scripts/checkRoles.js
const hre = require("hardhat");

async function main() {
  const network = hre.network.name;
  const [signer] = await ethers.getSigners();

  console.log("Network:", network);
  console.log("Checking roles for:", signer.address);

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
  const KYCRegistry = await ethers.getContractAt("KYCRegistry", KYC_ADDRESS);

  try {
    // Get role identifiers
    const DEFAULT_ADMIN_ROLE = await KYCRegistry.DEFAULT_ADMIN_ROLE();
    const KYC_VERIFIER_ROLE = await KYCRegistry.KYC_VERIFIER_ROLE();

    console.log("\n📋 Role Identifiers:");
    console.log("DEFAULT_ADMIN_ROLE:", DEFAULT_ADMIN_ROLE);
    console.log("KYC_VERIFIER_ROLE:", KYC_VERIFIER_ROLE);

    // Check roles
    const hasAdmin = await KYCRegistry.hasRole(DEFAULT_ADMIN_ROLE, signer.address);
    const hasVerifier = await KYCRegistry.hasRole(KYC_VERIFIER_ROLE, signer.address);

    console.log("\n✅ Your Roles:");
    console.log("DEFAULT_ADMIN_ROLE:", hasAdmin ? "✓ YES" : "✗ NO");
    console.log("KYC_VERIFIER_ROLE:", hasVerifier ? "✓ YES" : "✗ NO");

    if (hasAdmin) {
      console.log("\n🎉 You have admin access! You can:");
      console.log("  - Grant KYC_VERIFIER_ROLE to yourself or others");
      console.log("  - Verify KYC for any address");
    }

    if (hasVerifier) {
      console.log("\n🎉 You have verifier access! You can:");
      console.log("  - Verify KYC for any address");
      console.log("  - Revoke KYC verification");
    }

    if (!hasAdmin && !hasVerifier) {
      console.log("\n⚠️  You don't have any special roles.");
      console.log("You need DEFAULT_ADMIN_ROLE or KYC_VERIFIER_ROLE to verify KYC.");
    }

    // Check KYC status
    const isVerified = await KYCRegistry.isVerified(signer.address);
    console.log("\nYour KYC Status:", isVerified ? "✓ VERIFIED" : "✗ NOT VERIFIED");

  } catch (error) {
    console.error("\n❌ Error:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
