# SAGE Network Integration Fixes

## Summary
Fixed critical integration issues between the frontend and deployed contracts on SAGE network (Chain ID 403).

## Issues Found & Fixed

### 1. Contract ABI Mismatch ✅
**Problem:** Frontend ABI expected 10 parameters for `createFractionalizationRequest`, but deployed contract only accepts 7.

**Solution:** Updated `src/utils/contracts.js` to match deployed contract:
- Removed `minPurchaseAmount`, `maxPurchaseAmount`, `shareType` parameters
- Updated `requests` struct return values
- Updated `assetDetails` struct return values

### 2. Function Call Mismatch ✅
**Problem:** `useCreateAsset.js` was passing 10 parameters to contract function.

**Solution:** Updated `src/hooks/useCreateAsset.js`:
- Removed unused `ShareType` enum
- Updated contract call to pass only 7 parameters:
  - assetType
  - assetName
  - assetDescription
  - assetImageUrl
  - totalShares
  - pricePerShare (in wei)
  - requiresPurchaserKYC

### 3. Network Chain ID Mapping ✅
**Problem:** SAGE network (Chain ID 403) was not mapped correctly.

**Solution:** Updated `src/hooks/useContract.js`:
- Added case 403 → 'sage'
- Added case 984 → 'opn' (legacy network)
- Changed default fallback to 'sage'
- Changed contract fallback to `CONTRACTS.sage`

### 4. KYC Verification ✅
**Problem:** Deployer wallet was not KYC verified.

**Solution:**
- Created verification scripts:
  - `checkKYC.js` - Check KYC status
  - `checkRoles.js` - Check wallet roles
  - `verifyKYC.js` - Verify KYC (updated for SAGE)
  - `completeMockKYC.js` - Self-verify on testnet
- Successfully verified deployer wallet: `0xde2F6E7b644De5A6Ce80f6Da66714517F3C751c6`

## Deployed Contract Addresses (SAGE Network)

**Network:** SAGE
**Chain ID:** 403
**RPC URL:** https://rpc.cor3innovations.io/

**Contracts:**
- KYCRegistry: `0x097774d0Ae34988C108b0609298Abe993B8e4b39`
- OPNFractionalization: `0x020A7AeE2e541f15e12628785E57FeD1CC099Fa9`

**Configuration:**
- Platform Fee: 2.5% (250 basis points)
- Fee Recipient: `0xde2f6e7b644de5a6ce80f6da66714517f3c751c6`
- Deployer: `0xde2F6E7b644De5A6Ce80f6Da66714517F3C751c6`
- Block Number: 2080020
- Timestamp: 2025-11-06T09:26:42.567Z

## Environment Variables Needed

Create a `.env` file in the project root:

```env
# Hugging Face API (for image generation)
VITE_HUGGINGFACE_API_KEY=your_hf_api_key_here

# Optional: Override contract addresses
VITE_FRACTIONALIZATION_CONTRACT=0x020A7AeE2e541f15e12628785E57FeD1CC099Fa9
VITE_KYC_REGISTRY_CONTRACT=0x097774d0Ae34988C108b0609298Abe993B8e4b39

# Optional: Override HF model
VITE_HF_MODEL=black-forest-labs/FLUX.1-schnell
```

## Testing the Integration

### 1. Install Dependencies
```bash
yarn install
```

### 2. Start Development Server
```bash
yarn dev
```

### 3. Connect Wallet
- Network: SAGE (Chain ID 403)
- RPC: https://rpc.cor3innovations.io/
- Use wallet: `0xde2F6E7b644De5A6Ce80f6Da66714517F3C751c6` (already KYC verified)

### 4. Test Asset Creation
1. Go to marketplace and connect wallet
2. Click "Create Asset"
3. Generate images using Hugging Face integration
4. Fill in:
   - Asset name
   - Description
   - Total shares
   - Price per share
5. Complete creation

### 5. Verify KYC for Other Wallets
```bash
cd opn-contracts
CHECK_ADDRESS=0xYourAddress npx hardhat run scripts/checkKYC.js --network sage
VERIFY_ADDRESS=0xYourAddress npx hardhat run scripts/verifyKYC.js --network sage
```

## Notes

### UI Fields Not Used
The UI still has fields for `minPurchaseAmount`, `maxPurchaseAmount`, and `shareType`, but these are not passed to the contract. They can be safely ignored or removed from the UI in a future update.

### Contract Features Available
- ✅ Create fractionalization requests (with KYC)
- ✅ Auto-approval in alpha mode (currently forced to true in frontend)
- ✅ Purchase shares
- ✅ Transfer shares
- ✅ Platform fee (2.5%)
- ✅ KYC verification

### Contract Features NOT Available (in current deployment)
- ❌ Min/max purchase amount limits
- ❌ Weighted vs equal share types
- ❌ Share locking (function exists but may not be fully implemented)

## Troubleshooting

### "Proposer must be KYC verified"
Run the KYC verification script:
```bash
cd opn-contracts
npx hardhat run scripts/verifyKYC.js --network sage
```

### "Wrong network" or "Cannot read properties"
Ensure your wallet is connected to SAGE network (Chain ID 403) with RPC https://rpc.cor3innovations.io/

### "VITE_HUGGINGFACE_API_KEY is undefined"
Create a `.env` file in project root with your Hugging Face API key.

## Next Steps

1. **Get Hugging Face API Key** - Sign up at https://huggingface.co/ and create an API token
2. **Test Image Generation** - Verify Hugging Face integration works
3. **Test Full User Flow** - Create asset → Generate images → Tokenize → Buy/Sell
4. **Deploy IPFS Integration** - Verify images upload to IPFS correctly
5. **Consider Contract Upgrade** - If min/max purchase and share types are needed, contract needs to be updated and redeployed

## Files Modified

- ✅ `src/utils/contracts.js` - Updated ABI to match deployed contract
- ✅ `src/hooks/useCreateAsset.js` - Removed extra parameters from function call
- ✅ `src/hooks/useContract.js` - Fixed network chain ID mapping
- ✅ `opn-contracts/scripts/verifyKYC.js` - Updated for SAGE network
- ✅ `opn-contracts/scripts/checkKYC.js` - New script to check KYC status
- ✅ `opn-contracts/scripts/checkRoles.js` - New script to check wallet roles
- ✅ `opn-contracts/scripts/completeMockKYC.js` - New script for testnet KYC

## Status: ✅ READY FOR TESTING

All critical integration issues have been resolved. The app should now connect to SAGE network and interact with deployed contracts correctly.
