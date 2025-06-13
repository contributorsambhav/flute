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
    event MarketItemCreated(
        uint indexed tokenId,
        address seller,
        address owner,
        uint256 price,
        bool sold,
        string category
    );
    event MarketItemSold(
        uint indexed tokenId,
        address seller,
        address buyer,
        uint256 price
    );
    event NFTLiked(uint256 indexed tokenId, address liker);
    event NFTUnliked(uint256 indexed tokenId, address unliker);
    constructor() ERC721("ArtiFusion NFT", "AFNFT") {}
    function updateListingPrice(uint _listingPrice) public payable onlyOwner {
        listingPrice = _listingPrice;
    }
    function getListingPrice() public view returns (uint256) {
        return listingPrice;
    }
    function createToken(
        string memory tokenURI,
        uint256 price,
        string memory category
    ) public payable nonReentrant returns (uint) {
        require(price > 0, "Price must be at least 1 wei");
        require(msg.value == listingPrice, "Must pay listing price");
        _tokenIds.increment();
        uint256 newTokenId = _tokenIds.current();
        _mint(msg.sender, newTokenId);
        _setTokenURI(newTokenId, tokenURI);
        createMarketItem(newTokenId, price, category);
        return newTokenId;
    }
    function createMarketItem(
        uint256 tokenId,
        uint256 price,
        string memory category
    ) private {
        idToMarketItem[tokenId] = MarketItem(
            tokenId,
            payable(msg.sender),
            payable(address(this)),
            price,
            false,
            category,
            0
        );
        _transfer(msg.sender, address(this), tokenId);
        emit MarketItemCreated(
            tokenId,
            msg.sender,
            address(this),
            price,
            false,
            category
        );
    }
    function createMarketSale(uint256 tokenId) public payable nonReentrant {
        uint price = idToMarketItem[tokenId].price;
        address seller = idToMarketItem[tokenId].seller;
        require(msg.value == price, "Please submit the asking price");
        require(!idToMarketItem[tokenId].sold, "Item already sold");
        idToMarketItem[tokenId].owner = payable(msg.sender);
        idToMarketItem[tokenId].sold = true;
        _itemsSold.increment();
        _transfer(address(this), msg.sender, tokenId);
        payable(owner()).transfer(listingPrice);
        payable(seller).transfer(msg.value);
        emit MarketItemSold(tokenId, seller, msg.sender, price);
    }
    function fetchMarketItems() public view returns (MarketItem[] memory) {
        uint itemCount = _tokenIds.current();
        uint unsoldItemCount = _tokenIds.current() - _itemsSold.current();
        uint currentIndex = 0;
        MarketItem[] memory items = new MarketItem[](unsoldItemCount);
        for (uint i = 0; i < itemCount; i++) {
            if (idToMarketItem[i + 1].owner == address(this)) {
                uint currentId = i + 1;
                MarketItem storage currentItem = idToMarketItem[currentId];
                items[currentIndex] = currentItem;
                currentIndex += 1;
            }
        }
        return items;
    }
    function fetchMyNFTs() public view returns (MarketItem[] memory) {
        uint totalItemCount = _tokenIds.current();
        uint itemCount = 0;
        uint currentIndex = 0;
        for (uint i = 0; i < totalItemCount; i++) {
            if (idToMarketItem[i + 1].owner == msg.sender) {
                itemCount += 1;
            }
        }
        MarketItem[] memory items = new MarketItem[](itemCount);
        for (uint i = 0; i < totalItemCount; i++) {
            if (idToMarketItem[i + 1].owner == msg.sender) {
                uint currentId = i + 1;
                MarketItem storage currentItem = idToMarketItem[currentId];
                items[currentIndex] = currentItem;
                currentIndex += 1;
            }
        }
        return items;
    }
    function fetchItemsListed() public view returns (MarketItem[] memory) {
        uint totalItemCount = _tokenIds.current();
        uint itemCount = 0;
        uint currentIndex = 0;
        for (uint i = 0; i < totalItemCount; i++) {
            if (idToMarketItem[i + 1].seller == msg.sender) {
                itemCount += 1;
            }
        }
        MarketItem[] memory items = new MarketItem[](itemCount);
        for (uint i = 0; i < totalItemCount; i++) {
            if (idToMarketItem[i + 1].seller == msg.sender) {
                uint currentId = i + 1;
                MarketItem storage currentItem = idToMarketItem[currentId];
                items[currentIndex] = currentItem;
                currentIndex += 1;
            }
        }
        return items;
    }
    function likeNFT(uint256 tokenId) public {
        require(_exists(tokenId), "Token does not exist");
        require(!tokenLikes[tokenId][msg.sender], "Already liked");
        tokenLikes[tokenId][msg.sender] = true;
        idToMarketItem[tokenId].likes += 1;
        emit NFTLiked(tokenId, msg.sender);
    }
    function unlikeNFT(uint256 tokenId) public {
        require(_exists(tokenId), "Token does not exist");
        require(tokenLikes[tokenId][msg.sender], "Not liked yet");
        tokenLikes[tokenId][msg.sender] = false;
        idToMarketItem[tokenId].likes -= 1;
        emit NFTUnliked(tokenId, msg.sender);
    }
    function getMarketItem(uint256 tokenId) public view returns (MarketItem memory) {
        return idToMarketItem[tokenId];
    }
    function getTotalTokens() public view returns (uint256) {
        return _tokenIds.current();
    }
}