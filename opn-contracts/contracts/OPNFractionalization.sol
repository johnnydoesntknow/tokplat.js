// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";

/**
 * @title OPNFractionalization - NO KYC + Weighted Buys + Auto-Approval
 * @dev Fractionalization platform with:
 *      - NO KYC requirements (removed completely)
 *      - Weighted vs Equal share types
 *      - Min/Max purchase limits per user
 *      - Auto-approval (alpha mode always ON)
 *      - 1,000,000 unit weight system for percentage-based ownership
 */
contract OPNFractionalization is ERC1155, ERC1155Holder, AccessControl, ReentrancyGuard, Pausable {    
    // ============ CONSTANTS & ROLES ============
    
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant EMERGENCY_ROLE = keccak256("EMERGENCY_ROLE");
    
    // Share types
    enum ShareType {
        Weighted,  // Percentage-based (1,000,000 units = 100%)
        Equal      // Fixed number of shares
    }
    
    // Request status
    enum RequestStatus {
        Pending,
        Approved,
        Rejected,
        Cancelled
    }
    
    // ============ STATE VARIABLES ============
    
    uint256 public constant MAX_SUPPLY = 1_000_000; // For weighted shares (100.0000%)
    uint256 public platformFee = 250; // 2.5% (basis points)
    address public feeRecipient;
    bool public constant isAlphaMode = true; // ALWAYS ON!
    
    uint256 private _requestIdCounter;
    uint256 private _tokenIdCounter;
    
    // ============ STRUCTS ============
    
    struct FractionalizationRequest {
        uint256 requestId;
        address proposer;
        string assetType;
        string assetName;
        string assetDescription;
        string assetImageUrl;
        uint256 totalFractions;
        uint256 pricePerFraction;
        uint256 minPurchaseAmount;    // ✅ RESTORED
        uint256 maxPurchaseAmount;    // ✅ RESTORED
        ShareType shareType;           // ✅ RESTORED (Weighted vs Equal)
        RequestStatus status;
        uint256 tokenId;
        uint256 timestamp;
    }
    
    struct AssetDetails {
        uint256 tokenId;
        uint256 requestId;
        address creator;
        uint256 totalSupply;
        uint256 availableSupply;
        uint256 pricePerFraction;
        uint256 minPurchaseAmount;    // ✅ RESTORED
        uint256 maxPurchaseAmount;    // ✅ RESTORED
        ShareType shareType;           // ✅ RESTORED
        bool isActive;
        uint256 totalRevenue;
    }
    
    struct ShareLock {
        uint256 amount;
        uint256 unlockTime;
    }
    
    // ============ MAPPINGS ============
    
    mapping(uint256 => FractionalizationRequest) public requests;
    mapping(uint256 => AssetDetails) public assetDetails;
    mapping(address => uint256[]) public userRequests;
    mapping(address => mapping(uint256 => uint256)) public userShares;
    mapping(address => mapping(uint256 => ShareLock)) public shareLocks;
    
    uint256[] private _activeAssets;
    uint256[] private _pendingRequests;
    
    // ============ EVENTS ============
    
    event RequestCreated(uint256 indexed requestId, address indexed proposer, string assetName, uint256 totalFractions, uint256 pricePerFraction);
    event RequestAutoApproved(uint256 indexed requestId, uint256 indexed assetId, address indexed proposer);
    event RequestApproved(uint256 indexed requestId, uint256 indexed tokenId, address indexed approver);
    event RequestRejected(uint256 indexed requestId, address indexed rejecter, string reason);
    event RequestCancelled(uint256 indexed requestId, address indexed canceller);
    event FractionsPurchased(uint256 indexed tokenId, address indexed buyer, uint256 amount, uint256 totalCost);
    event SharesTransferred(address indexed from, address indexed to, uint256 indexed assetId, uint256 amount);
    event SharesLocked(address indexed user, uint256 indexed assetId, uint256 amount, uint256 unlockTime);
    event SharesUnlocked(address indexed user, uint256 indexed assetId, uint256 amount);
    event PlatformFeeUpdated(uint256 oldFee, uint256 newFee);
    event FeeRecipientUpdated(address indexed oldRecipient, address indexed newRecipient);
    
    // ============ CONSTRUCTOR ============
    
    constructor(
        string memory _uri,
        address _feeRecipient
    ) ERC1155(_uri) {
        require(_feeRecipient != address(0), "Invalid fee recipient");
        
        feeRecipient = _feeRecipient;
        
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(EMERGENCY_ROLE, msg.sender);
    }
    
    // ============ CREATE ASSET (WITH AUTO-APPROVAL) ============
    
    function createFractionalizationRequest(
        string memory _assetType,
        string memory _assetName,
        string memory _assetDescription,
        string memory _assetImageUrl,
        uint256 _totalFractions,
        uint256 _pricePerFraction,
        uint256 _minPurchaseAmount,    // ✅ RESTORED
        uint256 _maxPurchaseAmount,    // ✅ RESTORED
        ShareType _shareType            // ✅ RESTORED
    ) external whenNotPaused returns (uint256) {
        require(_totalFractions > 0, "Total fractions must be > 0");
        require(_pricePerFraction > 0, "Price must be > 0");
        require(bytes(_assetName).length > 0, "Asset name required");
        
        // Validation for weighted shares
        if (_shareType == ShareType.Weighted) {
            require(_totalFractions <= MAX_SUPPLY, "Weighted shares max 1M units");
        }
        
        // Min/max validation
        if (_maxPurchaseAmount > 0) {
            require(_maxPurchaseAmount <= _totalFractions, "Max purchase exceeds total");
            require(_minPurchaseAmount <= _maxPurchaseAmount, "Min > Max");
        }
        
        uint256 requestId = _requestIdCounter;
        _requestIdCounter++;
        
        requests[requestId] = FractionalizationRequest({
            requestId: requestId,
            proposer: msg.sender,
            assetType: _assetType,
            assetName: _assetName,
            assetDescription: _assetDescription,
            assetImageUrl: _assetImageUrl,
            totalFractions: _totalFractions,
            pricePerFraction: _pricePerFraction,
            minPurchaseAmount: _minPurchaseAmount,
            maxPurchaseAmount: _maxPurchaseAmount,
            shareType: _shareType,
            status: RequestStatus.Pending,
            tokenId: 0,
            timestamp: block.timestamp
        });
        
        userRequests[msg.sender].push(requestId);
        _pendingRequests.push(requestId);
        
        emit RequestCreated(requestId, msg.sender, _assetName, _totalFractions, _pricePerFraction);
        
        // ✅ AUTO-APPROVE IMMEDIATELY (Alpha mode always ON!)
        _autoApprove(requestId);
        
        return requestId;
    }
    
    // ============ AUTO-APPROVAL (INTERNAL) ============
    
    function _autoApprove(uint256 _requestId) internal {
        FractionalizationRequest storage request = requests[_requestId];
        require(request.status == RequestStatus.Pending, "Not pending");
        
        uint256 tokenId = _tokenIdCounter;
        _tokenIdCounter++;
        
        request.status = RequestStatus.Approved;
        request.tokenId = tokenId;
        
        // Create asset details
        assetDetails[tokenId] = AssetDetails({
            tokenId: tokenId,
            requestId: _requestId,
            creator: request.proposer,
            totalSupply: request.totalFractions,
            availableSupply: request.totalFractions,
            pricePerFraction: request.pricePerFraction,
            minPurchaseAmount: request.minPurchaseAmount,
            maxPurchaseAmount: request.maxPurchaseAmount,
            shareType: request.shareType,
            isActive: true,
            totalRevenue: 0
        });
        
        // Mint all fractions to contract
        _mint(address(this), tokenId, request.totalFractions, "");
        
        // Add to active assets
        _activeAssets.push(tokenId);
        
        // Remove from pending
        _removePendingRequest(_requestId);
        
        emit RequestAutoApproved(_requestId, tokenId, request.proposer);
    }
    
    // ============ PURCHASE FRACTIONS ============
    
    function purchaseShares(
        uint256 _assetId,
        uint256 _shareAmount,
        uint256 _maxPricePerShare
    ) external payable nonReentrant whenNotPaused {
        AssetDetails storage asset = assetDetails[_assetId];
        require(asset.isActive, "Asset not active");
        require(_shareAmount > 0, "Amount must be > 0");
        require(_shareAmount <= asset.availableSupply, "Insufficient supply");
        require(asset.pricePerFraction <= _maxPricePerShare, "Price too high");
        
        // ✅ CHECK MIN PURCHASE
        if (asset.minPurchaseAmount > 0) {
            require(_shareAmount >= asset.minPurchaseAmount, "Below minimum purchase");
        }
        
        // ✅ CHECK MAX PURCHASE PER USER
        if (asset.maxPurchaseAmount > 0) {
            uint256 currentHoldings = userShares[msg.sender][_assetId];
            require(
                currentHoldings + _shareAmount <= asset.maxPurchaseAmount,
                "Exceeds maximum per user"
            );
        }
        
        uint256 totalCost = asset.pricePerFraction * _shareAmount;
        uint256 feeAmount = (totalCost * platformFee) / 10000;
        uint256 creatorAmount = totalCost - feeAmount;
        
        require(msg.value >= totalCost, "Insufficient payment");
        
        // Transfer funds
        payable(feeRecipient).transfer(feeAmount);
        payable(asset.creator).transfer(creatorAmount);
        
        // Transfer shares from contract to buyer
        _safeTransferFrom(address(this), msg.sender, _assetId, _shareAmount, "");
        
        // Update state
        asset.availableSupply -= _shareAmount;
        asset.totalRevenue += totalCost;
        userShares[msg.sender][_assetId] += _shareAmount;
        
        // Refund excess
        if (msg.value > totalCost) {
            payable(msg.sender).transfer(msg.value - totalCost);
        }
        
        emit FractionsPurchased(_assetId, msg.sender, _shareAmount, totalCost);
    }
    
    // ============ TRANSFER SHARES ============
    
    function transferShares(
        address _to,
        uint256 _assetId,
        uint256 _amount
    ) external nonReentrant whenNotPaused {
        require(_to != address(0), "Invalid recipient");
        require(userShares[msg.sender][_assetId] >= _amount, "Insufficient balance");
        
        // Check if shares are locked
        ShareLock storage lock = shareLocks[msg.sender][_assetId];
        if (lock.unlockTime > 0) {
            require(block.timestamp >= lock.unlockTime, "Shares locked");
            uint256 unlockedAmount = userShares[msg.sender][_assetId] - lock.amount;
            require(_amount <= unlockedAmount, "Amount exceeds unlocked");
        }
        
        _safeTransferFrom(msg.sender, _to, _assetId, _amount, "");
        
        userShares[msg.sender][_assetId] -= _amount;
        userShares[_to][_assetId] += _amount;
        
        emit SharesTransferred(msg.sender, _to, _assetId, _amount);
    }
    
    // ============ LOCK SHARES ============
    
    function lockShares(
        uint256 _assetId,
        uint256 _amount,
        uint256 _lockDuration
    ) external whenNotPaused {
        require(userShares[msg.sender][_assetId] >= _amount, "Insufficient balance");
        require(_lockDuration > 0, "Duration must be > 0");
        
        uint256 unlockTime = block.timestamp + _lockDuration;
        shareLocks[msg.sender][_assetId] = ShareLock({
            amount: _amount,
            unlockTime: unlockTime
        });
        
        emit SharesLocked(msg.sender, _assetId, _amount, unlockTime);
    }
    
    function unlockShares(uint256 _assetId) external {
        ShareLock storage lock = shareLocks[msg.sender][_assetId];
        require(lock.unlockTime > 0, "No lock found");
        require(block.timestamp >= lock.unlockTime, "Still locked");
        
        uint256 amount = lock.amount;
        delete shareLocks[msg.sender][_assetId];
        
        emit SharesUnlocked(msg.sender, _assetId, amount);
    }
    
    // ============ VIEW FUNCTIONS ============
    
    function getActiveAssets() external view returns (uint256[] memory) {
        return _activeAssets;
    }
    
    function getPendingRequests() external view returns (uint256[] memory) {
        return _pendingRequests;
    }
    
    function getUserRequests(address _user) external view returns (uint256[] memory) {
        return userRequests[_user];
    }
    
    function getUserShares(address _user, uint256 _assetId) external view returns (uint256) {
        return userShares[_user][_assetId];
    }
    
    function getUserOwnershipPercentage(address _user, uint256 _assetId) 
        external 
        view 
        returns (uint256 percentage, uint256 shares) 
    {
        AssetDetails storage asset = assetDetails[_assetId];
        shares = userShares[_user][_assetId];
        
        if (asset.shareType == ShareType.Weighted) {
            // For weighted: shares are already in basis points (1M = 100%)
            percentage = (shares * 10000) / MAX_SUPPLY; // In basis points
        } else {
            // For equal: calculate percentage from total supply
            percentage = asset.totalSupply > 0 
                ? (shares * 10000) / asset.totalSupply 
                : 0;
        }
    }
    
    // ============ ADMIN FUNCTIONS ============
    
    function updatePlatformFee(uint256 _newFee) external onlyRole(ADMIN_ROLE) {
        require(_newFee <= 1000, "Fee too high"); // Max 10%
        uint256 oldFee = platformFee;
        platformFee = _newFee;
        emit PlatformFeeUpdated(oldFee, _newFee);
    }
    
    function updateFeeRecipient(address _newRecipient) external onlyRole(ADMIN_ROLE) {
        require(_newRecipient != address(0), "Invalid recipient");
        address oldRecipient = feeRecipient;
        feeRecipient = _newRecipient;
        emit FeeRecipientUpdated(oldRecipient, _newRecipient);
    }
    
    function pause() external onlyRole(EMERGENCY_ROLE) {
        _pause();
    }
    
    function unpause() external onlyRole(EMERGENCY_ROLE) {
        _unpause();
    }
    
    // ============ INTERNAL HELPERS ============
    
    function _removePendingRequest(uint256 _requestId) internal {
        for (uint256 i = 0; i < _pendingRequests.length; i++) {
            if (_pendingRequests[i] == _requestId) {
                _pendingRequests[i] = _pendingRequests[_pendingRequests.length - 1];
                _pendingRequests.pop();
                break;
            }
        }
    }
    
    // ============ REQUIRED OVERRIDES ============
    
    function supportsInterface(bytes4 interfaceId)
    public
    view
    override(ERC1155, ERC1155Receiver, AccessControl)
    returns (bool)
{
    return super.supportsInterface(interfaceId);
}
}
