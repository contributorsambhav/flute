'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';

import { Button } from '@/app/components/ui/button';
import { Heart } from 'lucide-react';
import Image from 'next/image';
import { Input } from '@/app/components/ui/input';
import { blockchainService } from '@/lib/blockchain';
import { formatAddress } from '@/lib/blockchain';

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
}

const NFTMarketplace: React.FC<NFTMarketplaceProps> = ({ isConnected, account }) => {
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category>('all');
  const [loading, setLoading] = useState(true);
  const [likedNFTs, setLikedNFTs] = useState<Set<number>>(new Set());
  const [buyingNFT, setBuyingNFT] = useState<number | null>(null);
  const [likingNFT, setLikingNFT] = useState<number | null>(null);

  const loadNFTs = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      const MarketItems = await blockchainService.fetchMarketItems();
      console.log('Market Items:', MarketItems);

      const itemWithMetadata = await Promise.all(
        MarketItems.map(async (item: MarketItem) => {
          const metadata = await blockchainService.getTokenMetadata(item.tokenId);
          return { ...item, metadata };
        })
      );

      console.log('Items with metadata:', itemWithMetadata);

      const transformedNFTs: NFT[] = itemWithMetadata
        .filter((item) => !item.sold)
        .map((item: MarketItem) => ({
          id: item.tokenId,
          title: item.metadata?.name || `NFT #${item.tokenId}`,
          description: item.metadata?.description || 'No description available',
          image: item.metadata?.image || '/placeholder-nft.png',
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

      console.log('Transformed NFTs:', transformedNFTs);
      setNfts(transformedNFTs);
    } catch (error) {
      console.error('Error loading NFTs:', error);
      alert('Failed to load NFTs. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  const initializeBlockchainConnection = useCallback(async (): Promise<void> => {
    try {
      const isWalletConnected = await blockchainService.isWalletConnected();
      if (!isWalletConnected) {
        console.log('Wallet not connected in blockchain service, attempting to connect...');
        await blockchainService.connectWallet();
      }

      const currentAccount = await blockchainService.getCurrentAccount();
      if (currentAccount?.toLowerCase() !== account?.toLowerCase()) {
        console.log('Account mismatch, reconnecting...');
        await blockchainService.connectWallet();
      }
    } catch (error) {
      console.error('Error initializing blockchain connection:', error);
    }
  }, [account]);

  const loadLikedNFTs = useCallback(async (): Promise<void> => {
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
      console.error('Error loading liked NFTs:', error);
    }
  }, [account, nfts]);

  useEffect(() => {
    loadNFTs();
  }, [loadNFTs]);

  useEffect(() => {
    if (isConnected && account) {
      initializeBlockchainConnection();
    }
  }, [isConnected, account, initializeBlockchainConnection]);

  useEffect(() => {
    if (isConnected && account && nfts.length > 0) {
      loadLikedNFTs();
    }
  }, [isConnected, account, nfts, loadLikedNFTs]);

  const buyNFT = async (nft: NFT): Promise<void> => {
    if (!isConnected) {
      alert('Please connect your wallet first');
      return;
    }

    if (!nft.tokenId) {
      alert('Unable to purchase NFT - invalid token ID');
      return;
    }

    try {
      setBuyingNFT(nft.tokenId);
      console.log('Buying NFT:', nft.tokenId, 'Price:', nft.rawPrice);

      const isWalletConnected = await blockchainService.isWalletConnected();
      if (!isWalletConnected) {
        console.log('Wallet not connected, attempting to connect...');
        await blockchainService.connectWallet();
      }

      const result = await blockchainService.buyNFT(nft.tokenId, nft.rawPrice);
      alert(`NFT purchased successfully! Transaction hash: ${result.transactionHash}`);
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

      const isWalletConnected = await blockchainService.isWalletConnected();
      if (!isWalletConnected) {
        console.log('Wallet not connected, attempting to connect...');
        await blockchainService.connectWallet();
      }

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
        <div className="text-white text-xl">Loading NFTs...</div>
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
          <SelectContent>
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
          <p className="text-white/60 text-lg mb-2">No NFTs found matching your criteria.</p>
          <p className="text-white/40">Try adjusting your search or category filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredNFTs.map((nft: NFT) => (
            <div
              key={nft.tokenId}
              className="bg-white/5 backdrop-blur-lg rounded-xl overflow-hidden border border-white/10 hover:border-white/20 transition-all hover:transform hover:scale-105"
            >
              <div className="relative h-64 bg-white/5">
                <Image
                  src={nft.image}
                  alt={nft.title}
                  fill
                  className="object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = '/placeholder-nft.png';
                  }}
                />
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
                    <Heart
                      className={`w-5 h-5 ${
                        likedNFTs.has(nft.tokenId) ? 'fill-red-500 text-red-500' : 'text-white/60'
                      }`}
                    />
                    <span className="text-white/60 text-sm">{nft.likes}</span>
                  </button>
                </div>

                <p className="text-white/40 text-xs">
                  by {formatAddress ? formatAddress(nft.creator) : nft.creator}
                </p>

                <Button
                  onClick={() => buyNFT(nft)}
                  disabled={
                    !isConnected || buyingNFT === nft.tokenId || nft.owner.toLowerCase() === account?.toLowerCase()
                  }
                  className="w-full"
                >
                  {buyingNFT === nft.tokenId
                    ? 'Processing...'
                    : nft.owner.toLowerCase() === account?.toLowerCase()
                    ? 'You Own This'
                    : 'Buy Now'}
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