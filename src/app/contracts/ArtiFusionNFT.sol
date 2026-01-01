// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract ArtiFusionNFT is ERC721URIStorage, Ownable, ReentrancyGuard {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;
    Counters.Counter private _itemsSold;
    
    uint256 public listingPrice = 0.025 ether;
    uint256 public totalFeesCollected = 0;
    
    struct MarketItem {
        uint256 tokenId;
        address payable seller;
        address payable owner;
        uint256 price;
        bool sold;
        string category;
        uint256 likes;
    }
    
    mapping(uint256 => MarketItem) private idToMarketItem;
    mapping(uint256 => mapping(address => bool)) public tokenLikes;
    
    event NFTMinted(
        uint256 indexed tokenId,
        address owner,
        string tokenURI,
        string category
    );
    
    event MarketItemListed(
        uint256 indexed tokenId,
        address seller,
        uint256 price,
        string category
    );
    
    event MarketItemSold(
        uint256 indexed tokenId,
        address seller,
        address buyer,
        uint256 price
    );
    
    event NFTLiked(uint256 indexed tokenId, address liker);
    event NFTUnliked(uint256 indexed tokenId, address unliker);
    
    event FeesWithdrawn(address indexed owner, uint256 amount);
    event ListingPriceUpdated(uint256 oldPrice, uint256 newPrice);
    
    // ✅ FIXED: Pass msg.sender as initialOwner to Ownable
    constructor() ERC721("ArtiFusion NFT", "AFNFT") Ownable(msg.sender) {}
    
    /**
     * @dev Check if a token exists (replacement for deprecated _exists)
     */
    function _tokenExists(uint256 tokenId) internal view returns (bool) {
        return _ownerOf(tokenId) != address(0);
    }
    
    /**
     * @dev Update the listing price (only owner)
     */
    function updateListingPrice(uint256 _listingPrice) public onlyOwner {
        uint256 oldPrice = listingPrice;
        listingPrice = _listingPrice;
        emit ListingPriceUpdated(oldPrice, _listingPrice);
    }
    
    /**
     * @dev Get current listing price
     */
    function getListingPrice() public view returns (uint256) {
        return listingPrice;
    }
    
    /**
     * @dev Get contract balance (fees collected)
     */
    function getContractBalance() public view returns (uint256) {
        return address(this).balance;
    }
    
    /**
     * @dev Get total fees collected
     */
    function getTotalFeesCollected() public view returns (uint256) {
        return totalFeesCollected;
    }
    
    /**
     * @dev Withdraw accumulated fees (only owner)
     */
    function withdrawFees() public onlyOwner nonReentrant {
        uint256 balance = address(this).balance;
        require(balance > 0, "No fees to withdraw");
        
        (bool success, ) = payable(owner()).call{value: balance}("");
        require(success, "Withdrawal failed");
        
        emit FeesWithdrawn(owner(), balance);
    }
    
    /**
     * @dev Withdraw specific amount (only owner)
     */
    function withdrawAmount(uint256 amount) public onlyOwner nonReentrant {
        require(amount > 0, "Amount must be greater than 0");
        require(address(this).balance >= amount, "Insufficient balance");
        
        (bool success, ) = payable(owner()).call{value: amount}("");
        require(success, "Withdrawal failed");
        
        emit FeesWithdrawn(owner(), amount);
    }
    
    /**
     * @dev Emergency withdraw (only owner) - in case of issues
     */
    function emergencyWithdraw() public onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No balance to withdraw");
        
        (bool success, ) = payable(owner()).call{value: balance}("");
        require(success, "Emergency withdrawal failed");
        
        emit FeesWithdrawn(owner(), balance);
    }
    
    /**
     * @dev Mint a new NFT - goes directly to creator's wallet
     * No listing fee required, NFT stays with creator
     */
    function mintNFT(
        string memory tokenURI,
        string memory category
    ) public returns (uint256) {
        _tokenIds.increment();
        uint256 newTokenId = _tokenIds.current();
        
        _mint(msg.sender, newTokenId);
        _setTokenURI(newTokenId, tokenURI);
        
        // Create a market item entry but mark as not listed
        idToMarketItem[newTokenId] = MarketItem(
            newTokenId,
            payable(msg.sender),
            payable(msg.sender),
            0,
            true,
            category,
            0
        );
        
        emit NFTMinted(newTokenId, msg.sender, tokenURI, category);
        
        return newTokenId;
    }
    
    /**
     * @dev List an NFT you own on the marketplace
     * Requires listing fee payment - fees stay in contract
     */
    function listNFTForSale(
        uint256 tokenId,
        uint256 price
    ) public payable nonReentrant {
        require(_tokenExists(tokenId), "Token does not exist");
        require(ownerOf(tokenId) == msg.sender, "You don't own this NFT");
        require(price > 0, "Price must be at least 1 wei");
        require(msg.value == listingPrice, "Must pay listing price");
        
        // Update market item
        idToMarketItem[tokenId].seller = payable(msg.sender);
        idToMarketItem[tokenId].owner = payable(address(this));
        idToMarketItem[tokenId].price = price;
        idToMarketItem[tokenId].sold = false;
        
        // Track fees (listing fee stays in contract)
        totalFeesCollected += msg.value;
        
        // Transfer NFT to contract
        _transfer(msg.sender, address(this), tokenId);
        
        emit MarketItemListed(
            tokenId,
            msg.sender,
            price,
            idToMarketItem[tokenId].category
        );
    }
    
    /**
     * @dev Buy an NFT from the marketplace
     */
    function buyNFT(uint256 tokenId) public payable nonReentrant {
        uint256 price = idToMarketItem[tokenId].price;
        address seller = idToMarketItem[tokenId].seller;
        
        require(msg.value == price, "Please submit the asking price");
        require(!idToMarketItem[tokenId].sold, "Item already sold");
        require(ownerOf(tokenId) == address(this), "Item not listed for sale");
        
        // Update market item
        idToMarketItem[tokenId].owner = payable(msg.sender);
        idToMarketItem[tokenId].sold = true;
        _itemsSold.increment();
        
        // Transfer NFT to buyer
        _transfer(address(this), msg.sender, tokenId);
        
        // Pay seller (full price goes to seller)
        (bool success, ) = payable(seller).call{value: msg.value}("");
        require(success, "Payment to seller failed");
        
        emit MarketItemSold(tokenId, seller, msg.sender, price);
    }
    
    /**
     * @dev Cancel listing and take NFT back to your wallet
     */
    function cancelListing(uint256 tokenId) public nonReentrant {
        require(idToMarketItem[tokenId].seller == msg.sender, "Not your listing");
        require(!idToMarketItem[tokenId].sold, "Item already sold");
        require(ownerOf(tokenId) == address(this), "Item not listed");
        
        // Update market item
        idToMarketItem[tokenId].owner = payable(msg.sender);
        idToMarketItem[tokenId].sold = true;
        idToMarketItem[tokenId].price = 0;
        
        // Transfer NFT back to seller
        _transfer(address(this), msg.sender, tokenId);
    }
    
    /**
     * @dev Fetch all NFTs listed for sale in marketplace
     */
    function fetchMarketItems() public view returns (MarketItem[] memory) {
        uint256 itemCount = _tokenIds.current();
        uint256 unsoldItemCount = 0;
        
        // Count unsold items
        for (uint256 i = 1; i <= itemCount; i++) {
            if (_tokenExists(i) && ownerOf(i) == address(this) && !idToMarketItem[i].sold) {
                unsoldItemCount += 1;
            }
        }
        
        MarketItem[] memory items = new MarketItem[](unsoldItemCount);
        uint256 currentIndex = 0;
        
        // Populate array with unsold items
        for (uint256 i = 1; i <= itemCount; i++) {
            if (_tokenExists(i) && ownerOf(i) == address(this) && !idToMarketItem[i].sold) {
                MarketItem storage currentItem = idToMarketItem[i];
                items[currentIndex] = currentItem;
                currentIndex += 1;
            }
        }
        
        return items;
    }
    
    /**
     * @dev Fetch NFTs owned by caller (in their wallet, not listed)
     */
    function fetchMyNFTs() public view returns (MarketItem[] memory) {
        uint256 totalItemCount = _tokenIds.current();
        uint256 itemCount = 0;
        
        // Count owned items
        for (uint256 i = 1; i <= totalItemCount; i++) {
            if (_tokenExists(i) && ownerOf(i) == msg.sender) {
                itemCount += 1;
            }
        }
        
        MarketItem[] memory items = new MarketItem[](itemCount);
        uint256 currentIndex = 0;
        
        // Populate array with owned items
        for (uint256 i = 1; i <= totalItemCount; i++) {
            if (_tokenExists(i) && ownerOf(i) == msg.sender) {
                MarketItem storage currentItem = idToMarketItem[i];
                items[currentIndex] = currentItem;
                currentIndex += 1;
            }
        }
        
        return items;
    }
    
    /**
     * @dev Fetch NFTs listed by caller (currently in marketplace)
     */
    function fetchItemsListed() public view returns (MarketItem[] memory) {
        uint256 totalItemCount = _tokenIds.current();
        uint256 itemCount = 0;
        
        // Count listed items
        for (uint256 i = 1; i <= totalItemCount; i++) {
            if (_tokenExists(i) && 
                idToMarketItem[i].seller == msg.sender && 
                ownerOf(i) == address(this) && 
                !idToMarketItem[i].sold) {
                itemCount += 1;
            }
        }
        
        MarketItem[] memory items = new MarketItem[](itemCount);
        uint256 currentIndex = 0;
        
        // Populate array with listed items
        for (uint256 i = 1; i <= totalItemCount; i++) {
            if (_tokenExists(i) && 
                idToMarketItem[i].seller == msg.sender && 
                ownerOf(i) == address(this) && 
                !idToMarketItem[i].sold) {
                MarketItem storage currentItem = idToMarketItem[i];
                items[currentIndex] = currentItem;
                currentIndex += 1;
            }
        }
        
        return items;
    }
    
    /**
     * @dev Like an NFT
     */
    function likeNFT(uint256 tokenId) public {
        require(_tokenExists(tokenId), "Token does not exist");
        require(!tokenLikes[tokenId][msg.sender], "Already liked");
        
        tokenLikes[tokenId][msg.sender] = true;
        idToMarketItem[tokenId].likes += 1;
        
        emit NFTLiked(tokenId, msg.sender);
    }
    
    /**
     * @dev Unlike an NFT
     */
    function unlikeNFT(uint256 tokenId) public {
        require(_tokenExists(tokenId), "Token does not exist");
        require(tokenLikes[tokenId][msg.sender], "Not liked yet");
        
        tokenLikes[tokenId][msg.sender] = false;
        idToMarketItem[tokenId].likes -= 1;
        
        emit NFTUnliked(tokenId, msg.sender);
    }
    
    /**
     * @dev Get market item details
     */
    function getMarketItem(uint256 tokenId) public view returns (MarketItem memory) {
        return idToMarketItem[tokenId];
    }
    
    /**
     * @dev Get total number of tokens minted
     */
    function getTotalTokens() public view returns (uint256) {
        return _tokenIds.current();
    }
    
    /**
     * @dev Fallback function to receive ETH
     */
    receive() external payable {
        totalFeesCollected += msg.value;
    }
}