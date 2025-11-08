// scripts/approveRequest.js
const hre = require("hardhat");

async function main() {
  const requestId = process.env.REQUEST_ID || process.argv[2] || "0";

  const network = hre.network.name;
  const [signer] = await ethers.getSigners();

  console.log("Network:", network);
  console.log("Signer:", signer.address);
  console.log("Approving Request ID:", requestId);

  // Contract addresses by network
  const FRAC_ADDRESSES = {
    sage: "0x020A7AeE2e541f15e12628785E57FeD1CC099Fa9",
    opn: "0xE63c3D97e3cab05Ff717491A757Eb37b77Ee086d"
  };

  const FRAC_ADDRESS = FRAC_ADDRESSES[network];

  if (!FRAC_ADDRESS) {
    console.error("❌ No fractionalization contract address found for network:", network);
    process.exit(1);
  }

  console.log("Fractionalization Contract:", FRAC_ADDRESS);

  // Get contract instance
  const Fractionalization = await ethers.getContractAt("OPNFractionalization", FRAC_ADDRESS, signer);

  try {
    // Check if request exists
    const request = await Fractionalization.requests(requestId);

    if (request.proposer === "0x0000000000000000000000000000000000000000") {
      console.error("❌ Request does not exist!");
      process.exit(1);
    }

    console.log("\n📋 Request Details:");
    console.log("  Asset Name:", request.assetName);
    console.log("  Proposer:", request.proposer);
    console.log("  Total Fractions:", request.totalFractions.toString());

    const statusMap = { 0: "Pending", 1: "Approved", 2: "Rejected" };
    const currentStatus = typeof request.status === 'number' ? request.status : request.status.toNumber ? request.status.toNumber() : parseInt(request.status);
    console.log("  Status:", statusMap[currentStatus], `(${currentStatus})`);

    if (currentStatus !== 0) {
      console.log("\n⚠️  Request is not pending. Current status:", statusMap[currentStatus]);
      return;
    }

    console.log("\n✅ Request is pending and ready for approval!");

    // Check if signer has COMPLIANCE_ROLE
    const COMPLIANCE_ROLE = await Fractionalization.COMPLIANCE_ROLE();
    const hasRole = await Fractionalization.hasRole(COMPLIANCE_ROLE, signer.address);

    console.log("\n🔑 Role Check:");
    console.log("  Has COMPLIANCE_ROLE:", hasRole ? "✅ YES" : "❌ NO");

    if (!hasRole) {
      // Check if admin
      const DEFAULT_ADMIN_ROLE = await Fractionalization.DEFAULT_ADMIN_ROLE();
      const isAdmin = await Fractionalization.hasRole(DEFAULT_ADMIN_ROLE, signer.address);

      console.log("  Has DEFAULT_ADMIN_ROLE:", isAdmin ? "✅ YES" : "❌ NO");

      if (isAdmin) {
        console.log("\n🔧 Granting COMPLIANCE_ROLE to yourself...");
        const grantTx = await Fractionalization.grantRole(COMPLIANCE_ROLE, signer.address);
        await grantTx.wait();
        console.log("✅ COMPLIANCE_ROLE granted!");
      } else {
        console.error("\n❌ You don't have permission to approve requests!");
        console.error("   You need either COMPLIANCE_ROLE or DEFAULT_ADMIN_ROLE");
        return;
      }
    }

    // Approve the request
    console.log("\n✅ Approving request...");
    const tx = await Fractionalization.approveRequest(requestId);
    console.log("Transaction hash:", tx.hash);

    const receipt = await tx.wait();
    console.log("✅ Request approved! Gas used:", receipt.gasUsed.toString());

    // Check for events
    const approvedEvent = receipt.events?.find(e => e.event === "RequestApproved");
    if (approvedEvent) {
      console.log("\n🎉 RequestApproved event emitted:");
      console.log("  Request ID:", approvedEvent.args.requestId.toString());
      console.log("  Asset ID:", approvedEvent.args.assetId.toString());
    }

    // Verify new status
    const updatedRequest = await Fractionalization.requests(requestId);
    console.log("\n📊 Updated Status:", statusMap[updatedRequest.status]);
    console.log("  Token ID:", updatedRequest.tokenId.toString());

  } catch (error) {
    console.error("\n❌ Error:", error.message);

    if (error.message.includes("AccessControl")) {
      console.error("\n   You don't have the required role to approve requests.");
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
