// scripts/checkRequests.js
const hre = require("hardhat");

async function main() {
  const network = hre.network.name;
  console.log("Network:", network);

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

  // Get contract instance (read-only, no signer needed)
  const Fractionalization = await ethers.getContractAt("OPNFractionalization", FRAC_ADDRESS);

  try {
    console.log("\n📊 Contract Status:");

    // Check if paused
    try {
      const isPaused = await Fractionalization.paused();
      console.log("Paused:", isPaused ? "⚠️  YES" : "✅ NO");
    } catch (e) {
      console.log("Paused: Unable to check");
    }

    // Check alpha mode
    try {
      const isAlpha = await Fractionalization.isAlphaMode();
      console.log("Alpha Mode:", isAlpha ? "✅ ON (auto-approve)" : "❌ OFF");
    } catch (e) {
      console.log("Alpha Mode: Unable to check");
    }

    // Check platform fee
    try {
      const fee = await Fractionalization.platformFee();
      console.log("Platform Fee:", fee.toString(), `(${fee / 100}%)`);
    } catch (e) {
      console.log("Platform Fee: Unable to check");
    }

    // Get request counter - this tells us how many requests have been created
    let requestCount = 0;
    try {
      // Try to check if there's a getter for the counter
      // Since we can't directly access the counter, we'll try to fetch requests starting from 0
      console.log("\n🔍 Searching for requests...");

      let foundRequests = 0;
      const maxToCheck = 100; // Check first 100 request IDs

      for (let i = 0; i < maxToCheck; i++) {
        try {
          const request = await Fractionalization.requests(i);

          // Check if request exists (requestId will be 0 for non-existent requests in some implementations)
          if (request.proposer !== "0x0000000000000000000000000000000000000000") {
            foundRequests++;

            console.log(`\n📋 Request #${i}:`);
            console.log("  Proposer:", request.proposer);
            console.log("  Asset Type:", request.assetType);
            console.log("  Asset Name:", request.assetName);
            console.log("  Description:", request.assetDescription);
            console.log("  Image URL:", request.assetImageUrl);
            console.log("  Total Fractions:", request.totalFractions.toString());

            try {
              const priceWei = request.pricePerFraction;
              const priceEth = ethers.utils.formatEther(priceWei);
              console.log("  Price per Fraction:", priceEth, "ETH");

              const totalValue = priceWei.mul(request.totalFractions);
              const totalEth = ethers.utils.formatEther(totalValue);
              console.log("  Total Value:", totalEth, "ETH");
            } catch (e) {
              console.log("  Price per Fraction: Error formatting price");
            }

            console.log("  Requires KYC:", request.requiresPurchaserKYC);

            // Status mapping
            const statusMap = {
              0: "Pending",
              1: "Approved",
              2: "Rejected",
              3: "Cancelled"
            };
            console.log("  Status:", statusMap[request.status] || "Unknown");

            console.log("  Token ID:", request.tokenId.toString());
            console.log("  Timestamp:", new Date(request.timestamp.toNumber() * 1000).toLocaleString());
          } else if (foundRequests > 0 && i > foundRequests + 10) {
            // If we found some requests but then hit 10 consecutive empty ones, stop searching
            break;
          }
        } catch (error) {
          // If we get an error, we've likely gone past the last request
          if (foundRequests > 0) {
            break;
          }
        }
      }

      if (foundRequests === 0) {
        console.log("\n✅ No fractionalization requests found on this contract.");
        console.log("   This is expected for a newly deployed contract.");
      } else {
        console.log(`\n✅ Found ${foundRequests} total request(s)`);
      }

    } catch (error) {
      console.error("\n❌ Error checking requests:", error.message);
    }

    // Check for events
    console.log("\n📡 Checking recent events...");
    try {
      const currentBlock = await ethers.provider.getBlockNumber();
      const fromBlock = Math.max(0, currentBlock - 10000); // Last 10k blocks

      console.log(`Scanning blocks ${fromBlock} to ${currentBlock}...`);

      const requestCreatedFilter = Fractionalization.filters.RequestCreated();
      const requestCreatedEvents = await Fractionalization.queryFilter(requestCreatedFilter, fromBlock, currentBlock);

      console.log(`\n🎉 RequestCreated events: ${requestCreatedEvents.length}`);

      if (requestCreatedEvents.length > 0) {
        requestCreatedEvents.forEach((event, index) => {
          console.log(`\nEvent ${index + 1}:`);
          console.log("  Request ID:", event.args.requestId.toString());
          console.log("  Proposer:", event.args.proposer);
          console.log("  Asset Name:", event.args.assetName);
          console.log("  Total Fractions:", event.args.totalFractions.toString());

          try {
            if (event.args.pricePerFraction) {
              console.log("  Price per Fraction:", ethers.utils.formatEther(event.args.pricePerFraction), "ETH");
            }
          } catch (e) {
            console.log("  Price per Fraction: Not available in event");
          }

          console.log("  Block:", event.blockNumber);
          console.log("  Transaction:", event.transactionHash);
        });
      }

      const requestApprovedFilter = Fractionalization.filters.RequestApproved();
      const requestApprovedEvents = await Fractionalization.queryFilter(requestApprovedFilter, fromBlock, currentBlock);

      console.log(`\n✅ RequestApproved events: ${requestApprovedEvents.length}`);

      const requestRejectedFilter = Fractionalization.filters.RequestRejected();
      const requestRejectedEvents = await Fractionalization.queryFilter(requestRejectedFilter, fromBlock, currentBlock);

      console.log(`\n❌ RequestRejected events: ${requestRejectedEvents.length}`);

    } catch (error) {
      console.log("Could not fetch events:", error.message);
    }

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
