"use client";

import { AlertCircle, ExternalLink, Heart, Loader2, ShoppingCart, X } from "lucide-react";
import { Card, CardContent } from '@/app/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/app/components/ui/dialog';
import React, { useCallback, useEffect, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";

import { Button } from "@/app/components/ui/button";
import Image from "next/image";
import { Input } from "@/app/components/ui/input";
import { blockchainService } from "@/lib/blockchain";
import { getNetworkConfig } from '@/lib/networks';

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
  isListed: boolean;
  attributes?: Array<{
    trait_type: string;
    value: string;
  }>;
}

interface MyNFTsProps {
  isConnected: boolean;
  account: string;
  currentChainId: number;
}

interface BlockchainItem {
  tokenId: number;
  seller: string;
  owner: string;
  price: string;
  sold: boolean;
  likes: number;
  category?: string;
}

interface TokenMetadata {
  name?: string;
  description?: string;
  image?: string;
  attributes?: Array<{
    trait_type: string;
    value: string;
  }>;
}

interface ItemWithMetadata extends BlockchainItem {
  metadata: TokenMetadata | null;
}

const MyNFTs: React.FC<MyNFTsProps> = ({ isConnected, account, currentChainId }) => {
  const [ownedNFTs, setOwnedNFTs] = useState<NFT[]>([]);
  const [listedNFTs, setListedNFTs] = useState<NFT[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<"owned" | "listed">("owned");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [likedNFTs, setLikedNFTs] = useState<Set<number>>(new Set());
  const [likingNFT, setLikingNFT] = useState<number | null>(null);
  const [imageErrors, setImageErrors] = useState<Set<number>>(new Set());
  
  // List for sale modal
  const [listingModalOpen, setListingModalOpen] = useState(false);
  const [selectedNFTForListing, setSelectedNFTForListing] = useState<NFT | null>(null);
  const [listingPrice, setListingPrice] = useState("");
  const [isListing, setIsListing] = useState(false);

  // Cancel listing
  const [cancelingListing, setCancelingListing] = useState<number | null>(null);

  const networkConfig = getNetworkConfig(currentChainId);
  const networkSymbol = networkConfig?.symbol || 'ETH';

  const loadMyNFTs = useCallback(async (): Promise<void> => {
    if (!isConnected || !account) {
      console.log('Wallet not connected, skipping NFT load');
      return;
    }

    try {
      setLoading(true);
      setError("");
      
      console.log('Loading NFTs for account:', account);

      // Fetch owned and listed NFTs
      const [myItems, listedItems] = await Promise.all([
        blockchainService.fetchMyNFTs().catch(err => {
          console.error('Error fetching my NFTs:', err);
          return [];
        }),
        blockchainService.fetchListedItems().catch(err => {
          console.error('Error fetching listed items:', err);
          return [];
        })
      ]);

      console.log('Fetched items:', { myItems, listedItems });

      // Load NFT metadata
      const loadNFTData = async (items: BlockchainItem[], isListed: boolean) => {
        if (!items || items.length === 0) {
          return [];
        }

        const itemsWithMetadata = await Promise.allSettled(
          items.map(async (item): Promise<ItemWithMetadata> => {
            try {
              const metadata = await blockchainService.getTokenMetadata(item.tokenId);
              return { ...item, metadata };
            } catch (err) {
              console.error(`Error loading metadata for token ${item.tokenId}:`, err);
              return { ...item, metadata: null };
            }
          })
        );

        return itemsWithMetadata
          .filter((result): result is PromiseFulfilledResult<ItemWithMetadata> => result.status === 'fulfilled')
          .map(result => result.value)
          .map((item) => ({
            id: item.tokenId,
            title: item.metadata?.name || `NFT #${item.tokenId}`,
            description: item.metadata?.description || "No description available",
            image: item.metadata?.image || "/placeholder-nft.png",
            price: `${item.price} ${networkSymbol}`,
            creator: item.seller,
            likes: item.likes,
            category: item.category || "uncategorized",
            tokenId: item.tokenId,
            owner: item.owner,
            sold: item.sold,
            rawPrice: item.price,
            isListed,
            attributes: item.metadata?.attributes || []
          }));
      };

      const [owned, listed] = await Promise.all([
        loadNFTData(myItems, false),
        loadNFTData(listedItems, true)
      ]);

      console.log('Processed NFTs:', { owned, listed });

      setOwnedNFTs(owned);
      setListedNFTs(listed);
    } catch (error) {
      console.error("Error loading my NFTs:", error);
      setError("Failed to load your NFTs. Please try refreshing the page.");
    } finally {
      setLoading(false);
    }
  }, [isConnected, account, networkSymbol]);

  const loadLikedNFTs = useCallback(async (): Promise<void> => {
    if (!account) return;
    
    try {
      const allNFTs = [...ownedNFTs, ...listedNFTs];
      if (allNFTs.length === 0) return;
      
      const liked = new Set<number>();
      
      await Promise.allSettled(
        allNFTs.map(async (nft) => {
          try {
            const hasLiked = await blockchainService.hasLikedNFT(nft.tokenId, account);
            if (hasLiked) {
              liked.add(nft.tokenId);
            }
          } catch (err) {
            console.error(`Error checking like status for token ${nft.tokenId}:`, err);
          }
        })
      );
      
      setLikedNFTs(liked);
    } catch (error) {
      console.error("Error loading liked NFTs:", error);
    }
  }, [account, ownedNFTs, listedNFTs]);

  useEffect(() => {
    if (isConnected && account) {
      loadMyNFTs();
    } else {
      setOwnedNFTs([]);
      setListedNFTs([]);
      setLoading(false);
    }
  }, [isConnected, account, currentChainId, loadMyNFTs]);

  useEffect(() => {
    if (isConnected && account && (ownedNFTs.length > 0 || listedNFTs.length > 0)) {
      loadLikedNFTs();
    }
  }, [isConnected, account, ownedNFTs.length, listedNFTs.length, loadLikedNFTs]);

  const toggleLikeNFT = async (nft: NFT): Promise<void> => {
    if (!isConnected) {
      alert("Please connect your wallet to like NFTs");
      return;
    }

    try {
      setLikingNFT(nft.tokenId);
      
      const hasLiked = likedNFTs.has(nft.tokenId);
      
      if (hasLiked) {
        await blockchainService.unlikeNFT(nft.tokenId);
        setLikedNFTs(prev => {
          const newSet = new Set(prev);
          newSet.delete(nft.tokenId);
          return newSet;
        });
        
        // Update local likes count
        const updateNFTs = (nfts: NFT[]) => 
          nfts.map(n => n.tokenId === nft.tokenId ? { ...n, likes: n.likes - 1 } : n);
        setOwnedNFTs(updateNFTs);
        setListedNFTs(updateNFTs);
      } else {
        await blockchainService.likeNFT(nft.tokenId);
        setLikedNFTs(prev => new Set(prev).add(nft.tokenId));
        
        // Update local likes count
        const updateNFTs = (nfts: NFT[]) => 
          nfts.map(n => n.tokenId === nft.tokenId ? { ...n, likes: n.likes + 1 } : n);
        setOwnedNFTs(updateNFTs);
        setListedNFTs(updateNFTs);
      }
    } catch (error) {
      console.error("Error toggling like:", error);
      alert(`Error ${likedNFTs.has(nft.tokenId) ? 'unliking' : 'liking'} NFT: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLikingNFT(null);
    }
  };

  const openListingModal = (nft: NFT) => {
    setSelectedNFTForListing(nft);
    setListingPrice("");
    setListingModalOpen(true);
  };

  const handleListForSale = async () => {
    if (!selectedNFTForListing) return;
    
    const price = parseFloat(listingPrice);
    if (isNaN(price) || price <= 0) {
      alert("Please enter a valid price greater than 0");
      return;
    }

    try {
      setIsListing(true);
      
      const listingFee = await blockchainService.getListingPrice();
      
      const confirmed = window.confirm(
        `You will need to pay a listing fee of ${listingFee} ${networkSymbol}.\n\n` +
        `Your NFT will be listed for ${listingPrice} ${networkSymbol}.\n\n` +
        `Do you want to proceed?`
      );
      
      if (!confirmed) {
        setIsListing(false);
        return;
      }

      const txHash = await blockchainService.listNFTForSale(
        selectedNFTForListing.tokenId,
        listingPrice
      );

      alert(
        `NFT listed successfully!\n\n` +
        `Transaction Hash: ${txHash}\n\n` +
        `You can view it on ${networkConfig?.blockExplorer}/tx/${txHash}`
      );
      
      setListingModalOpen(false);
      setSelectedNFTForListing(null);
      setListingPrice("");
      
      // Reload NFTs
      await loadMyNFTs();
    } catch (error) {
      console.error("Error listing NFT:", error);
      alert(`Failed to list NFT: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsListing(false);
    }
  };

  const handleCancelListing = async (nft: NFT) => {
    const confirmed = window.confirm(
      `Are you sure you want to cancel the listing for "${nft.title}"?\n\n` +
      `The NFT will be returned to your wallet.`
    );
    
    if (!confirmed) return;

    try {
      setCancelingListing(nft.tokenId);
      
      const txHash = await blockchainService.cancelListing(nft.tokenId);
      
      alert(
        `Listing canceled successfully!\n\n` +
        `Transaction Hash: ${txHash}\n\n` +
        `Your NFT has been returned to your wallet.`
      );
      
      // Reload NFTs
      await loadMyNFTs();
    } catch (error) {
      console.error("Error canceling listing:", error);
      alert(`Failed to cancel listing: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setCancelingListing(null);
    }
  };

  const handleImageError = (tokenId: number) => {
    setImageErrors(prev => new Set(prev).add(tokenId));
  };

  const currentNFTs = activeTab === "owned" ? ownedNFTs : listedNFTs;
  
  const filteredNFTs: NFT[] = currentNFTs.filter((nft: NFT) => {
    const matchesSearch =
      nft.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      nft.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === "all" || nft.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  if (!isConnected) {
    return (
      <div className="flex flex-col justify-center items-center h-64 text-center">
        <div className="text-white text-xl mb-4">Connect Your Wallet</div>
        <div className="text-white/70">
          Please connect your wallet to view your NFT collection
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-white text-lg flex items-center space-x-3">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Loading your NFTs...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col justify-center items-center h-64 text-center">
        <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
        <div className="text-white text-xl mb-2">Error Loading NFTs</div>
        <div className="text-white/70 mb-4">{error}</div>
        <Button onClick={() => loadMyNFTs()} className="bg-purple-600 hover:bg-purple-700">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Tabs */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">My NFT Collection</h2>
          <p className="text-white/70 text-sm mt-1">
            {ownedNFTs.length} owned • {listedNFTs.length} listed for sale
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant={activeTab === "owned" ? "default" : "outline"}
            onClick={() => setActiveTab("owned")}
            className={activeTab === "owned" ? "bg-purple-600" : "bg-white/10 text-white"}
          >
            Owned ({ownedNFTs.length})
          </Button>
          <Button
            variant={activeTab === "listed" ? "default" : "outline"}
            onClick={() => setActiveTab("listed")}
            className={activeTab === "listed" ? "bg-purple-600" : "bg-white/10 text-white"}
          >
            Listed ({listedNFTs.length})
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <Input
          placeholder="Search your NFTs..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 bg-white/10 border-white/20 text-white placeholder:text-white/60"
        />
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-full sm:w-48 bg-white/10 border-white/20 text-white">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent className="bg-neutral-800 border border-neutral-700 text-white">
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="ai-generated">AI Generated</SelectItem>
            <SelectItem value="uploaded">Uploaded</SelectItem>
            <SelectItem value="abstract">Abstract</SelectItem>
            <SelectItem value="cyberpunk">Cyberpunk</SelectItem>
            <SelectItem value="nature">Nature</SelectItem>
            <SelectItem value="uncategorized">Uncategorized</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* NFT Grid */}
      {filteredNFTs.length === 0 ? (
        <div className="text-center text-white/70 py-12">
          {currentNFTs.length === 0 ? (
            <>
              <p className="text-lg mb-2">
                {activeTab === "owned" 
                  ? "You don't own any NFTs yet" 
                  : "You haven't listed any NFTs for sale"}
              </p>
              <p className="text-sm">
                {activeTab === "owned"
                  ? "Start by purchasing NFTs from the marketplace or creating your own!"
                  : "List your owned NFTs for sale to start earning!"}
              </p>
            </>
          ) : (
            <>
              <p className="text-lg">No NFTs found matching your criteria.</p>
              <p className="text-sm mt-2">Try adjusting your search or category filter.</p>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredNFTs.map((nft: NFT) => (
            <Card key={nft.id} className="bg-white/5 border-white/20 overflow-hidden hover:border-white/40 transition-all">
              <div className="relative">
                {!imageErrors.has(nft.tokenId) ? (
                  <Image
                    src={nft.image}
                    alt={nft.title}
                    width={400}
                    height={256}
                    className="w-full h-64 object-cover"
                    unoptimized={nft.image.includes('ipfs') || nft.image.includes('pinata')}
                    onError={() => handleImageError(nft.tokenId)}
                  />
                ) : (
                  <div className="w-full h-64 bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
                    <div className="text-center p-4">
                      <div className="text-white/50 text-4xl mb-2">🖼️</div>
                      <div className="text-white/70 text-sm">Image unavailable</div>
                    </div>
                  </div>
                )}
                
                <div className="absolute top-2 right-2">
                  {nft.isListed ? (
                    <div className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                      LISTED
                    </div>
                  ) : (
                    <div className="bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                      OWNED
                    </div>
                  )}
                </div>
              </div>

              <CardContent className="p-4 space-y-3">
                <h3 className="text-white text-lg font-semibold truncate">{nft.title}</h3>
                <p className="text-white/70 text-sm line-clamp-2">{nft.description}</p>

                {nft.isListed && (
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded p-2">
                    <p className="text-blue-400 text-xs mb-1">Listed Price</p>
                    <p className="text-white font-bold">{nft.price}</p>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <p className="text-white/60 text-xs truncate">
                    Token #{nft.tokenId}
                  </p>
                  <button
                    onClick={() => toggleLikeNFT(nft)}
                    disabled={likingNFT === nft.tokenId}
                    className="flex items-center space-x-1 hover:scale-110 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {likingNFT === nft.tokenId ? (
                      <Loader2 className="h-4 w-4 animate-spin text-red-400" />
                    ) : (
                      <Heart 
                        className={`h-4 w-4 ${
                          likedNFTs.has(nft.tokenId) 
                            ? "text-red-500 fill-red-500" 
                            : "text-red-400"
                        }`} 
                      />
                    )}
                    <span className="text-white/70 text-sm">{nft.likes}</span>
                  </button>
                </div>

                {/* Action Buttons */}
                {nft.isListed ? (
                  <Button
                    onClick={() => handleCancelListing(nft)}
                    disabled={cancelingListing === nft.tokenId}
                    variant="destructive"
                    className="w-full"
                  >
                    {cancelingListing === nft.tokenId ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Canceling...
                      </>
                    ) : (
                      <>
                        <X className="mr-2 h-4 w-4" />
                        Cancel Listing
                      </>
                    )}
                  </Button>
                ) : (
                  <Button
                    onClick={() => openListingModal(nft)}
                    className="w-full bg-purple-600 hover:bg-purple-700"
                  >
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    List for Sale
                  </Button>
                )}

                {networkConfig && (
                  <a
                    href={`${networkConfig.blockExplorer}/token/${networkConfig.contractAddress}?a=${nft.tokenId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center text-purple-400 hover:text-purple-300 text-sm"
                  >
                    <ExternalLink className="w-3 h-3 mr-1" />
                    View on Explorer
                  </a>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* List for Sale Modal */}
      <Dialog open={listingModalOpen} onOpenChange={setListingModalOpen}>
        <DialogContent className="bg-neutral-900 border-neutral-800 text-white">
          <DialogHeader>
            <DialogTitle>List NFT for Sale</DialogTitle>
            <DialogDescription className="text-white/70">
              Set a price for your NFT to list it on the marketplace
            </DialogDescription>
          </DialogHeader>

          {selectedNFTForListing && (
            <div className="space-y-4">
              <div className="flex items-center space-x-4 p-3 bg-white/5 rounded-lg">
                {!imageErrors.has(selectedNFTForListing.tokenId) ? (
                  <Image
                    src={selectedNFTForListing.image}
                    alt={selectedNFTForListing.title}
                    width={80}
                    height={80}
                    className="rounded object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="w-20 h-20 bg-purple-500/20 rounded flex items-center justify-center">
                    <span className="text-2xl">🖼️</span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h4 className="text-white font-semibold truncate">
                    {selectedNFTForListing.title}
                  </h4>
                  <p className="text-white/60 text-sm">
                    Token ID: #{selectedNFTForListing.tokenId}
                  </p>
                </div>
              </div>

              <div>
                <label className="text-white text-sm font-medium block mb-2">
                  Sale Price ({networkSymbol})
                </label>
                <Input
                  type="number"
                  step="0.001"
                  min="0.001"
                  placeholder="0.1"
                  value={listingPrice}
                  onChange={(e) => setListingPrice(e.target.value)}
                  className="bg-neutral-800 border-neutral-700 text-white"
                />
              </div>

              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-yellow-200">
                    <p className="font-medium mb-1">Listing Fee Required</p>
                    <p>You&apos;ll need to pay a small listing fee to list your NFT for sale. This fee helps maintain the marketplace and goes to the platform.</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setListingModalOpen(false)}
                  className="flex-1 text-black"
                  disabled={isListing}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleListForSale}
                  disabled={isListing || !listingPrice || parseFloat(listingPrice) <= 0}
                  className="flex-1 bg-purple-600 hover:bg-purple-700"
                >
                  {isListing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Listing...
                    </>
                  ) : (
                    'List for Sale'
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MyNFTs;