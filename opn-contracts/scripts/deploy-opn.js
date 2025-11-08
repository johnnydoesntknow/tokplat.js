// scripts/deploy-NO-KYC-WITH-WEIGHTS.js
const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 Deploying OPNFractionalization - NO KYC + WEIGHTED BUYS + AUTO-APPROVAL");
  console.log("Network:", hre.network.name);
  
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "OPN");

  if (balance === 0n) {
    console.error("❌ Insufficient balance. Please fund your account.");
    process.exit(1);
  }

  console.log("\n📄 Deploying OPNFractionalization...");
  const OPNFractionalization = await hre.ethers.getContractFactory("OPNFractionalization");
  
  // ✅ ONLY 2 parameters - NO KYC!
  const BASE_URI = "https://api.opn-fractionalization.com/metadata/";
  const feeRecipient = process.env.FEE_RECIPIENT || deployer.address;
  
  console.log("\n📋 Configuration:");
  console.log("  Base URI:", BASE_URI);
  console.log("  Fee Recipient:", feeRecipient);
  console.log("  Auto-Approval: ✅ ALWAYS ENABLED (hardcoded)");
  console.log("  KYC: ❌ DISABLED (removed completely)");
  console.log("  Weighted Buys: ✅ ENABLED");
  console.log("  Min/Max Limits: ✅ ENABLED");
  console.log("  Max Supply: 1,000,000 units (100.0000%)");
  
  const fractionalization = await OPNFractionalization.deploy(
    BASE_URI,
    feeRecipient
  );
  
  await fractionalization.waitForDeployment();
  const fractionalizationAddress = await fractionalization.getAddress();
  console.log("\n✅ OPNFractionalization deployed to:", fractionalizationAddress);

  // Wait for confirmations
  const fracDeployTx = fractionalization.deploymentTransaction();
  if (fracDeployTx) {
    console.log("⏳ Waiting for confirmations...");
    await fracDeployTx.wait(5);
    console.log("✅ Confirmed!");
  }

  // Verify settings
  console.log("\n🔍 Verifying deployment...");
  const isAlphaMode = await fractionalization.isAlphaMode();
  const platformFee = await fractionalization.platformFee();
  const feeRecipientCheck = await fractionalization.feeRecipient();
  const maxSupply = await fractionalization.MAX_SUPPLY();
  
  console.log("  Alpha Mode:", isAlphaMode ? "✅ ENABLED" : "❌ DISABLED");
  console.log("  Platform Fee:", platformFee.toString(), `(${Number(platformFee) / 100}%)`);
  console.log("  Fee Recipient:", feeRecipientCheck);
  console.log("  Max Supply (Weighted):", maxSupply.toString(), "units");
  
  if (!isAlphaMode) {
    console.error("\n⚠️  ERROR: Alpha mode should ALWAYS be true!");
    process.exit(1);
  }

  // Save deployment info
  const deploymentInfo = {
    network: hre.network.name,
    chainId: hre.network.config.chainId,
    contract: {
      OPNFractionalization: fractionalizationAddress
    },
    configuration: {
      baseURI: BASE_URI,
      feeRecipient: feeRecipient,
      platformFee: "250",
      alphaMode: true,
      kycEnabled: false,
      weightedShares: true,
      maxSupply: maxSupply.toString()
    },
    deployer: deployer.address,
    blockNumber: await ethers.provider.getBlockNumber(),
    timestamp: new Date().toISOString()
  };

  const deploymentsDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir);
  }

  const filename = path.join(deploymentsDir, `${hre.network.name}-deployment.json`);
  fs.writeFileSync(filename, JSON.stringify(deploymentInfo, null, 2));

  console.log("\n✅ Deployment completed successfully!");
  console.log("📁 Deployment info saved to:", filename);
  console.log("\n📋 Deployment Summary:");
  console.log(JSON.stringify(deploymentInfo, null, 2));

  console.log("\n🎯 NEXT STEPS:");
  console.log("  1. Update frontend .env:");
  console.log("     VITE_FRACTIONALIZATION_CONTRACT=" + fractionalizationAddress);
  console.log("  2. Restart dev server: yarn dev");
  console.log("  3. Create an asset with weighted shares - it will auto-approve! ✅");
  console.log("\n✨ FEATURES:");
  console.log("  ✅ NO KYC");
  console.log("  ✅ AUTO-APPROVAL");
  console.log("  ✅ WEIGHTED SHARES (1M units = 100%)");
  console.log("  ✅ MIN/MAX PURCHASE LIMITS");
  console.log("  ✅ PERCENTAGE-BASED BUYING");
  console.log("\n🎉 READY FOR 1M+ USERS! 🚀");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });