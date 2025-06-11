import { ethers, Contract, BrowserProvider, JsonRpcSigner } from "ethers";

// Contract address and ABI
export const CONTRACT_ADDRESS = "0xe7B56601507483b701d6927C65E53C4113cC5AA4";

// ABI for the ArtiFusionNFT contract
export const CONTRACT_ABI = [
  // Read functions
  "function getListingPrice() view returns (uint256)",
  "function fetchMarketItems() view returns (tuple(uint256 tokenId, address seller, address owner, uint256 price, bool sold, string category, uint256 likes)[])",
  "function fetchMyNFTs() view returns (tuple(uint256 tokenId, address seller, address owner, uint256 price, bool sold, string category, uint256 likes)[])",
  "function fetchItemsListed() view returns (tuple(uint256 tokenId, address seller, address owner, uint256 price, bool sold, string category, uint256 likes)[])",
  "function getMarketItem(uint256 tokenId) view returns (tuple(uint256 tokenId, address seller, address owner, uint256 price, bool sold, string category, uint256 likes))",
  "function getTotalTokens() view returns (uint256)",
  "function tokenURI(uint256 tokenId) view returns (string)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function tokenLikes(uint256 tokenId, address user) view returns (bool)",

  // Write functions
  "function createToken(string tokenURI, uint256 price, string category) payable returns (uint256)",
  "function createMarketSale(uint256 tokenId) payable",
  "function likeNFT(uint256 tokenId)",
  "function unlikeNFT(uint256 tokenId)",
  "function updateListingPrice(uint256 _listingPrice) payable",

  // Events
  "event MarketItemCreated(uint256 indexed tokenId, address seller, address owner, uint256 price, bool sold, string category)",
  "event MarketItemSold(uint256 indexed tokenId, address seller, address buyer, uint256 price)",
  "event NFTLiked(uint256 indexed tokenId, address liker)",
  "event NFTUnliked(uint256 indexed tokenId, address unliker)",
];

// Types
export interface MarketItem {
  tokenId: number;
  seller: string;
  owner: string;
  price: string;
  sold: boolean;
  category: string;
  likes: number;
}

export interface NFTMetadata {
  name: string;
  description: string;
  image: string;
  attributes?: Array<{
    trait_type: string;
    value: string;
  }>;
}

export interface MintResult {
  tokenId: number;
  transactionHash: string;
}

export interface PurchaseResult {
  transactionHash: string;
}

// Blockchain utility class
class BlockchainService {
  private provider: BrowserProvider | null = null;
  private signer: JsonRpcSigner | null = null;
  private contract: Contract | null = null;
  private readOnlyContract: Contract | null = null;

  constructor() {
    this.initializeReadOnlyProvider();
  }

  // Initialize read-only provider for viewing data without wallet connection
  private async initializeReadOnlyProvider(): Promise<void> {
    try {
      // Check if we're on the correct network first
      const rpcUrl = await this.getCorrectRPCUrl();
      const readOnlyProvider = new ethers.JsonRpcProvider(rpcUrl);
      this.readOnlyContract = new Contract(
        CONTRACT_ADDRESS,
        CONTRACT_ABI,
        readOnlyProvider,
      );
    } catch (error) {
      console.warn("Failed to initialize read-only provider:", error);
    }
  }

  // Get the correct RPC URL based on network
  private async getCorrectRPCUrl(): Promise<string> {
    return "https://eth-sepolia.g.alchemy.com/v2/rxUcWxJuV1W4pIY79qeptqyeAf8KaKUk"; // Sepolia Testnet
  }

  // Check if wallet is connected
  public async isWalletConnected(): Promise<boolean> {
    if (typeof window === "undefined" || !window.ethereum) {
      return false;
    }

    try {
      const accounts = await window.ethereum.request({
        method: "eth_accounts",
      });
      return accounts && accounts.length > 0;
    } catch (error) {
      console.error("Error checking wallet connection:", error);
      return false;
    }
  }

  // Connect to wallet
  public async connectWallet(): Promise<string | null> {
    if (typeof window === "undefined" || !window.ethereum) {
      throw new Error("MetaMask is not installed");
    }

    try {
      // Request account access
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });

      if (accounts && accounts.length > 0) {
        await this.initializeProvider();
        return accounts[0];
      }

      return null;
    } catch (error) {
      console.error("Error connecting wallet:", error);
      throw error;
    }
  }

  // Initialize ethers provider and signer
  private async initializeProvider(): Promise<void> {
    if (typeof window === "undefined" || !window.ethereum) {
      throw new Error("MetaMask is not installed");
    }

    try {
      this.provider = new BrowserProvider(window.ethereum);
      this.signer = await this.provider.getSigner();
      this.contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, this.signer);
    } catch (error) {
      console.error("Error initializing provider:", error);
      throw error;
    }
  }

  // Get current account
  public async getCurrentAccount(): Promise<string | null> {
    if (!this.signer) {
      const isConnected = await this.isWalletConnected();
      if (isConnected) {
        await this.initializeProvider();
      } else {
        return null;
      }
    }

    try {
      return await this.signer!.getAddress();
    } catch (error) {
      console.error("Error getting current account:", error);
      return null;
    }
  }

  // Get listing price with better error handling
  public async getListingPrice(): Promise<string> {
    try {
      const contract = this.contract || this.readOnlyContract;
      if (!contract) {
        throw new Error("Contract not initialized");
      }

      // Add timeout and retry logic
      const price = await Promise.race([
        contract.getListingPrice(),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error("Timeout getting listing price")),
            10000,
          ),
        ),
      ]);

      return ethers.formatEther(price);
    } catch (error) {
      console.error("Error getting listing price:", error);

      // Return a default listing price if the contract call fails
      // This should match your contract's default listing price
      console.error("Using fallback listing price of 0.025 ETH");
      return "0.025";
    }
  }

  // Mint a new NFT with direct IPFS metadata URL
  public async mintNFT(
    title: string,
    description: string,
    metadataUrl: string, // Now expects the full IPFS metadata URL
    price: string,
    category: string,
  ): Promise<MintResult> {
    if (!this.contract || !this.signer) {
      await this.initializeProvider();
    }

    if (!this.contract) {
      throw new Error("Contract not initialized");
    }

    try {
      console.log("Minting NFT with params:", {
        title,
        description,
        metadataUrl,
        price,
        category,
      });

      // Get listing price with fallback
      let listingPriceEth: string;
      try {
        listingPriceEth = await this.getListingPrice();
      } catch (error) {
        console.warn(
          "Could not get listing price from contract, using fallback",
        );
        listingPriceEth = "0.001"; // Fallback listing price
      }

      const listingPrice = ethers.parseEther(listingPriceEth);

      // Convert price from ETH to Wei
      const priceInWei = ethers.parseEther(price);

      console.log("Transaction parameters:", {
        tokenURI: metadataUrl,
        priceInWei: priceInWei.toString(),
        category,
        listingPrice: listingPrice.toString(),
      });

      // Estimate gas first
      let gasEstimate;
      try {
        gasEstimate = await this.contract.createToken.estimateGas(
          metadataUrl,
          priceInWei,
          category,
          { value: listingPrice },
        );
        console.log("Estimated gas:", gasEstimate.toString());
      } catch (gasError: any) {
        console.error("Gas estimation failed:", gasError);
        throw new Error(
          `Gas estimation failed: ${gasError.message || gasError}`,
        );
      }

      // Mint the NFT with gas limit
      const transaction = await this.contract.createToken(
        metadataUrl,
        priceInWei,
        category,
        {
          value: listingPrice,
          gasLimit: (gasEstimate * BigInt(120)) / BigInt(100), // Add 20% buffer
        },
      );

      console.log("Transaction sent:", transaction.hash);

      const receipt = await transaction.wait();
      console.log("Transaction confirmed:", receipt);

      // Extract token ID from the event logs
      const tokenId = await this.extractTokenIdFromReceipt(receipt);

      return {
        tokenId: tokenId,
        transactionHash: receipt.hash,
      };
    } catch (error: any) {
      console.error("Error minting NFT:", error);

      // Provide more specific error messages
      if (error.code === "INSUFFICIENT_FUNDS") {
        throw new Error(
          "Insufficient funds to pay for transaction and gas fees",
        );
      } else if (error.code === "USER_REJECTED") {
        throw new Error("Transaction was rejected by user");
      } else if (error.message?.includes("execution reverted")) {
        throw new Error(
          "Transaction failed: Contract execution reverted. Please check your parameters.",
        );
      } else if (error.message?.includes("nonce")) {
        throw new Error("Transaction failed: Nonce error. Please try again.");
      } else {
        throw new Error(`Minting failed: ${error.message || error}`);
      }
    }
  }

  // Extract token ID from transaction receipt
  private async extractTokenIdFromReceipt(receipt: any): Promise<number> {
    try {
      // Look for MarketItemCreated event
      const event = receipt.logs.find((log: any) => {
        try {
          const parsedLog = this.contract!.interface.parseLog(log);
          return parsedLog?.name === "MarketItemCreated";
        } catch {
          return false;
        }
      });

      if (event) {
        const parsedLog = this.contract!.interface.parseLog(event);
        return Number(parsedLog!.args.tokenId);
      }

      // Fallback: get total tokens
      try {
        const totalTokens = await this.contract!.getTotalTokens();
        return Number(totalTokens);
      } catch (fallbackError) {
        console.warn(
          "Could not get total tokens for token ID fallback:",
          fallbackError,
        );
      }

      // Final fallback: extract from transaction logs manually
      console.log("Attempting to extract token ID from logs manually...");
      for (const log of receipt.logs) {
        try {
          // Try to decode each log
          const parsed = this.contract!.interface.parseLog(log);
          if (parsed && parsed.args && parsed.args.tokenId) {
            return Number(parsed.args.tokenId);
          }
        } catch (e) {
          // Continue to next log
        }
      }

      return 0;
    } catch (error) {
      console.error("Error extracting token ID:", error);
      return 0;
    }
  }

  // Buy an NFT
  public async buyNFT(tokenId: number, price: string): Promise<PurchaseResult> {
    if (!this.contract || !this.signer) {
      await this.initializeProvider();
    }

    if (!this.contract) {
      throw new Error("Contract not initialized");
    }

    try {
      const priceInWei = ethers.parseEther(price);

      const transaction = await this.contract.createMarketSale(tokenId, {
        value: priceInWei,
      });

      const receipt = await transaction.wait();

      return {
        transactionHash: receipt.hash,
      };
    } catch (error) {
      console.error("Error buying NFT:", error);
      throw error;
    }
  }

  // Like an NFT
  public async likeNFT(tokenId: number): Promise<string> {
    if (!this.contract || !this.signer) {
      await this.initializeProvider();
    }

    if (!this.contract) {
      throw new Error("Contract not initialized");
    }

    try {
      const transaction = await this.contract.likeNFT(tokenId);
      const receipt = await transaction.wait();
      return receipt.hash;
    } catch (error) {
      console.error("Error liking NFT:", error);
      throw error;
    }
  }

  // Unlike an NFT
  public async unlikeNFT(tokenId: number): Promise<string> {
    if (!this.contract || !this.signer) {
      await this.initializeProvider();
    }

    if (!this.contract) {
      throw new Error("Contract not initialized");
    }

    try {
      const transaction = await this.contract.unlikeNFT(tokenId);
      const receipt = await transaction.wait();
      return receipt.hash;
    } catch (error) {
      console.error("Error unliking NFT:", error);
      throw error;
    }
  }

  // Check if user has liked an NFT
  public async hasLikedNFT(
    tokenId: number,
    userAddress: string,
  ): Promise<boolean> {
    try {
      const contract = this.contract || this.readOnlyContract;
      if (!contract) {
        throw new Error("Contract not initialized");
      }

      return await contract.tokenLikes(tokenId, userAddress);
    } catch (error) {
      console.error("Error checking like status:", error);
      return false;
    }
  }

  // Fetch all market items
  public async fetchMarketItems(): Promise<MarketItem[]> {
    try {
      const contract = this.contract || this.readOnlyContract;
      if (!contract) {
        throw new Error("Contract not initialized");
      }

      const items = await contract.fetchMarketItems();

      return items.map((item: any) => ({
        tokenId: Number(item.tokenId),
        seller: item.seller,
        owner: item.owner,
        price: ethers.formatEther(item.price),
        sold: item.sold,
        category: item.category,
        likes: Number(item.likes),
      }));
    } catch (error) {
      console.error("Error fetching market items:", error);
      return [];
    }
  }

  // Fetch user's NFTs
  public async fetchMyNFTs(): Promise<MarketItem[]> {
    if (!this.contract) {
      await this.initializeProvider();
    }

    if (!this.contract) {
      throw new Error("Contract not initialized");
    }

    try {
      const items = await this.contract.fetchMyNFTs();

      return items.map((item: any) => ({
        tokenId: Number(item.tokenId),
        seller: item.seller,
        owner: item.owner,
        price: ethers.formatEther(item.price),
        sold: item.sold,
        category: item.category,
        likes: Number(item.likes),
      }));
    } catch (error) {
      console.error("Error fetching my NFTs:", error);
      return [];
    }
  }

  // Fetch user's listed items
  public async fetchListedItems(): Promise<MarketItem[]> {
    if (!this.contract) {
      await this.initializeProvider();
    }

    if (!this.contract) {
      throw new Error("Contract not initialized");
    }

    try {
      const items = await this.contract.fetchItemsListed();

      return items.map((item: any) => ({
        tokenId: Number(item.tokenId),
        seller: item.seller,
        owner: item.owner,
        price: ethers.formatEther(item.price),
        sold: item.sold,
        category: item.category,
        likes: Number(item.likes),
      }));
    } catch (error) {
      console.error("Error fetching listed items:", error);
      return [];
    }
  }

  // Get NFT metadata
  public async getTokenMetadata(tokenId: number): Promise<NFTMetadata | null> {
    try {
      const contract = this.contract || this.readOnlyContract;
      if (!contract) {
        throw new Error("Contract not initialized");
      }

      const tokenURI = await contract.tokenURI(tokenId);

      // Fetch metadata from IPFS or other storage
      const response = await fetch(tokenURI);
      if (!response.ok) {
        throw new Error("Failed to fetch metadata");
      }

      return await response.json();
    } catch (error) {
      console.error("Error getting token metadata:", error);
      return null;
    }
  }

  // Get market item details
  public async getMarketItem(tokenId: number): Promise<MarketItem | null> {
    try {
      const contract = this.contract || this.readOnlyContract;
      if (!contract) {
        throw new Error("Contract not initialized");
      }

      const item = await contract.getMarketItem(tokenId);

      return {
        tokenId: Number(item.tokenId),
        seller: item.seller,
        owner: item.owner,
        price: ethers.formatEther(item.price),
        sold: item.sold,
        category: item.category,
        likes: Number(item.likes),
      };
    } catch (error) {
      console.error("Error getting market item:", error);
      return null;
    }
  }

  // Listen to contract events
  public setupEventListeners(callbacks: {
    onMarketItemCreated?: (
      tokenId: number,
      seller: string,
      price: string,
    ) => void;
    onMarketItemSold?: (
      tokenId: number,
      seller: string,
      buyer: string,
      price: string,
    ) => void;
    onNFTLiked?: (tokenId: number, liker: string) => void;
  }): void {
    const contract = this.contract || this.readOnlyContract;
    if (!contract) {
      console.warn("Contract not initialized for event listeners");
      return;
    }

    if (callbacks.onMarketItemCreated) {
      contract.on(
        "MarketItemCreated",
        (tokenId, seller, owner, price, sold, category) => {
          callbacks.onMarketItemCreated!(
            Number(tokenId),
            seller,
            ethers.formatEther(price),
          );
        },
      );
    }

    if (callbacks.onMarketItemSold) {
      contract.on("MarketItemSold", (tokenId, seller, buyer, price) => {
        callbacks.onMarketItemSold!(
          Number(tokenId),
          seller,
          buyer,
          ethers.formatEther(price),
        );
      });
    }

    if (callbacks.onNFTLiked) {
      contract.on("NFTLiked", (tokenId, liker) => {
        callbacks.onNFTLiked!(Number(tokenId), liker);
      });
    }
  }

  // Remove event listeners
  public removeEventListeners(): void {
    const contract = this.contract || this.readOnlyContract;
    if (contract) {
      contract.removeAllListeners();
    }
  }
}

// Export singleton instance
export const blockchainService = new BlockchainService();

// Utility functions
export const formatAddress = (address: string): string => {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

export const formatPrice = (price: string | number): string => {
  const numPrice = typeof price === "string" ? parseFloat(price) : price;
  return `${numPrice.toFixed(4)} ETH`;
};

export const isValidAddress = (address: string): boolean => {
  try {
    return ethers.isAddress(address);
  } catch {
    return false;
  }
};

// Network helpers
export const getSupportedNetworks = () => {
  return {
    mainnet: { chainId: "0x1", name: "Ethereum Mainnet" },
    goerli: { chainId: "0x5", name: "Goerli Testnet" },
    sepolia: { chainId: "0xaa36a7", name: "Sepolia Testnet" },
    polygon: { chainId: "0x89", name: "Polygon Mainnet" },
    mumbai: { chainId: "0x13881", name: "Mumbai Testnet" },
  };
};

export const switchNetwork = async (chainId: string): Promise<void> => {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error("MetaMask is not installed");
  }

  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId }],
    });
  } catch (error: any) {
    if (error.code === 4902) {
      throw new Error("Network not added to MetaMask");
    }
    throw error;
  }
};
