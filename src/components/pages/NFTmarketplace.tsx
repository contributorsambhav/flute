"use client";
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Eye, Heart } from "lucide-react";
import { blockchainService } from "@/lib/blockchain";
import { formatAddress } from "@/lib/blockchain";
interface NFT {
  id: number;
  title: string;
  description: string;
  image: string;
  price: string;
  creator: string;
  likes: number;
  category: string;
  tokenId: number;
  owner: string;
  sold: boolean;
  rawPrice: string;
  attributes?: Array<{
    trait_type: string;
    value: string;
  }>;
}
type Category =
  | "all"
  | "ai-generated"
  | "abstract"
  | "cyberpunk"
  | "nature"
  | "uploaded";
interface NFTMarketplaceProps {
  isConnected: boolean;
  account: string;
}
const NFTMarketplace: React.FC<NFTMarketplaceProps> = ({
  isConnected,
  account,
}) => {
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<Category>("all");
  const [loading, setLoading] = useState<boolean>(true);
  const [likedNFTs, setLikedNFTs] = useState<Set<number>>(new Set());
  const [buyingNFT, setBuyingNFT] = useState<number | null>(null);
  const [likingNFT, setLikingNFT] = useState<number | null>(null);
  useEffect(() => {
    loadNFTs();
  }, []);
  useEffect(() => {
    if (isConnected && account) {
      initializeBlockchainConnection();
    }
  }, [isConnected, account]);
  useEffect(() => {
    if (isConnected && account && nfts.length > 0) {
      loadLikedNFTs();
    }
  }, [isConnected, account, nfts]);
  const initializeBlockchainConnection = async (): Promise<void> => {
    try {
      const isWalletConnected = await blockchainService.isWalletConnected();
      if (!isWalletConnected) {
        console.log("Wallet not connected in blockchain service, attempting to connect...");
        await blockchainService.connectWallet();
      }
      const currentAccount = await blockchainService.getCurrentAccount();
      if (currentAccount?.toLowerCase() !== account?.toLowerCase()) {
        console.log("Account mismatch, reconnecting...");
        await blockchainService.connectWallet();
      }
    } catch (error) {
      console.error("Error initializing blockchain connection:", error);
    }
  };
  const loadNFTs = async (): Promise<void> => {
    try {
      setLoading(true);
      const MarketItems = await blockchainService.fetchMarketItems();
      console.log("Market Items:", MarketItems);
      const itemWithMetadata = await Promise.all(
        MarketItems.map(async (item: any) => {
          const metadata = await blockchainService.getTokenMetadata(item.tokenId);
          return { ...item, metadata };
        })
      );
      console.log("Items with metadata:", itemWithMetadata);
      const transformedNFTs: NFT[] = itemWithMetadata
        .filter(item => !item.sold) 
        .map((item: any) => ({
          id: item.tokenId,
          title: item.metadata?.name || `NFT #${item.tokenId}`,
          description: item.metadata?.description || "No description available",
          image: item.metadata?.image || "/placeholder-nft.png",
          price: `${item.price} ETH`,
          creator: item.seller,
          likes: item.likes,
          category: item.category,
          tokenId: item.tokenId,
          owner: item.owner,
          sold: item.sold,
          rawPrice: item.price,
          attributes: item.metadata?.attributes || []
        }));
      console.log("Transformed NFTs:", transformedNFTs);
      setNfts(transformedNFTs);
    } catch (error) {
      console.error("Error loading NFTs:", error);
      alert("Failed to load NFTs. Please try again.");
    } finally {
      setLoading(false);
    }
  };
  const loadLikedNFTs = async (): Promise<void> => {
    if (!account) return;
    try {
      const liked = new Set<number>();
      for (const nft of nfts) {
        const hasLiked = await blockchainService.hasLikedNFT(nft.tokenId, account);
        if (hasLiked) {
          liked.add(nft.tokenId);
        }
      }
      setLikedNFTs(liked);
    } catch (error) {
      console.error("Error loading liked NFTs:", error);
    }
  };
  const buyNFT = async (nft: NFT): Promise<void> => {
    if (!isConnected) {
      alert("Please connect your wallet first");
      return;
    }
    if (!nft.tokenId) {
      alert("Unable to purchase NFT - invalid token ID");
      return;
    }
    try {
      setBuyingNFT(nft.tokenId);
      console.log("Buying NFT:", nft.tokenId, "Price:", nft.rawPrice);
      const isWalletConnected = await blockchainService.isWalletConnected();
      if (!isWalletConnected) {
        console.log("Wallet not connected, attempting to connect...");
        await blockchainService.connectWallet();
      }
      const result = await blockchainService.buyNFT(nft.tokenId, nft.rawPrice);
      alert(`NFT purchased successfully! Transaction hash: ${result.transactionHash}`);
      await loadNFTs();
    } catch (error) {
      console.error("Error buying NFT:", error);
      alert(`Error purchasing NFT: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setBuyingNFT(null);
    }
  };
  const toggleLikeNFT = async (nft: NFT): Promise<void> => {
    if (!isConnected) {
      alert("Please connect your wallet to like NFTs");
      return;
    }
    try {
      setLikingNFT(nft.tokenId);
      const isWalletConnected = await blockchainService.isWalletConnected();
      if (!isWalletConnected) {
        console.log("Wallet not connected, attempting to connect...");
        await blockchainService.connectWallet();
      }
      const hasLiked = likedNFTs.has(nft.tokenId);
      if (hasLiked) {
        await blockchainService.unlikeNFT(nft.tokenId);
        setLikedNFTs(prev => {
          const newSet = new Set(prev);
          newSet.delete(nft.tokenId);
          return newSet;
        });
        setNfts(prevNfts =>
          prevNfts.map(n =>
            n.tokenId === nft.tokenId
              ? { ...n, likes: Math.max(0, n.likes - 1) }
              : n
          )
        );
      } else {
        await blockchainService.likeNFT(nft.tokenId);
        setLikedNFTs(prev => new Set(prev).add(nft.tokenId));
        setNfts(prevNfts =>
          prevNfts.map(n =>
            n.tokenId === nft.tokenId
              ? { ...n, likes: n.likes + 1 }
              : n
          )
        );
      }
    } catch (error) {
      console.error("Error toggling like:", error);
      alert(`Error ${likedNFTs.has(nft.tokenId) ? 'unliking' : 'liking'} NFT: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setLikingNFT(null);
    }
  };
  const handleCategoryChange = (value: string): void => {
    setSelectedCategory(value as Category);
  };
  const filteredNFTs: NFT[] = nfts.filter((nft: NFT) => {
    const matchesSearch =
      nft.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      nft.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === "all" || nft.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-white text-lg">Loading NFTs...</div>
      </div>
    );
  }
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <Input
          placeholder="Search NFTs..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 bg-white/10 border-white/20 text-white placeholder:text-white/60"
        />
        <Select value={selectedCategory} onValueChange={handleCategoryChange}>
          <SelectTrigger className="w-full sm:w-48 bg-white/10 border-white/20 text-white">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent className="bg-neutral-800 border border-neutral-700 text-white">
            <SelectItem
              value="all"
              className="focus:bg-neutral-700 focus:text-white cursor-pointer"
            >
              All Categories
            </SelectItem>
            <SelectItem
              value="ai-generated"
              className="focus:bg-neutral-700 focus:text-white cursor-pointer"
            >
              AI Generated
            </SelectItem>
            <SelectItem
              value="uploaded"
              className="focus:bg-neutral-700 focus:text-white cursor-pointer"
            >
              Uploaded
            </SelectItem>
            <SelectItem
              value="abstract"
              className="focus:bg-neutral-700 focus:text-white cursor-pointer"
            >
              Abstract
            </SelectItem>
            <SelectItem
              value="cyberpunk"
              className="focus:bg-neutral-700 focus:text-white cursor-pointer"
            >
              Cyberpunk
            </SelectItem>
            <SelectItem
              value="nature"
              className="focus:bg-neutral-700 focus:text-white cursor-pointer"
            >
              Nature
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
      {filteredNFTs.length === 0 ? (
        <div className="text-center text-white/70 py-12">
          <p className="text-lg">No NFTs found matching your criteria.</p>
          <p className="text-sm mt-2">Try adjusting your search or category filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredNFTs.map((nft: NFT) => (
            <div
              key={nft.id}
              className="bg-white/5 rounded-lg p-2 border border-white/20 hover:bg-white/10 transition-all duration-300 group"
            >
              <div className="p-0">
                <div className="relative overflow-hidden rounded-xl">
                  <img
                    src={nft.image}
                    alt={nft.title}
                    className="w-full h-64 object-cover group-hover:scale-105 transition-all duration-300 ease-out"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = "/placeholder-nft.png";
                    }}
                  />
                </div>
              </div>
              <div className="p-4">
                <div className="text-white text-lg font-semibold mb-2 truncate">
                  {nft.title}
                </div>
                <div className="text-white/70 text-sm mb-3 line-clamp-2">
                  {nft.description}
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-neutral-200 font-semibold">
                    {nft.price}
                  </span>
                  <button
                    onClick={() => toggleLikeNFT(nft)}
                    disabled={!isConnected || likingNFT === nft.tokenId}
                    className="flex items-center space-x-1 hover:scale-110 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Heart 
                      className={`h-4 w-4 ${
                        likedNFTs.has(nft.tokenId) 
                          ? "text-red-500 fill-red-500" 
                          : "text-red-400"
                      } ${likingNFT === nft.tokenId ? "animate-pulse" : ""}`} 
                    />
                    <span className="text-white/70 text-sm">{nft.likes}</span>
                  </button>
                </div>
                <p className="text-white/60 text-xs truncate">
                  by {formatAddress ? formatAddress(nft.creator) : nft.creator}
                </p>
              </div>
              <div className="p-4 pt-0">
                <Button
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => buyNFT(nft)}
                  disabled={!isConnected || buyingNFT === nft.tokenId || nft.owner.toLowerCase() === account?.toLowerCase()}
                >
                  {buyingNFT === nft.tokenId ? (
                    "Processing..."
                  ) : nft.owner.toLowerCase() === account?.toLowerCase() ? (
                    "You Own This"
                  ) : (
                    "Buy Now"
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
export default NFTMarketplace;