'use client';

import { ExternalLink, Heart, Loader2 } from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';

import { Button } from '@/app/components/ui/button';
import Image from 'next/image';
import { Input } from '@/app/components/ui/input';
import { blockchainService } from '@/lib/blockchain';
import { formatAddress } from '@/lib/blockchain';
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
  attributes?: Array<{
    trait_type: string;
    value: string;
  }>;
}

interface MarketItem {
  tokenId: number;
  seller: string;
  owner: string;
  price: string;
  sold: boolean;
  likes: number;
  category: string;
  metadata?: {
    name?: string;
    description?: string;
    image?: string;
    attributes?: Array<{
      trait_type: string;
      value: string;
    }>;
  } | null;
}

type Category = 'all' | 'ai-generated' | 'abstract' | 'cyberpunk' | 'nature' | 'uploaded';

interface NFTMarketplaceProps {
  isConnected: boolean;
  account: string;
  currentChainId: number;
}

const NFTMarketplace: React.FC<NFTMarketplaceProps> = ({ isConnected, account, currentChainId }) => {
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category>('all');
  const [loading, setLoading] = useState(true);
  const [likedNFTs, setLikedNFTs] = useState<Set<number>>(new Set());
  const [buyingNFT, setBuyingNFT] = useState<number | null>(null);
  const [likingNFT, setLikingNFT] = useState<number | null>(null);
  const [imageErrors, setImageErrors] = useState<Set<number>>(new Set());

  const networkConfig = getNetworkConfig(currentChainId);
  const networkSymbol = networkConfig?.symbol || 'ETH';

  const loadNFTs = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      const marketItems = await blockchainService.fetchMarketItems();
      console.log('Market Items:', marketItems);

      if (!marketItems || marketItems.length === 0) {
        setNfts([]);
        return;
      }

      const itemsWithMetadata = await Promise.allSettled(
        marketItems.map(async (item: MarketItem) => {
          try {
            const metadata = await blockchainService.getTokenMetadata(item.tokenId);
            return { ...item, metadata: metadata || null };
          } catch (error) {
            console.error(`Error loading metadata for token ${item.tokenId}:`, error);
            return { ...item, metadata: null };
          }
        })
      );

      const validItems = itemsWithMetadata
        .filter((result) => result.status === 'fulfilled')
        .map((result) => (result as PromiseFulfilledResult<MarketItem>).value);

      console.log('Items with metadata:', validItems);

      const transformedNFTs: NFT[] = validItems
        .filter((item) => !item.sold)
        .map((item: MarketItem) => ({
          id: item.tokenId,
          title: item.metadata?.name || `NFT #${item.tokenId}`,
          description: item.metadata?.description || 'No description available',
          image: item.metadata?.image || '/placeholder-nft.png',
          price: `${item.price} ${networkSymbol}`,
          creator: item.seller,
          likes: item.likes,
          category: item.category || 'uncategorized',
          tokenId: item.tokenId,
          owner: item.owner,
          sold: item.sold,
          rawPrice: item.price,
          attributes: item.metadata?.attributes || []
        }));

      console.log('Transformed NFTs:', transformedNFTs);
      setNfts(transformedNFTs);
    } catch (error) {
      console.error('Error loading NFTs:', error);
      setNfts([]);
    } finally {
      setLoading(false);
    }
  }, [networkSymbol]);

  const loadLikedNFTs = useCallback(async (): Promise<void> => {
    if (!account || nfts.length === 0) return;

    try {
      const liked = new Set<number>();
      
      await Promise.allSettled(
        nfts.map(async (nft) => {
          try {
            const hasLiked = await blockchainService.hasLikedNFT(nft.tokenId, account);
            if (hasLiked) {
              liked.add(nft.tokenId);
            }
          } catch (error) {
            console.error(`Error checking like status for token ${nft.tokenId}:`, error);
          }
        })
      );
      
      setLikedNFTs(liked);
    } catch (error) {
      console.error('Error loading liked NFTs:', error);
    }
  }, [account, nfts]);

  useEffect(() => {
    loadNFTs();
  }, [loadNFTs, currentChainId]);

  useEffect(() => {
    if (isConnected && account && nfts.length > 0) {
      loadLikedNFTs();
    }
  }, [isConnected, account, nfts.length, loadLikedNFTs]);

  const buyNFT = async (nft: NFT): Promise<void> => {
    if (!isConnected) {
      alert('Please connect your wallet first');
      return;
    }

    if (!nft.tokenId) {
      alert('Unable to purchase NFT - invalid token ID');
      return;
    }

    const confirmed = window.confirm(
      `Purchase NFT "${nft.title}" for ${nft.price}?\n\n` +
      `You will pay: ${nft.rawPrice} ${networkSymbol}\n\n` +
      `Do you want to proceed?`
    );

    if (!confirmed) return;

    try {
      setBuyingNFT(nft.tokenId);
      console.log('Buying NFT:', nft.tokenId, 'Price:', nft.rawPrice);

      const result = await blockchainService.buyNFT(nft.tokenId, nft.rawPrice);
      
      alert(
        `NFT purchased successfully!\n\n` +
        `Transaction Hash: ${result.transactionHash}\n\n` +
        `You can view it on ${networkConfig?.blockExplorer}/tx/${result.transactionHash}`
      );
      
      await loadNFTs();
    } catch (error) {
      console.error('Error buying NFT:', error);
      alert(`Error purchasing NFT: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setBuyingNFT(null);
    }
  };

  const toggleLikeNFT = async (nft: NFT): Promise<void> => {
    if (!isConnected) {
      alert('Please connect your wallet to like NFTs');
      return;
    }

    try {
      setLikingNFT(nft.tokenId);

      const hasLiked = likedNFTs.has(nft.tokenId);

      if (hasLiked) {
        await blockchainService.unlikeNFT(nft.tokenId);
        setLikedNFTs((prev) => {
          const newSet = new Set(prev);
          newSet.delete(nft.tokenId);
          return newSet;
        });
        setNfts((prevNfts) =>
          prevNfts.map((n) => (n.tokenId === nft.tokenId ? { ...n, likes: Math.max(0, n.likes - 1) } : n))
        );
      } else {
        await blockchainService.likeNFT(nft.tokenId);
        setLikedNFTs((prev) => new Set(prev).add(nft.tokenId));
        setNfts((prevNfts) =>
          prevNfts.map((n) => (n.tokenId === nft.tokenId ? { ...n, likes: n.likes + 1 } : n))
        );
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      alert(
        `Error ${likedNFTs.has(nft.tokenId) ? 'unliking' : 'liking'} NFT: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    } finally {
      setLikingNFT(null);
    }
  };

  const handleCategoryChange = (value: string): void => {
    setSelectedCategory(value as Category);
  };

  const handleImageError = (tokenId: number) => {
    setImageErrors(prev => new Set(prev).add(tokenId));
  };

  const filteredNFTs: NFT[] = nfts.filter((nft: NFT) => {
    const matchesSearch =
      nft.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      nft.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || nft.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-white text-xl flex items-center space-x-3">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Loading NFTs...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row gap-4">
        <Input
          type="text"
          placeholder="Search NFTs..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 bg-white/10 border-white/20 text-white placeholder:text-white/60"
        />
        <Select value={selectedCategory} onValueChange={handleCategoryChange}>
          <SelectTrigger className="w-full sm:w-[200px] bg-white/10 border-white/20 text-white">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent className="bg-neutral-800 border-neutral-700 text-white">
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="ai-generated">AI Generated</SelectItem>
            <SelectItem value="uploaded">Uploaded</SelectItem>
            <SelectItem value="abstract">Abstract</SelectItem>
            <SelectItem value="cyberpunk">Cyberpunk</SelectItem>
            <SelectItem value="nature">Nature</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filteredNFTs.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-white/60 text-lg mb-2">
            {nfts.length === 0 
              ? "No NFTs listed on the marketplace yet." 
              : "No NFTs found matching your criteria."}
          </p>
          <p className="text-white/40">
            {nfts.length === 0
              ? "Be the first to create and list an NFT!"
              : "Try adjusting your search or category filter."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredNFTs.map((nft: NFT) => (
            <div
              key={nft.tokenId}
              className="bg-white/5 backdrop-blur-lg rounded-xl overflow-hidden border border-white/10 hover:border-white/20 transition-all hover:transform hover:scale-105"
            >
              <div className="relative h-64 bg-white/5">
                {!imageErrors.has(nft.tokenId) ? (
                  <Image
                    src={nft.image}
                    alt={nft.title}
                    fill
                    className="object-cover"
                    unoptimized={nft.image.includes('ipfs') || nft.image.includes('pinata')}
                    onError={() => handleImageError(nft.tokenId)}
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
                    <div className="text-center p-4">
                      <div className="text-white/50 text-4xl mb-2">🖼️</div>
                      <div className="text-white/70 text-sm">Image unavailable</div>
                      {nft.image.includes('ipfs') && (
                        <a 
                          href={nft.image}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 text-xs underline mt-2 inline-block"
                        >
                          View on IPFS
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="p-4 space-y-3">
                <h3 className="text-white font-semibold text-lg truncate">{nft.title}</h3>
                <p className="text-white/60 text-sm line-clamp-2">{nft.description}</p>

                <div className="flex items-center justify-between">
                  <span className="text-white font-bold">{nft.price}</span>
                  <button
                    onClick={() => toggleLikeNFT(nft)}
                    disabled={!isConnected || likingNFT === nft.tokenId}
                    className="flex items-center space-x-1 hover:scale-110 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {likingNFT === nft.tokenId ? (
                      <Loader2 className="w-5 h-5 animate-spin text-red-400" />
                    ) : (
                      <Heart
                        className={`w-5 h-5 ${
                          likedNFTs.has(nft.tokenId) ? 'fill-red-500 text-red-500' : 'text-white/60'
                        }`}
                      />
                    )}
                    <span className="text-white/60 text-sm">{nft.likes}</span>
                  </button>
                </div>

                <p className="text-white/40 text-xs">
                  by {formatAddress(nft.creator)}
                </p>

                <Button
                  onClick={() => buyNFT(nft)}
                  disabled={
                    !isConnected || 
                    buyingNFT === nft.tokenId || 
                    nft.owner.toLowerCase() === account?.toLowerCase()
                  }
                  className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50"
                >
                  {buyingNFT === nft.tokenId ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : nft.owner.toLowerCase() === account?.toLowerCase() ? (
                    'You Own This'
                  ) : (
                    'Buy Now'
                  )}
                </Button>

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
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default NFTMarketplace;