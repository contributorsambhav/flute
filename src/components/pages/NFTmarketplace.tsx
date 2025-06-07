// components/NFTMarketplace.tsx
'use client'; // This directive must be at the very top of the file

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Palette, ShoppingCart, Wallet, Sparkles, Eye, Heart } from 'lucide-react';
import ConnectWalletModal from '../modals/ConnectWallet';
import WalletProfileDropdown from '../modals/WalletProfileDropdown';

// Extend Window interface for ethereum
declare global {
  interface Window {
    ethereum?: any;
  }
}

interface NFT {
  id: number;
  title: string;
  description: string;
  image: string; // This will now store data URLs (base64) for generated images
  price: string;
  creator: string;
  likes: number;
  category: string;
}

type Category = 'all' | 'ai-generated' | 'abstract' | 'cyberpunk' | 'nature';
type ArtStyle = 'realistic' | 'abstract' | 'cyberpunk' | 'fantasy' | 'minimalist';

const NFTMarketplace: React.FC = () => {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [account, setAccount] = useState<string>('');
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [prompt, setPrompt] = useState<string>('');
  const [selectedStyle, setSelectedStyle] = useState<ArtStyle>('realistic');
  // `generatedImage` will store the base64 data URL string received from the API
  const [generatedImage, setGeneratedImage] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<Category>('all');
  const [isWalletModalOpen, setIsWalletModalOpen] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);

  // Mock NFT data (for initial display before AI generation)
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
  }, []);

  const connectWallet = async (walletType: string = 'metamask'): Promise<void> => {
    setIsConnecting(true);
    try {
      if (walletType === 'metamask') {
        if (typeof window !== 'undefined' && window.ethereum) {
          const accounts = await window.ethereum.request({
            method: 'eth_requestAccounts',
          });
          
          if (accounts.length > 0) {
            setIsConnected(true);
            setAccount(accounts[0]);
            setIsWalletModalOpen(false);
          }
        } else {
          alert('Please install MetaMask to connect your wallet.');
        }
      } else {
        // For other wallets, simulate connection
        await new Promise(resolve => setTimeout(resolve, 1500));
        setIsConnected(true);
        setAccount('0x742d35Cc6e8f742d35B...742d35Bd'); // Mock account
        setIsWalletModalOpen(false);
      }
    } catch (error) {
      console.error('Error connecting wallet:', error);
      alert('Failed to connect wallet. Please try again.');
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = (): void => {
    setIsConnected(false);
    setAccount('');
  };

  const generateAIArt = async (): Promise<void> => {
    if (!prompt.trim()) {
      alert("Please enter a description (prompt) for your AI art.");
      return;
    }
    
    setIsGenerating(true);
    setGeneratedImage(''); // Clear any previously generated image

    try {
      // Call your secure backend API route
      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        // Send the prompt and selected style to your backend
        body: JSON.stringify({ prompt, style: selectedStyle }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate image from AI');
      }

      const data = await response.json();
      if (data.imageUrl) {
        setGeneratedImage(data.imageUrl); // Set the base64 data URL from your backend
      } else {
        throw new Error('No image URL received from AI generation. Response missing imageUrl.');
      }
    } catch (error) {
      console.error('Error generating AI art:', error);
      alert(`Error generating AI art: ${error instanceof Error ? error.message : String(error)}. Please try a different prompt or regenerate.`);
    } finally {
      setIsGenerating(false);
    }
  };

  const mintNFT = async (): Promise<void> => {
    if (!generatedImage) {
      alert("Please generate an image first before minting it as an NFT.");
      return;
    }
    if (!isConnected) {
        alert("Please connect your wallet to mint an NFT.");
        return;
    }
    
    try {
      // In a real application, this would involve calling a smart contract
      // on a blockchain (e.g., Ethereum, Polygon) to mint the NFT.
      // You would typically upload the image to IPFS/Arweave and get a URI,
      // then include that URI in your smart contract's minting function.
      
      const newNFT: NFT = {
        id: nfts.length + 1,
        title: prompt.length > 30 ? prompt.slice(0, 30) + "..." : prompt,
        description: `AI generated artwork: "${prompt}" (${selectedStyle} style)`,
        image: generatedImage, // The base64 data URL will be used here
        price: "0.1 ETH", // Mock price
        creator: account, // Connected wallet account
        likes: 0,
        category: "ai-generated"
      };
      
      setNfts([newNFT, ...nfts]); // Add the new NFT to the list
      setPrompt(''); // Clear prompt
      setGeneratedImage(''); // Clear generated image for new creation
      alert("NFT successfully minted locally! (Blockchain interaction simulated)");
    } catch (error) {
      console.error('Error minting NFT:', error);
      alert(`Error minting NFT: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const handleCategoryChange = (value: string): void => {
    setSelectedCategory(value as Category);
  };

  const handleStyleChange = (value: string): void => {
    setSelectedStyle(value as ArtStyle);
  };

  const handlePromptChange = (event: React.ChangeEvent<HTMLTextAreaElement>): void => {
    setPrompt(event.target.value);
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    setSearchQuery(event.target.value);
  };

  const filteredNFTs: NFT[] = nfts.filter((nft: NFT) => {
    const matchesSearch = nft.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         nft.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || nft.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <header className="flex justify-between items-center mb-8">
          <div className="flex items-center space-x-2">
            <Sparkles className="h-8 w-8 text-purple-400" />
            <h1 className="text-3xl font-bold text-white">ArtiFusion</h1>
          </div>
          
          <div className="flex items-center space-x-4">
            {!isConnected ? (
              <Button onClick={() => setIsWalletModalOpen(true)} className="bg-purple-600 hover:bg-purple-700">
                <Wallet className="mr-2 h-4 w-4" />
                Connect Wallet
              </Button>
            ) : (
              <div className="flex items-center space-x-2">
                <WalletProfileDropdown 
                  account={account} 
                  onDisconnect={disconnectWallet}
                />
                <Button size="sm" variant="outline">
                  <ShoppingCart className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </header>

        {/* Main Content */}
        <Tabs defaultValue="marketplace" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="marketplace">Marketplace</TabsTrigger>
            <TabsTrigger value="create">AI Generator</TabsTrigger>
          </TabsList>

          {/* Marketplace Tab */}
          <TabsContent value="marketplace" className="space-y-6">
            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <Input
                placeholder="Search NFTs..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="flex-1 bg-white/10 border-white/20 text-white placeholder:text-white/60"
              />
              <Select value={selectedCategory} onValueChange={handleCategoryChange}>
                <SelectTrigger className="w-full sm:w-48 bg-white/10 border-white/20 text-white">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="ai-generated">AI Generated</SelectItem>
                  <SelectItem value="abstract">Abstract</SelectItem>
                  <SelectItem value="cyberpunk">Cyberpunk</SelectItem>
                  <SelectItem value="nature">Nature</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* NFT Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredNFTs.map((nft: NFT) => (
                <Card key={nft.id} className="bg-white/5 border-white/20 hover:bg-white/10 transition-all duration-300 group">
                  <CardHeader className="p-0">
                    <div className="relative overflow-hidden rounded-t-lg">
                      <img
                        src={nft.image} // This will now accept data URLs for generated images
                        alt={nft.title}
                        className="w-full h-64 object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute top-2 right-2 flex space-x-1">
                        <Button size="sm" variant="ghost" className="bg-black/50 hover:bg-black/70">
                          <Eye className="h-4 w-4 text-white" />
                        </Button>
                        <Button size="sm" variant="ghost" className="bg-black/50 hover:bg-black/70">
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
                    <Button className="w-full bg-purple-600 hover:bg-purple-700">
                      Buy Now
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* AI Generator Tab */}
          <TabsContent value="create" className="space-y-6">
            <Card className="bg-white/5 border-white/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <Palette className="mr-2 h-5 w-5" />
                  AI Art Generator
                </CardTitle>
                <CardDescription className="text-white/70">
                  Create unique NFTs using AI. Describe your vision and let our AI bring it to life.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-white font-medium block mb-2">Prompt</label>
                  <Textarea
                    placeholder="Describe the artwork you want to create... (e.g., 'A mystical dragon flying over a cyberpunk city at sunset')"
                    value={prompt}
                    onChange={handlePromptChange}
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/60 min-h-20"
                  />
                </div>
                
                <div>
                  <label className="text-white font-medium block mb-2">Art Style</label>
                  <Select value={selectedStyle} onValueChange={handleStyleChange}>
                    <SelectTrigger className="bg-white/10 border-white/20 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="realistic">Realistic</SelectItem>
                      <SelectItem value="abstract">Abstract</SelectItem>
                      <SelectItem value="cyberpunk">Cyberpunk</SelectItem>
                      <SelectItem value="fantasy">Fantasy</SelectItem>
                      <SelectItem value="minimalist">Minimalist</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button 
                  onClick={generateAIArt}
                  disabled={!prompt.trim() || isGenerating}
                  className="w-full bg-purple-600 hover:bg-purple-700"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Generate AI Art
                    </>
                  )}
                </Button>

                {generatedImage && (
                  <div className="mt-6">
                    <h3 className="text-white font-medium mb-4">Generated Artwork</h3>
                    <div className="relative">
                      <img
                        src={generatedImage} // This will display the base64 data URL
                        alt="Generated artwork"
                        className="w-full max-w-md mx-auto rounded-lg"
                      />
                    </div>
                    <div className="flex gap-3 mt-4">
                      <Button 
                        onClick={mintNFT} 
                        className="flex-1 bg-green-600 hover:bg-green-700"
                        disabled={!isConnected} // Disable minting if wallet is not connected
                      >
                        Mint as NFT
                      </Button>
                      <Button onClick={generateAIArt} variant="outline" className="flex-1">
                        Regenerate
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Connect Wallet Modal */}
        <ConnectWalletModal
          isOpen={isWalletModalOpen}
          onClose={() => setIsWalletModalOpen(false)}
          onConnect={connectWallet}
          isConnecting={isConnecting}
        />
      </div>
    </div>
  );
};

export default NFTMarketplace;