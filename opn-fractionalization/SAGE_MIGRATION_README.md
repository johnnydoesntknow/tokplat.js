# SAGE Network Migration - Work in Progress

## What Was Done

### 1. Network Configuration
- Migrated from OPN testnet to SAGE network (Chain ID 403)
- Updated RPC endpoint to https://rpc.cor3innovations.io/
- Configured contract addresses:
  - Fractionalization: `0x020A7AeE2e541f15e12628785E57FeD1CC099Fa9`
  - KYC Registry: `0x097774d0Ae34988C108b0609298Abe993B8e4b39`

### 2. Fixed Critical Issues
- **ABI Mismatch**: Updated frontend ABI to match deployed contracts (7 parameters instead of 10)
- Removed unsupported parameters: minPurchaseAmount, maxPurchaseAmount, shareType
- Fixed network mapping in `useContract.js` for Chain ID 403
- Verified deployer wallet KYC on-chain

### 3. Working Features
- Hugging Face image generation (FLUX model)
- Wallet connection to SAGE network
- Asset creation flow (tested successfully)
- On-chain asset creation and approval (Request #0 approved, Token ID: 0)

### 4. Utility Scripts Created
- `checkRequests.js` - View all fractionalization requests
- `approveRequest.js` - Approve pending requests
- `checkKYC.js` - Check KYC verification status
- `verifyKYC.js` - Verify wallet KYC
- `checkRoles.js` - Check wallet permissions

## Known Issues

### Critical
1. **IPFS Upload Not Working** - Images stored as temporary browser blobs instead of IPFS URLs
2. **Marketplace Display Broken** - `getActiveAssets()` function doesn't exist on deployed contract, assets don't appear in marketplace
3. **Buy/Sell Untested** - Cannot test due to marketplace display issue

### Minor
- Hugging Face free tier credits exceeded (need PRO subscription or new API key for continued testing)
- Additional view function mismatches between frontend and contract

## Files Modified
- `src/config/appkit.js` - SAGE network config
- `src/utils/contracts.js` - Contract ABIs and addresses
- `src/hooks/useContract.js` - Network mapping
- `src/hooks/useCreateAsset.js` - Removed extra parameters
- `opn-contracts/hardhat.config.js` - SAGE network setup
- `.env` - Hugging Face API key

## Next Steps
1. Fix IPFS upload integration
2. Update frontend view functions to match deployed contract OR redeploy contracts with missing functions
3. Test buy/sell functionality once marketplace displays assets
4. Test profanity filter system

## Test Asset Created
- Request #0 on SAGE network
- Status: Approved
- Token ID: 0
- Transaction: `0xbe69eec871f1900ac4f5386f3672f575675d75cfe161bf2413cfa53b12919c68`
- Approval TX: `0x928bb39be225c2bbfb9d958e299675307c9d696ba037c1b7f16c301a23914ddf`

---