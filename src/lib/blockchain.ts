import { BrowserProvider, Contract, JsonRpcSigner, Log, TransactionReceipt, TransactionResponse, ethers } from "ethers";
import { DEFAULT_NETWORK, getNetworkConfig, isNetworkSupported, type NetworkConfig } from './networks';

export const CONTRACT_ABI = [
  // View functions
  "function getListingPrice() view returns (uint256)",
  "function fetchMarketItems() view returns (tuple(uint256 tokenId, address seller, address owner, uint256 price, bool sold, string category, uint256 likes)[])",
  "function fetchMyNFTs() view returns (tuple(uint256 tokenId, address seller, address owner, uint256 price, bool sold, string category, uint256 likes)[])",
  "function fetchItemsListed() view returns (tuple(uint256 tokenId, address seller, address owner, uint256 price, bool sold, string category, uint256 likes)[])",
  "function getMarketItem(uint256 tokenId) view returns (tuple(uint256 tokenId, address seller, address owner, uint256 price, bool sold, string category, uint256 likes))",
  "function getTotalTokens() view returns (uint256)",
  "function tokenURI(uint256 tokenId) view returns (string)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function tokenLikes(uint256 tokenId, address user) view returns (bool)",
  "function getContractBalance() view returns (uint256)",
  "function getTotalFeesCollected() view returns (uint256)",
  
  // Minting and Marketplace Actions
  "function mintNFT(string tokenURI, string category) returns (uint256)",
  "function listNFTForSale(uint256 tokenId, uint256 price) payable",
  "function buyNFT(uint256 tokenId) payable",
  "function cancelListing(uint256 tokenId)",
  
  // Likes
  "function likeNFT(uint256 tokenId)",
  "function unlikeNFT(uint256 tokenId)",
  
  // Admin
  "function updateListingPrice(uint256 _listingPrice)",
  "function withdrawFees()",
  "function withdrawAmount(uint256 amount)",
  
  // Events
  "event NFTMinted(uint256 indexed tokenId, address owner, string tokenURI, string category)",
  "event MarketItemListed(uint256 indexed tokenId, address seller, uint256 price, string category)",
  "event MarketItemSold(uint256 indexed tokenId, address seller, address buyer, uint256 price)",
  "event NFTLiked(uint256 indexed tokenId, address liker)",
  "event NFTUnliked(uint256 indexed tokenId, address unliker)"
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

interface EthereumError extends Error {
  code?: number | string;
  reason?: string;
}

interface ContractMarketItem {
  tokenId: bigint;
  seller: string;
  owner: string;
  price: bigint;
  sold: boolean;
  category: string;
  likes: bigint;
}



class BlockchainService {
  private provider: BrowserProvider | null = null;
  private signer: JsonRpcSigner | null = null;
  private contract: Contract | null = null;
  private readOnlyContract: Contract | null = null;
  private isInitializing: boolean = false;
  private currentNetwork: NetworkConfig = DEFAULT_NETWORK;

  constructor() {
    this.initializeReadOnlyProvider();
    this.setupNetworkChangeListener();
  }

  private async initializeReadOnlyProvider(): Promise<void> {
    try {
      const readOnlyProvider = new ethers.JsonRpcProvider(this.currentNetwork.rpcUrl);
      await readOnlyProvider.getNetwork();
      
      this.readOnlyContract = new Contract(
        this.currentNetwork.contractAddress,
        CONTRACT_ABI,
        readOnlyProvider
      );
      
      const code = await readOnlyProvider.getCode(this.currentNetwork.contractAddress);
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
    if (!isNetworkSupported(Number(network.chainId))) {
      throw new Error(`Unsupported network. Please switch to ${this.currentNetwork.name}`);
    }
  }

  private setupNetworkChangeListener(): void {
    if (typeof window !== 'undefined' && window.ethereum) {
      const handleChainChanged = (chainId: unknown) => {
        console.log('Network changed to:', chainId);
        const chainIdNum = typeof chainId === 'string' ? parseInt(chainId, 16) : Number(chainId);
        
        if (isNetworkSupported(chainIdNum)) {
          const networkConfig = getNetworkConfig(chainIdNum);
          if (networkConfig) {
            this.currentNetwork = networkConfig;
          }
        }
        
        this.provider = null;
        this.signer = null;
        this.contract = null;
        this.initializeReadOnlyProvider();
      };

      const handleAccountsChanged = (accounts: unknown) => {
        console.log('Accounts changed:', accounts);
        if (Array.isArray(accounts) && accounts.length === 0) {
          this.provider = null;
          this.signer = null;
          this.contract = null;
        } else {
          this.initializeProvider().catch(console.error);
        }
      };

      if (window.ethereum.on) {
        window.ethereum.on('chainChanged', handleChainChanged);
        window.ethereum.on('accountsChanged', handleAccountsChanged);
      }
    }
  }

  private async ensureCorrectNetwork(): Promise<void> {
    if (typeof window === 'undefined' || !window.ethereum) {
      throw new Error('MetaMask not installed');
    }

    try {
      const chainId = await window.ethereum.request({ method: 'eth_chainId' }) as string;
      const chainIdNum = parseInt(chainId, 16);
      
      if (!isNetworkSupported(chainIdNum)) {
        const hexChainId = `0x${this.currentNetwork.chainId.toString(16)}`;
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: hexChainId }],
        });
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      const err = error as EthereumError;
      if (err.code === 4902) {
        throw new Error(`${this.currentNetwork.name} not added to MetaMask. Please add it manually.`);
      } else if (err.code === 4001) {
        throw new Error('User rejected network switch');
      } else {
        throw new Error(`Network switch failed: ${err.message}`);
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
      }) as string[];
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
      await this.ensureCorrectNetwork();

      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      }) as string[];

      if (accounts && accounts.length > 0) {
        await this.initializeProvider();
        await this.verifyContractConnection();
        return accounts[0];
      }
      return null;
    } catch (error) {
      const err = error as EthereumError;
      console.error('Error connecting wallet:', err);
      if (err.code === 4001) {
        throw new Error('Connection rejected by user');
      } else if (err.message?.includes('network')) {
        throw new Error(`Network connection failed. Please ensure you're on ${this.currentNetwork.name}.`);
      } else {
        throw new Error(`Wallet connection failed: ${err.message || err}`);
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
      this.provider = new BrowserProvider(window.ethereum as unknown as ethers.Eip1193Provider);
      const network = await this.provider.getNetwork();
      const chainId = Number(network.chainId);

      if (!isNetworkSupported(chainId)) {
        throw new Error(`Wrong network. Please switch to ${this.currentNetwork.name}.`);
      }

      const networkConfig = getNetworkConfig(chainId);
      if (networkConfig) {
        this.currentNetwork = networkConfig;
      }

      this.signer = await this.provider.getSigner();
      this.contract = new Contract(
        this.currentNetwork.contractAddress,
        CONTRACT_ABI,
        this.signer
      );
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
      const contract = this.contract || this.readOnlyContract;
      if (!contract) {
        throw new Error('No contract instance available');
      }

      const totalTokens = await contract.getTotalTokens();
      console.log('Contract verification successful. Total tokens:', totalTokens.toString());
    } catch (error) {
      const err = error as Error;
      console.error('Contract verification failed:', err);
      throw new Error(`Cannot connect to contract: ${err.message}. Please check if the contract is deployed.`);
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
      }

      const finalContract = this.contract || this.readOnlyContract;
      if (!finalContract) {
        throw new Error('Contract not initialized');
      }

      const price = await finalContract.getListingPrice();
      return ethers.formatEther(price);
    } catch (error) {
      const err = error as Error;
      console.error('Error getting listing price:', err);
      throw new Error(`Failed to get listing price: ${err.message}`);
    }
  }

  /**
   * Mint NFT - FREE, goes directly to creator's wallet
   */
  public async mintNFT(
    metadataUrl: string,
    category: string,
  ): Promise<MintResult> {
    await this.ensureConnection();

    try {
      console.log('Minting NFT (free)...', { metadataUrl, category });

      let gasEstimate: bigint;
      try {
        gasEstimate = await this.contract!.mintNFT.estimateGas(metadataUrl, category);
      } catch (gasError) {
        const error = gasError as EthereumError;
        console.error('Gas estimation failed:', error);
        throw new Error(`Gas estimation failed: ${error.reason || error.message}`);
      }

      const transaction: TransactionResponse = await this.contract!.mintNFT(
        metadataUrl,
        category,
        {
          gasLimit: (gasEstimate * BigInt(130)) / BigInt(100),
        }
      );

      console.log('Transaction sent:', transaction.hash);
      const receipt = await transaction.wait();
      console.log("Transaction confirmed:", receipt);

      const tokenId = await this.extractTokenIdFromReceipt(receipt!);

      return {
        tokenId: tokenId,
        transactionHash: receipt!.hash,
      };
    } catch (error) {
      const err = error as EthereumError;
      console.error('Error minting NFT:', err);
      
      if (err.code === 'INSUFFICIENT_FUNDS') {
        throw new Error('Insufficient funds for gas fees');
      } else if (err.code === 'USER_REJECTED' || err.code === 4001) {
        throw new Error('Transaction was rejected by user');
      } else {
        throw new Error(`Minting failed: ${err.message || err}`);
      }
    }
  }

  /**
   * List NFT for sale - Requires listing fee payment
   */
  public async listNFTForSale(
    tokenId: number,
    price: string
  ): Promise<string> {
    await this.ensureConnection();

    try {
      const listingPriceEth = await this.getListingPrice();
      const listingPrice = ethers.parseEther(listingPriceEth);
      const priceInWei = ethers.parseEther(price);

      console.log('Listing NFT for sale...', {
        tokenId,
        price: priceInWei.toString(),
        listingFee: listingPrice.toString()
      });

      let gasEstimate: bigint;
      try {
        gasEstimate = await this.contract!.listNFTForSale.estimateGas(
          tokenId,
          priceInWei,
          { value: listingPrice }
        );
      } catch (gasError) {
        const error = gasError as EthereumError;
        console.error('Gas estimation failed:', error);
        throw new Error(`Listing will fail: ${error.reason || error.message}`);
      }

      const balance = await this.provider!.getBalance(await this.signer!.getAddress());
      const requiredAmount = listingPrice + (gasEstimate * BigInt(2000000000));
      
      if (balance < requiredAmount) {
        throw new Error(`Insufficient ETH. Need ~${ethers.formatEther(requiredAmount)} ETH`);
      }

      const transaction: TransactionResponse = await this.contract!.listNFTForSale(
        tokenId,
        priceInWei,
        {
          value: listingPrice,
          gasLimit: (gasEstimate * BigInt(130)) / BigInt(100),
        }
      );

      const receipt = await transaction.wait();
      return receipt!.hash;
    } catch (error) {
      const err = error as EthereumError;
      console.error('Error listing NFT:', err);
      
      if (err.code === 'INSUFFICIENT_FUNDS') {
        throw new Error('Insufficient funds for listing fee and gas');
      } else if (err.code === 'USER_REJECTED' || err.code === 4001) {
        throw new Error('Transaction rejected');
      } else {
        throw new Error(`Listing failed: ${err.message || err}`);
      }
    }
  }

  /**
   * Cancel listing and return NFT to wallet
   */
  public async cancelListing(tokenId: number): Promise<string> {
    await this.ensureConnection();

    try {
      let gasEstimate: bigint;
      try {
        gasEstimate = await this.contract!.cancelListing.estimateGas(tokenId);
      } catch (gasError) {
        const error = gasError as EthereumError;
        throw new Error(`Cancel will fail: ${error.reason || error.message}`);
      }

      const transaction: TransactionResponse = await this.contract!.cancelListing(tokenId, {
        gasLimit: (gasEstimate * BigInt(130)) / BigInt(100),
      });

      const receipt = await transaction.wait();
      return receipt!.hash;
    } catch (error) {
      const err = error as EthereumError;
      console.error('Error canceling listing:', err);
      
      if (err.code === 'USER_REJECTED' || err.code === 4001) {
        throw new Error('Transaction rejected');
      } else {
        throw new Error(`Cancel failed: ${err.message || err}`);
      }
    }
  }

  public async buyNFT(tokenId: number, price: string): Promise<PurchaseResult> {
    await this.ensureConnection();

    try {
      const priceInWei = ethers.parseEther(price);

      let gasEstimate: bigint;
      try {
        gasEstimate = await this.contract!.buyNFT.estimateGas(tokenId, {
          value: priceInWei
        });
      } catch (gasError) {
        const error = gasError as EthereumError;
        console.error('Gas estimation failed:', error);
        throw new Error(`Transaction will fail: ${error.reason || error.message}`);
      }

      const balance = await this.provider!.getBalance(await this.signer!.getAddress());
      const requiredAmount = priceInWei + (gasEstimate * BigInt(2000000000));

      if (balance < requiredAmount) {
        throw new Error(`Insufficient ETH. Need ~${ethers.formatEther(requiredAmount)} ETH`);
      }

      const transaction: TransactionResponse = await this.contract!.buyNFT(tokenId, {
        value: priceInWei,
        gasLimit: (gasEstimate * BigInt(130)) / BigInt(100),
      });

      const receipt = await transaction.wait();
      return { transactionHash: receipt!.hash };
    } catch (error) {
      const err = error as EthereumError;
      console.error('Error buying NFT:', err);

      if (err.code === 'INSUFFICIENT_FUNDS') {
        throw new Error('Insufficient funds');
      } else if (err.code === 'USER_REJECTED' || err.code === 4001) {
        throw new Error('Transaction rejected');
      } else if (err.message?.includes('already sold')) {
        throw new Error('NFT already sold');
      } else {
        throw new Error(`Purchase failed: ${err.message || err}`);
      }
    }
  }

  public async likeNFT(tokenId: number): Promise<string> {
    await this.ensureConnection();

    try {
      let gasEstimate: bigint;
      try {
        gasEstimate = await this.contract!.likeNFT.estimateGas(tokenId);
      } catch (gasError) {
        const error = gasError as EthereumError;
        if (error.reason?.includes('Already liked')) {
          throw new Error('You have already liked this NFT');
        }
        throw new Error(`Like will fail: ${error.reason || error.message}`);
      }

      const transaction: TransactionResponse = await this.contract!.likeNFT(tokenId, {
        gasLimit: (gasEstimate * BigInt(130)) / BigInt(100),
      });

      const receipt = await transaction.wait();
      return receipt!.hash;
    } catch (error) {
      const err = error as EthereumError;
      console.error('Error liking NFT:', err);

      if (err.code === 'USER_REJECTED' || err.code === 4001) {
        throw new Error('Transaction rejected');
      } else {
        throw new Error(`Like failed: ${err.message || err}`);
      }
    }
  }

  public async unlikeNFT(tokenId: number): Promise<string> {
    await this.ensureConnection();

    try {
      let gasEstimate: bigint;
      try {
        gasEstimate = await this.contract!.unlikeNFT.estimateGas(tokenId);
      } catch (gasError) {
        const error = gasError as EthereumError;
        if (error.reason?.includes('Not liked')) {
          throw new Error('You have not liked this NFT yet');
        }
        throw new Error(`Unlike will fail: ${error.reason || error.message}`);
      }

      const transaction: TransactionResponse = await this.contract!.unlikeNFT(tokenId, {
        gasLimit: (gasEstimate * BigInt(130)) / BigInt(100),
      });

      const receipt = await transaction.wait();
      return receipt!.hash;
    } catch (error) {
      const err = error as EthereumError;
      console.error('Error unliking NFT:', err);

      if (err.code === 'USER_REJECTED' || err.code === 4001) {
        throw new Error('Transaction rejected');
      } else {
        throw new Error(`Unlike failed: ${err.message || err}`);
      }
    }
  }

  private async extractTokenIdFromReceipt(receipt: TransactionReceipt): Promise<number> {
    try {
      const event = receipt.logs.find((log: Log) => {
        try {
          const parsedLog = this.contract!.interface.parseLog(log);
          return parsedLog?.name === "NFTMinted";
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
        console.warn("Could not get total tokens for token ID fallback:", fallbackError);
      }

      return 0;
    } catch (error) {
      console.error("Error extracting token ID:", error);
      return 0;
    }
  }

  public async hasLikedNFT(tokenId: number, userAddress: string): Promise<boolean> {
    try {
      const contract = this.contract || this.readOnlyContract;
      if (!contract) {
        await this.initializeReadOnlyProvider();
      }

      const finalContract = this.contract || this.readOnlyContract;
      if (!finalContract) {
        throw new Error('Contract not initialized');
      }

      return await finalContract.tokenLikes(tokenId, userAddress);
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
      if (!finalContract) {
        throw new Error('Contract not initialized');
      }

      const items: ContractMarketItem[] = await finalContract.fetchMarketItems();
      return items.map((item: ContractMarketItem) => ({
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
      const items: ContractMarketItem[] = await this.contract.fetchMyNFTs();
      return items.map((item: ContractMarketItem) => ({
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
      const items: ContractMarketItem[] = await this.contract.fetchItemsListed();
      return items.map((item: ContractMarketItem) => ({
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
      if (!finalContract) {
        throw new Error('Contract not initialized');
      }

      const tokenURI = await finalContract.tokenURI(tokenId);
      const response = await fetch(tokenURI);
      
      if (!response.ok) {
        throw new Error("Failed to fetch metadata");
      }
      
      return await response.json() as NFTMetadata;
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
      if (!finalContract) {
        throw new Error('Contract not initialized');
      }

      const item: ContractMarketItem = await finalContract.getMarketItem(tokenId);
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
    onNFTMinted?: (tokenId: number, owner: string, tokenURI: string, category: string) => void;
    onMarketItemListed?: (tokenId: number, seller: string, price: string, category: string) => void;
    onMarketItemSold?: (tokenId: number, seller: string, buyer: string, price: string) => void;
    onNFTLiked?: (tokenId: number, liker: string) => void;
    onNFTUnliked?: (tokenId: number, unliker: string) => void;
  }): void {
    const contract = this.contract || this.readOnlyContract;
    if (!contract) {
      console.warn("Contract not initialized for event listeners");
      return;
    }

    if (callbacks.onNFTMinted) {
      contract.on("NFTMinted", (tokenId: bigint, owner: string, tokenURI: string, category: string) => {
        callbacks.onNFTMinted!(Number(tokenId), owner, tokenURI, category);
      });
    }

    if (callbacks.onMarketItemListed) {
      contract.on("MarketItemListed", (tokenId: bigint, seller: string, price: bigint, category: string) => {
        callbacks.onMarketItemListed!(Number(tokenId), seller, ethers.formatEther(price), category);
      });
    }

    if (callbacks.onMarketItemSold) {
      contract.on("MarketItemSold", (tokenId: bigint, seller: string, buyer: string, price: bigint) => {
        callbacks.onMarketItemSold!(Number(tokenId), seller, buyer, ethers.formatEther(price));
      });
    }

    if (callbacks.onNFTLiked) {
      contract.on("NFTLiked", (tokenId: bigint, liker: string) => {
        callbacks.onNFTLiked!(Number(tokenId), liker);
      });
    }

    if (callbacks.onNFTUnliked) {
      contract.on("NFTUnliked", (tokenId: bigint, unliker: string) => {
        callbacks.onNFTUnliked!(Number(tokenId), unliker);
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
        return { chainId: Number(network.chainId), name: network.name };
      }
      return null;
    } catch (error) {
      console.error('Error getting current network:', error);
      return null;
    }
  }

  public getNetworkConfig(): NetworkConfig {
    return this.currentNetwork;
  }

  public async getContractBalance(): Promise<string> {
    try {
      const contract = this.contract || this.readOnlyContract;
      if (!contract) {
        await this.initializeReadOnlyProvider();
      }

      const finalContract = this.contract || this.readOnlyContract;
      if (!finalContract) {
        throw new Error('Contract not initialized');
      }

      const balance = await finalContract.getContractBalance();
      return ethers.formatEther(balance);
    } catch (error) {
      console.error("Error getting contract balance:", error);
      return "0";
    }
  }

  public async getTotalFeesCollected(): Promise<string> {
    try {
      const contract = this.contract || this.readOnlyContract;
      if (!contract) {
        await this.initializeReadOnlyProvider();
      }

      const finalContract = this.contract || this.readOnlyContract;
      if (!finalContract) {
        throw new Error('Contract not initialized');
      }

      const fees = await finalContract.getTotalFeesCollected();
      return ethers.formatEther(fees);
    } catch (error) {
      console.error("Error getting total fees:", error);
      return "0";
    }
  }

  // Add these methods to the BlockchainService class

public async withdrawFees(): Promise<string> {
  await this.ensureConnection();

  try {
    let gasEstimate: bigint;
    try {
      gasEstimate = await this.contract!.withdrawFees.estimateGas();
    } catch (gasError) {
      const error = gasError as EthereumError;
      throw new Error(`Withdrawal will fail: ${error.reason || error.message}`);
    }

    const transaction: TransactionResponse = await this.contract!.withdrawFees({
      gasLimit: (gasEstimate * BigInt(130)) / BigInt(100),
    });

    const receipt = await transaction.wait();
    return receipt!.hash;
  } catch (error) {
    const err = error as EthereumError;
    console.error('Error withdrawing fees:', err);
    
    if (err.code === 'USER_REJECTED' || err.code === 4001) {
      throw new Error('Transaction rejected');
    } else {
      throw new Error(`Withdrawal failed: ${err.message || err}`);
    }
  }
}

public async withdrawAmount(amount: string): Promise<string> {
  await this.ensureConnection();

  try {
    const amountInWei = ethers.parseEther(amount);

    let gasEstimate: bigint;
    try {
      gasEstimate = await this.contract!.withdrawAmount.estimateGas(amountInWei);
    } catch (gasError) {
      const error = gasError as EthereumError;
      throw new Error(`Withdrawal will fail: ${error.reason || error.message}`);
    }

    const transaction: TransactionResponse = await this.contract!.withdrawAmount(
      amountInWei,
      {
        gasLimit: (gasEstimate * BigInt(130)) / BigInt(100),
      }
    );

    const receipt = await transaction.wait();
    return receipt!.hash;
  } catch (error) {
    const err = error as EthereumError;
    console.error('Error withdrawing amount:', err);
    
    if (err.code === 'USER_REJECTED' || err.code === 4001) {
      throw new Error('Transaction rejected');
    } else {
      throw new Error(`Withdrawal failed: ${err.message || err}`);
    }
  }
}

public async updateListingPrice(newPrice: string): Promise<string> {
  await this.ensureConnection();

  try {
    const priceInWei = ethers.parseEther(newPrice);

    let gasEstimate: bigint;
    try {
      gasEstimate = await this.contract!.updateListingPrice.estimateGas(priceInWei);
    } catch (gasError) {
      const error = gasError as EthereumError;
      throw new Error(`Update will fail: ${error.reason || error.message}`);
    }

    const transaction: TransactionResponse = await this.contract!.updateListingPrice(
      priceInWei,
      {
        gasLimit: (gasEstimate * BigInt(130)) / BigInt(100),
      }
    );

    const receipt = await transaction.wait();
    return receipt!.hash;
  } catch (error) {
    const err = error as EthereumError;
    console.error('Error updating listing price:', err);
    
    if (err.code === 'USER_REJECTED' || err.code === 4001) {
      throw new Error('Transaction rejected');
    } else {
      throw new Error(`Update failed: ${err.message || err}`);
    }
  }
}
}

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

export const switchNetwork = async (chainId: number): Promise<void> => {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error("MetaMask is not installed");
  }

  try {
    const hexChainId = `0x${chainId.toString(16)}`;
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: hexChainId }],
    });
  } catch (error) {
    const err = error as EthereumError;
    if (err.code === 4902) {
      throw new Error("Network not added to MetaMask");
    }
    throw error;
  }
};