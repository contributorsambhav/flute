import { ethers, Contract, BrowserProvider, JsonRpcSigner } from "ethers";
export const CONTRACT_ADDRESS = '0xe7B56601507483b701d6927C65E53C4113cC5AA4';
export const SUPPORTED_NETWORKS = {
  sepolia: {
    chainId: '0xaa36a7',
    chainIdNumber: 11155111,
    name: 'Sepolia Testnet',
    rpcUrl: 'https://eth-sepolia.g.alchemy.com/v2/rxUcWxJuV1W4pIY79qeptqyeAf8KaKUk'
  }
};
export const CONTRACT_ABI = [
  "function getListingPrice() view returns (uint256)",
  "function fetchMarketItems() view returns (tuple(uint256 tokenId, address seller, address owner, uint256 price, bool sold, string category, uint256 likes)[])",
  "function fetchMyNFTs() view returns (tuple(uint256 tokenId, address seller, address owner, uint256 price, bool sold, string category, uint256 likes)[])",
  "function fetchItemsListed() view returns (tuple(uint256 tokenId, address seller, address owner, uint256 price, bool sold, string category, uint256 likes)[])",
  "function getMarketItem(uint256 tokenId) view returns (tuple(uint256 tokenId, address seller, address owner, uint256 price, bool sold, string category, uint256 likes))",
  "function getTotalTokens() view returns (uint256)",
  "function tokenURI(uint256 tokenId) view returns (string)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function tokenLikes(uint256 tokenId, address user) view returns (bool)",
  "function createToken(string tokenURI, uint256 price, string category) payable returns (uint256)",
  "function createMarketSale(uint256 tokenId) payable",
  "function likeNFT(uint256 tokenId)",
  "function unlikeNFT(uint256 tokenId)",
  "function updateListingPrice(uint256 _listingPrice) payable",
  "event MarketItemCreated(uint256 indexed tokenId, address seller, address owner, uint256 price, bool sold, string category)",
  "event MarketItemSold(uint256 indexed tokenId, address seller, address buyer, uint256 price)",
  "event NFTLiked(uint256 indexed tokenId, address liker)",
  "event NFTUnliked(uint256 indexed tokenId, address unliker)",
];
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
class BlockchainService {
  private provider: BrowserProvider | null = null;
  private signer: JsonRpcSigner | null = null;
  private contract: Contract | null = null;
  private readOnlyContract: Contract | null = null;
  private isInitializing: boolean = false;
  constructor() {
    this.initializeReadOnlyProvider();
    this.setupNetworkChangeListener();
  }
  private async initializeReadOnlyProvider(): Promise<void> {
    try {
      const readOnlyProvider = new ethers.JsonRpcProvider(SUPPORTED_NETWORKS.sepolia.rpcUrl);
      await readOnlyProvider.getNetwork();
      this.readOnlyContract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, readOnlyProvider);
      const code = await readOnlyProvider.getCode(CONTRACT_ADDRESS);
      if (code === '0x') {
        throw new Error('Contract not found at the specified address');
      }
    } catch (error) {
      console.error('Failed to initialize read-only provider:', error);
      throw new Error('Failed to connect to blockchain. Please check your internet connection.');
    }
  }

  private async ensureConnection(): Promise<void> {
    if (!this.contract || !this.signer) {
      const isConnected = await this.isWalletConnected();
      if (!isConnected) {
        throw new Error('Wallet not connected. Please connect your wallet first.');
      }
      await this.initializeProvider();
    }
    
    const network = await this.provider!.getNetwork();
    if (Number(network.chainId) !== SUPPORTED_NETWORKS.sepolia.chainIdNumber) {
      throw new Error('Please switch to Sepolia testnet');
    }
  }

  public async buyNFT(tokenId: number, price: string): Promise<PurchaseResult> {
    await this.ensureConnection();
    
    try {
      const priceInWei = ethers.parseEther(price);
      
      let gasEstimate: bigint;
      try {
        gasEstimate = await this.contract!.createMarketSale.estimateGas(tokenId, { value: priceInWei });
      } catch (gasError: any) {
        console.error('Gas estimation failed:', gasError);
        throw new Error(`Transaction will fail: ${gasError.reason || gasError.message}`);
      }

      const balance = await this.provider!.getBalance(await this.signer!.getAddress());
      const requiredAmount = priceInWei + (gasEstimate * BigInt(2000000000));
      
      if (balance < requiredAmount) {
        throw new Error(`Insufficient ETH. Need ~${ethers.formatEther(requiredAmount)} ETH`);
      }

      const transaction = await this.contract!.createMarketSale(tokenId, {
        value: priceInWei,
        gasLimit: (gasEstimate * BigInt(130)) / BigInt(100),
      });

      const receipt = await transaction.wait();
      return { transactionHash: receipt.hash };
    } catch (error: any) {
      console.error('Error buying NFT:', error);
      if (error.code === 'INSUFFICIENT_FUNDS') {
        throw new Error('Insufficient funds');
      } else if (error.code === 'USER_REJECTED' || error.code === 4001) {
        throw new Error('Transaction rejected');
      } else if (error.message?.includes('already sold')) {
        throw new Error('NFT already sold');
      } else {
        throw new Error(`Purchase failed: ${error.message || error}`);
      }
    }
  }

  public async likeNFT(tokenId: number): Promise<string> {
    await this.ensureConnection();
    
    try {
      let gasEstimate: bigint;
      try {
        gasEstimate = await this.contract!.likeNFT.estimateGas(tokenId);
      } catch (gasError: any) {
        if (gasError.reason?.includes('Already liked')) {
          throw new Error('You have already liked this NFT');
        }
        throw new Error(`Like will fail: ${gasError.reason || gasError.message}`);
      }

      const transaction = await this.contract!.likeNFT(tokenId, {
        gasLimit: (gasEstimate * BigInt(130)) / BigInt(100),
      });
      
      const receipt = await transaction.wait();
      return receipt.hash;
    } catch (error: any) {
      console.error('Error liking NFT:', error);
      if (error.code === 'USER_REJECTED' || error.code === 4001) {
        throw new Error('Transaction rejected');
      } else {
        throw new Error(`Like failed: ${error.message || error}`);
      }
    }
  }

  public async unlikeNFT(tokenId: number): Promise<string> {
    await this.ensureConnection();
    
    try {
      let gasEstimate: bigint;
      try {
        gasEstimate = await this.contract!.unlikeNFT.estimateGas(tokenId);
      } catch (gasError: any) {
        if (gasError.reason?.includes('Not liked')) {
          throw new Error('You have not liked this NFT yet');
        }
        throw new Error(`Unlike will fail: ${gasError.reason || gasError.message}`);
      }

      const transaction = await this.contract!.unlikeNFT(tokenId, {
        gasLimit: (gasEstimate * BigInt(130)) / BigInt(100),
      });
      
      const receipt = await transaction.wait();
      return receipt.hash;
    } catch (error: any) {
      console.error('Error unliking NFT:', error);
      if (error.code === 'USER_REJECTED' || error.code === 4001) {
        throw new Error('Transaction rejected');
      } else {
        throw new Error(`Unlike failed: ${error.message || error}`);
      }
    }
  }
  private setupNetworkChangeListener(): void {
    if (typeof window !== 'undefined' && window.ethereum) {
      window.ethereum.on('chainChanged', (chainId: string) => {
        console.log('Network changed to:', chainId);
        this.provider = null;
        this.signer = null;
        this.contract = null;
        console.log('Please refresh the page or reconnect your wallet');
      });
      window.ethereum.on('accountsChanged', (accounts: string[]) => {
        console.log('Accounts changed:', accounts);
        if (accounts.length === 0) {
          this.provider = null;
          this.signer = null;
          this.contract = null;
        } else {
          this.initializeProvider().catch(console.error);
        }
      });
    }
  }
  private async ensureCorrectNetwork(): Promise<void> {
    if (typeof window === 'undefined' || !window.ethereum) {
      throw new Error('MetaMask not installed');
    }
    try {
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      console.log('Current network:', chainId, 'Expected:', SUPPORTED_NETWORKS.sepolia.chainId);
      if (chainId !== SUPPORTED_NETWORKS.sepolia.chainId) {
        console.log('Switching to Sepolia network...');
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: SUPPORTED_NETWORKS.sepolia.chainId }],
        });
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error: any) {
      if (error.code === 4902) {
        throw new Error('Sepolia network not added to MetaMask. Please add it manually.');
      } else if (error.code === 4001) {
        throw new Error('User rejected network switch');
      } else {
        throw new Error(`Network switch failed: ${error.message}`);
      }
    }
  }
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
  public async connectWallet(): Promise<string | null> {
    if (typeof window === 'undefined' || !window.ethereum) {
      throw new Error('MetaMask is not installed. Please install MetaMask to continue.');
    }
    if (this.isInitializing) {
      throw new Error('Connection already in progress. Please wait.');
    }
    try {
      this.isInitializing = true;
      console.log('Connecting wallet...');
      await this.ensureCorrectNetwork();
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      if (accounts && accounts.length > 0) {
        console.log('Wallet connected:', accounts[0]);
        await this.initializeProvider();
        await this.verifyContractConnection();
        return accounts[0];
      }
      return null;
    } catch (error: any) {
      console.error('Error connecting wallet:', error);
      if (error.code === 4001) {
        throw new Error('Connection rejected by user');
      } else if (error.message?.includes('network')) {
        throw new Error('Network connection failed. Please ensure you\'re on Sepolia testnet.');
      } else {
        throw new Error(`Wallet connection failed: ${error.message || error}`);
      }
    } finally {
      this.isInitializing = false;
    }
  }
  private async initializeProvider(): Promise<void> {
    if (typeof window === "undefined" || !window.ethereum) {
      throw new Error("MetaMask is not installed");
    }
    try {
      console.log('Initializing provider...');
      this.provider = new BrowserProvider(window.ethereum);
      const network = await this.provider.getNetwork();
      console.log('Connected to network:', network.name, network.chainId);
      if (Number(network.chainId) !== SUPPORTED_NETWORKS.sepolia.chainIdNumber) {
        throw new Error(`Wrong network. Please switch to Sepolia testnet. Current: ${network.chainId}`);
      }
      this.signer = await this.provider.getSigner();
      this.contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, this.signer);
      console.log('Provider initialized successfully');
    } catch (error) {
      console.error('Error initializing provider:', error);
      this.provider = null;
      this.signer = null;
      this.contract = null;
      throw error;
    }
  }
  private async verifyContractConnection(): Promise<void> {
    try {
      console.log('Verifying contract connection...');
      const contract = this.contract || this.readOnlyContract;
      if (!contract) {
        throw new Error('No contract instance available');
      }
      const totalTokens = await contract.getTotalTokens();
      console.log('Contract verification successful. Total tokens:', totalTokens.toString());
    } catch (error: any) {
      console.error('Contract verification failed:', error);
      throw new Error(`Cannot connect to contract: ${error.message}. Please check if the contract is deployed on Sepolia.`);
    }
  }
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
  public async getListingPrice(): Promise<string> {
    try {
      const contract = this.contract || this.readOnlyContract;
      if (!contract) {
        await this.initializeReadOnlyProvider();
        if (!this.readOnlyContract) {
          throw new Error('Contract not initialized');
        }
      }
      const finalContract = this.contract || this.readOnlyContract;
      const price = await finalContract!.getListingPrice();
      return ethers.formatEther(price);
    } catch (error: any) {
      console.error('Error getting listing price:', error);
      throw new Error(`Failed to get listing price: ${error.message}`);
    }
  }
  public async mintNFT(
    title: string,
    description: string,
    metadataUrl: string,
    price: string,
    category: string,
  ): Promise<MintResult> {
    if (!this.contract || !this.signer) {
      throw new Error('Wallet not connected. Please connect your wallet first.');
    }
    try {
      console.log('Starting NFT mint process...');
      console.log('Mint parameters:', {
        title,
        description,
        metadataUrl,
        price,
        category,
      });
      const network = await this.provider!.getNetwork();
      if (Number(network.chainId) !== SUPPORTED_NETWORKS.sepolia.chainIdNumber) {
        throw new Error('Network changed. Please ensure you\'re on Sepolia testnet.');
      }
      const listingPriceEth = await this.getListingPrice();
      const listingPrice = ethers.parseEther(listingPriceEth);
      const priceInWei = ethers.parseEther(price);
      console.log("Transaction parameters:", {
        tokenURI: metadataUrl,
        priceInWei: priceInWei.toString(),
        category,
        listingPrice: listingPrice.toString(),
      });
      console.log('Estimating gas...');
      let gasEstimate: bigint;
      try {
        gasEstimate = await this.contract.createToken.estimateGas(
          metadataUrl,
          priceInWei,
          category,
          { value: listingPrice },
        );
        console.log('Estimated gas:', gasEstimate.toString());
      } catch (gasError: any) {
        console.error('Gas estimation failed:', gasError);
        throw new Error(`Gas estimation failed: ${gasError.reason || gasError.message || gasError}`);
      }
      const balance = await this.provider!.getBalance(await this.signer.getAddress());
      const requiredAmount = listingPrice + (gasEstimate * BigInt(2000000000)); 
      if (balance < requiredAmount) {
        throw new Error(`Insufficient ETH balance. Required: ~${ethers.formatEther(requiredAmount)} ETH`);
      }
      console.log('Sending transaction...');
      const transaction = await this.contract.createToken(
        metadataUrl,
        priceInWei,
        category,
        {
          value: listingPrice,
          gasLimit: (gasEstimate * BigInt(120)) / BigInt(100), 
        },
      );
      console.log('Transaction sent:', transaction.hash);
      console.log('Waiting for confirmation...');
      const receipt = await transaction.wait();
      console.log("Transaction confirmed:", receipt);
      const tokenId = await this.extractTokenIdFromReceipt(receipt);
      return {
        tokenId: tokenId,
        transactionHash: receipt.hash,
      };
    } catch (error: any) {
      console.error('Error minting NFT:', error);
      if (error.code === 'INSUFFICIENT_FUNDS') {
        throw new Error('Insufficient funds to pay for transaction and gas fees');
      } else if (error.code === 'USER_REJECTED' || error.code === 4001) {
        throw new Error('Transaction was rejected by user');
      } else if (error.message?.includes('execution reverted')) {
        throw new Error('Transaction failed: Contract execution reverted. Please check your parameters.');
      } else if (error.message?.includes('nonce')) {
        throw new Error('Transaction failed: Nonce error. Please try again.');
      } else if (error.message?.includes('network')) {
        throw new Error('Network error: Please ensure you\'re connected to Sepolia testnet.');
      } else {
        throw new Error(`Minting failed: ${error.message || error}`);
      }
    }
  }
  private async extractTokenIdFromReceipt(receipt: any): Promise<number> {
    try {
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
      try {
        const totalTokens = await this.contract!.getTotalTokens();
        return Number(totalTokens);
      } catch (fallbackError) {
        console.warn(
          "Could not get total tokens for token ID fallback:",
          fallbackError,
        );
      }
      return 0;
    } catch (error) {
      console.error("Error extracting token ID:", error);
      return 0;
    }
  }


  public async hasLikedNFT(
    tokenId: number,
    userAddress: string,
  ): Promise<boolean> {
    try {
      const contract = this.contract || this.readOnlyContract;
      if (!contract) {
        await this.initializeReadOnlyProvider();
      }
      const finalContract = this.contract || this.readOnlyContract;
      return await finalContract!.tokenLikes(tokenId, userAddress);
    } catch (error) {
      console.error("Error checking like status:", error);
      return false;
    }
  }
  public async fetchMarketItems(): Promise<MarketItem[]> {
    try {
      const contract = this.contract || this.readOnlyContract;
      if (!contract) {
        await this.initializeReadOnlyProvider();
      }
      const finalContract = this.contract || this.readOnlyContract;
      const items = await finalContract!.fetchMarketItems();
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
  public async fetchMyNFTs(): Promise<MarketItem[]> {
    if (!this.contract) {
      throw new Error('Wallet not connected. Please connect your wallet first.');
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
  public async fetchListedItems(): Promise<MarketItem[]> {
    if (!this.contract) {
      throw new Error('Wallet not connected. Please connect your wallet first.');
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
  public async getTokenMetadata(tokenId: number): Promise<NFTMetadata | null> {
    try {
      const contract = this.contract || this.readOnlyContract;
      if (!contract) {
        await this.initializeReadOnlyProvider();
      }
      const finalContract = this.contract || this.readOnlyContract;
      const tokenURI = await finalContract!.tokenURI(tokenId);
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
  public async getMarketItem(tokenId: number): Promise<MarketItem | null> {
    try {
      const contract = this.contract || this.readOnlyContract;
      if (!contract) {
        await this.initializeReadOnlyProvider();
      }
      const finalContract = this.contract || this.readOnlyContract;
      const item = await finalContract!.getMarketItem(tokenId);
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
  public removeEventListeners(): void {
    const contract = this.contract || this.readOnlyContract;
    if (contract) {
      contract.removeAllListeners();
    }
  }
  public async getCurrentNetwork(): Promise<{ chainId: number; name: string } | null> {
    try {
      if (this.provider) {
        const network = await this.provider.getNetwork();
        return {
          chainId: Number(network.chainId),
          name: network.name
        };
      }
      return null;
    } catch (error) {
      console.error('Error getting current network:', error);
      return null;
    }
  }
}
export const blockchainService = new BlockchainService();
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
export const getSupportedNetworks = () => {
  return SUPPORTED_NETWORKS;
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