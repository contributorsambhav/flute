'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Eye, Heart } from 'lucide-react';

interface NFT {
  id: number;
  title: string;
  description: string;
  image: string;
  price: string;
  creator: string;
  likes: number;
  category: string;
  tokenId?: number;
}

type Category = 'all' | 'ai-generated' | 'abstract' | 'cyberpunk' | 'nature' | 'uploaded';

interface NFTMarketplaceProps {
  isConnected: boolean;
  account: string;
}

const NFTMarketplace: React.FC<NFTMarketplaceProps> = ({ isConnected, account }) => {
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<Category>('all');

  const mockNFTs: NFT[] = [
    {
      id: 1,
      title: "Cosmic Wanderer",
      description: "A mystical journey through space and time",
      image: "https://images.unsplash.com/photo-1614730321146-b6fa6a46bcb4?w=400&h=400&fit=crop",
      price: "0.5 ETH",
      creator: "0x742d...35Bd",
      likes: 24,
      category: "ai-generated"
    },
    {
      id: 2,
      title: "Digital Dreams",
      description: "Abstract representation of digital consciousness",
      image: "https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?w=400&h=400&fit=crop",
      price: "1.2 ETH",
      creator: "0x8ba1...f726",
      likes: 42,
      category: "abstract"
    },
    {
      id: 3,
      title: "Neon Cityscape",
      description: "Futuristic city lights in cyberpunk style",
      image: "https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=400&h=400&fit=crop",
      price: "0.8 ETH",
      creator: "0x1f9e...3c2a",
      likes: 37,
      category: "cyberpunk"
    },
    {
      id: 4,
      title: "Ethereal Forest",
      description: "Magical forest with glowing elements",
      image: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400&h=400&fit=crop",
      price: "0.3 ETH",
      creator: "0x5d3b...8e91",
      likes: 18,
      category: "nature"
    }
  ];

  useEffect(() => {
    setNfts(mockNFTs);
    loadNFTs();
  }, []);

  // Load NFTs from API
  const loadNFTs = async (): Promise<void> => {
    try {
      const response = await fetch('/api/nfts');
      if (response.ok) {
        const contractNFTs = await response.json();
        setNfts([...mockNFTs, ...contractNFTs]);
      }
    } catch (error) {
      console.error('Error loading NFTs:', error);
    }
  };

  // Function to buy NFT via API
  const buyNFT = async (nft: NFT): Promise<void> => {
    if (!nft.tokenId) {
      alert("Unable to purchase NFT");
      return;
    }

    try {
      const response = await fetch('/api/buy-nft', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tokenId: nft.tokenId,
          price: nft.price.replace(' ETH', ''),
          buyer: account,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to buy NFT');
      }

      const data = await response.json();
      alert(`NFT purchased successfully! Transaction hash: ${data.transactionHash}`);
      
      // Reload NFTs
      await loadNFTs();
    } catch (error) {
      console.error('Error buying NFT:', error);
      alert(`Error purchasing NFT: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Function to like NFT via API
  const likeNFT = async (tokenId: number): Promise<void> => {
    try {
      const response = await fetch('/api/like-nft', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tokenId }),
      });

      if (response.ok) {
        // Update local state
        setNfts(nfts.map(nft => 
          nft.tokenId === tokenId 
            ? { ...nft, likes: nft.likes + 1 }
            : nft
        ));
      }
    } catch (error) {
      console.error('Error liking NFT:', error);
    }
  };

  const handleCategoryChange = (value: string): void => {
    setSelectedCategory(value as Category);
  };

  const filteredNFTs: NFT[] = nfts.filter((nft: NFT) => {
    const matchesSearch = nft.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         nft.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || nft.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredNFTs.map((nft: NFT) => (
          <Card key={nft.id} className="bg-white/5 border-white/20 hover:bg-white/10 transition-all duration-300 group">
            <CardHeader className="p-0">
              <div className="relative overflow-hidden rounded-t-lg">
                <img
                  src={nft.image}
                  alt={nft.title}
                  className="w-full h-64 object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute top-2 right-2 flex space-x-1">
                  <Button size="sm" variant="ghost" className="bg-black/50 hover:bg-black/70">
                    <Eye className="h-4 w-4 text-white" />
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="bg-black/50 hover:bg-black/70"
                    onClick={() => nft.tokenId && likeNFT(nft.tokenId)}
                  >
                    <Heart className="h-4 w-4 text-white" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              <CardTitle className="text-white text-lg mb-2">{nft.title}</CardTitle>
              <CardDescription className="text-white/70 text-sm mb-3">
                {nft.description}
              </CardDescription>
              <div className="flex justify-between items-center mb-2">
                <span className="text-purple-400 font-semibold">{nft.price}</span>
                <div className="flex items-center space-x-1">
                  <Heart className="h-4 w-4 text-red-400" />
                  <span className="text-white/70 text-sm">{nft.likes}</span>
                </div>
              </div>
              <p className="text-white/60 text-xs">by {nft.creator}</p>
            </CardContent>
            <CardFooter className="p-4 pt-0">
              <Button 
                className="w-full bg-purple-600 hover:bg-purple-700"
                onClick={() => buyNFT(nft)}
                disabled={!isConnected}
              >
                Buy Now
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default NFTMarketplace;