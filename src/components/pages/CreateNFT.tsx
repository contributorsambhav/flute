'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Palette, Sparkles, Upload, ImageIcon, Cloud, CheckCircle } from 'lucide-react';
import { blockchainService } from '@/lib/blockchain';

type ArtStyle = 'realistic' | 'abstract' | 'cyberpunk' | 'fantasy' | 'minimalist';
type CreationMode = 'upload' | 'generate';

interface CreateNFTProps {
  isConnected: boolean;
  account: string;
}

interface IPFSUploadResult {
  imageUrl: string;
  metadataUrl: string;
  imageCid: string;
  metadataCid: string;
}

const CreateNFT: React.FC<CreateNFTProps> = ({ isConnected, account }) => {
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isUploadingToIPFS, setIsUploadingToIPFS] = useState<boolean>(false);
  const [isMinting, setIsMinting] = useState<boolean>(false);
  const [prompt, setPrompt] = useState<string>('');
  const [selectedStyle, setSelectedStyle] = useState<ArtStyle>('realistic');
  const [nftImage, setNftImage] = useState<string>('');
  const [nftTitle, setNftTitle] = useState<string>('');
  const [nftDescription, setNftDescription] = useState<string>('');
  const [nftPrice, setNftPrice] = useState<string>('');
  const [creationMode, setCreationMode] = useState<CreationMode>('upload');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [ipfsData, setIpfsData] = useState<IPFSUploadResult | null>(null);
  const [isUploadedToIPFS, setIsUploadedToIPFS] = useState<boolean>(false);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setNftImage(result);
      };
      reader.readAsDataURL(file);
      // Reset IPFS upload state when new file is selected
      setIsUploadedToIPFS(false);
      setIpfsData(null);
    }
  };

  const generateAIArt = async (): Promise<void> => {
    if (!prompt.trim()) {
      alert("Please enter a description for your AI art.");
      return;
    }
    
    setIsGenerating(true);
    setNftImage('');
    setIsUploadedToIPFS(false);
    setIpfsData(null);

    try {
      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt, style: selectedStyle }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate image from AI');
      }

      const data = await response.json();
      if (data.imageUrl) {
        setNftImage(data.imageUrl);
        setNftTitle(prompt.length > 30 ? prompt.slice(0, 30) + "..." : prompt);
        setNftDescription(`AI generated artwork: "${prompt}" (${selectedStyle} style)`);
        
        // Convert image URL to File object for IPFS upload
        const response = await fetch(data.imageUrl);
        const blob = await response.blob();
        const file = new File([blob], `ai-art-${Date.now()}.png`, { type: 'image/png' });
        setUploadedFile(file);
      } else {
        throw new Error('No image URL received from AI generation.');
      }
    } catch (error) {
      console.error('Error generating AI art:', error);
      alert(`Error generating AI art: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const uploadToIPFS = async (): Promise<void> => {
    if (!uploadedFile) {
      alert("Please upload an image or generate one using AI first.");
      return;
    }
    if (!nftTitle.trim()) {
      alert("Please enter a title for your NFT.");
      return;
    }
    if (!nftDescription.trim()) {
      alert("Please enter a description for your NFT.");
      return;
    }
    
    setIsUploadingToIPFS(true);
    
    try {
      const formData = new FormData();
      formData.append('file', uploadedFile);
      
      // Create metadata object
      const metadata = {
        name: nftTitle,
        description: nftDescription,
        attributes: [
          {
            trait_type: "Creation Method",
            value: creationMode === 'generate' ? "AI Generated" : "Uploaded"
          },
          {
            trait_type: "Creator",
            value: account
          }
        ]
      };
      
      if (creationMode === 'generate') {
        metadata.attributes.push({
          trait_type: "Art Style",
          value: selectedStyle
        });
        metadata.attributes.push({
          trait_type: "AI Prompt",
          value: prompt
        });
      }
      
      formData.append('metadata', JSON.stringify(metadata));

      const response = await fetch('/api/upload-to-ipfs', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.log(errorData);
        throw new Error(errorData.error || 'Failed to upload to IPFS');
      }

      const data: IPFSUploadResult = await response.json();
      setIpfsData(data);
      setIsUploadedToIPFS(true);
      
      alert(`Successfully uploaded to IPFS!\nImage: ${data.imageUrl}\nMetadata: ${data.metadataUrl}`);
      
    } catch (error) {
      console.error('Error uploading to IPFS:', error);
      alert(`Error uploading to IPFS: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsUploadingToIPFS(false);
    }
  };

  const mintNFT = async (): Promise<void> => {
    if (!isUploadedToIPFS || !ipfsData) {
      alert("Please upload to IPFS first before minting.");
      return;
    }
    if (!nftPrice.trim()) {
      alert("Please enter a price for your NFT.");
      return;
    }
    if (!isConnected) {
      alert("Please connect your wallet to mint an NFT.");
      return;
    }
    
    // Validate price format
    const priceNum = parseFloat(nftPrice);
    if (isNaN(priceNum) || priceNum <= 0) {
      alert("Please enter a valid price greater than 0.");
      return;
    }
    
    setIsMinting(true);
    
    try {
      const category = creationMode === 'generate' ? "ai-generated" : "uploaded";

      // Use the blockchain service directly to mint the NFT
      const result = await blockchainService.mintNFT(
        nftTitle,
        nftDescription,
        ipfsData.metadataUrl, 
        nftPrice,
        category
      );
      
      alert(`NFT successfully minted!\nToken ID: ${result.tokenId}\nTransaction Hash: ${result.transactionHash}`);
      
      // Reset form
      setNftTitle('');
      setNftDescription('');
      setNftPrice('');
      setNftImage('');
      setPrompt('');
      setUploadedFile(null);
      setIpfsData(null);
      setIsUploadedToIPFS(false);
      
    } catch (error) {
      console.error('Error minting NFT:', error);
      alert(`Error minting NFT: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsMinting(false);
    }
  };

  const handleStyleChange = (value: string): void => {
    setSelectedStyle(value as ArtStyle);
  };

  const handleCreationModeChange = (mode: CreationMode): void => {
    setCreationMode(mode);
    setNftImage('');
    setPrompt('');
    setUploadedFile(null);
    setIpfsData(null);
    setIsUploadedToIPFS(false);
  };

  return (
    <Card className="bg-white/5 border-white/20">
      <CardHeader>
        <CardTitle className="text-white flex items-center">
          <Palette className="mr-2 h-5 w-5" />
          Create NFT
        </CardTitle>
        <CardDescription className="text-white/70">
          Upload your own artwork or generate unique art using AI to create NFTs.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex gap-4 mb-6">
          <Button
            variant={creationMode === 'upload' ? 'default' : 'outline'}
            onClick={() => handleCreationModeChange('upload')}
            className="flex-1"
          >
            <Upload className="mr-2 h-4 w-4" />
            Upload Image
          </Button>
          <Button
            variant={creationMode === 'generate' ? 'default' : 'outline'}
            onClick={() => handleCreationModeChange('generate')}
            className="flex-1"
          >
            <Sparkles className="mr-2 h-4 w-4" />
            Generate AI Art
          </Button>
        </div>

        {creationMode === 'upload' ? (
          <div>
            <label className="text-white font-medium block mb-2">Upload Image</label>
            <div className="border-2 border-dashed border-white/20 rounded-lg p-8 text-center">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                id="image-upload"
              />
              <label htmlFor="image-upload" className="cursor-pointer">
                <ImageIcon className="mx-auto h-12 w-12 text-white/60 mb-4" />
                <p className="text-white/70">Click to upload an image</p>
                <p className="text-white/50 text-sm mt-2">PNG, JPG, GIF up to 10MB</p>
              </label>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="text-white font-medium block mb-2">AI Prompt</label>
              <Textarea
                placeholder="Describe the artwork you want to create..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
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
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
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
          </div>
        )}

        {nftImage && (
          <div className="space-y-4">
            <h3 className="text-white font-medium">Preview</h3>
            <div className="relative">
              <img
                src={nftImage}
                alt="NFT preview"
                className="w-full max-w-md mx-auto rounded-lg"
              />
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="text-white font-medium block mb-2">NFT Title</label>
            <Input
              placeholder="Enter NFT title..."
              value={nftTitle}
              onChange={(e) => setNftTitle(e.target.value)}
              className="bg-white/10 border-white/20 text-white placeholder:text-white/60"
            />
          </div>

          <div>
            <label className="text-white font-medium block mb-2">Description</label>
            <Textarea
              placeholder="Describe your NFT..."
              value={nftDescription}
              onChange={(e) => setNftDescription(e.target.value)}
              className="bg-white/10 border-white/20 text-white placeholder:text-white/60"
            />
          </div>

          <div>
            <label className="text-white font-medium block mb-2">Price (ETH)</label>
            <Input
              type="number"
              step="0.01"
              min="0.001"
              placeholder="0.1"
              value={nftPrice}
              onChange={(e) => setNftPrice(e.target.value)}
              className="bg-white/10 border-white/20 text-white placeholder:text-white/60"
            />
          </div>
        </div>

        {/* IPFS Upload Button */}
        <Button 
          onClick={uploadToIPFS}
          disabled={!uploadedFile || !nftTitle.trim() || !nftDescription.trim() || isUploadingToIPFS || isUploadedToIPFS}
          className={`w-full ${isUploadedToIPFS 
            ? 'bg-green-600 hover:bg-green-700' 
            : 'bg-blue-600 hover:bg-blue-700'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {isUploadingToIPFS ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Uploading to IPFS...
            </>
          ) : isUploadedToIPFS ? (
            <>
              <CheckCircle className="mr-2 h-4 w-4" />
              Uploaded to IPFS ✓
            </>
          ) : (
            <>
              <Cloud className="mr-2 h-4 w-4" />
              Upload to IPFS
            </>
          )}
        </Button>

        {/* Show IPFS URLs if uploaded */}
        {isUploadedToIPFS && ipfsData && (
          <div className="space-y-2 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
            <h4 className="text-green-400 font-medium">IPFS Upload Successful</h4>
            <div className="text-sm text-white/70 space-y-1">
              <p><strong>Image URL:</strong></p>
              <a 
                href={ipfsData.imageUrl} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-blue-400 hover:underline block break-all"
              >
                {ipfsData.imageUrl}
              </a>
              <p><strong>Metadata URL:</strong></p>
              <a 
                href={ipfsData.metadataUrl} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-blue-400 hover:underline block break-all"
              >
                {ipfsData.metadataUrl}
              </a>
            </div>
          </div>
        )}

        {/* Mint NFT Button - Only enabled after IPFS upload */}
        <Button 
          onClick={mintNFT}
          disabled={!isUploadedToIPFS || !ipfsData?.metadataUrl || !nftPrice.trim() || !isConnected || isMinting}
          className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isMinting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Minting NFT...
            </>
          ) : (
            <>
              <Palette className="mr-2 h-4 w-4" />
              Mint NFT
            </>
          )}
        </Button>

        {/* Status Messages */}
        {!isConnected && (
          <p className="text-red-400 text-sm text-center">
            ⚠️ Please connect your wallet to mint NFTs
          </p>
        )}
        
        {isConnected && !isUploadedToIPFS && nftImage && (
          <p className="text-yellow-400 text-sm text-center">
            ⚠️ Please upload to IPFS before minting your NFT
          </p>
        )}
        
        {isConnected && isUploadedToIPFS && ipfsData && !nftPrice.trim() && (
          <p className="text-yellow-400 text-sm text-center">
            ⚠️ Please enter a price to mint your NFT
          </p>
        )}

        {isConnected && isUploadedToIPFS && ipfsData && nftPrice.trim() && (
          <p className="text-green-400 text-sm text-center">
            ✅ Ready to mint! Click "Mint NFT" to create your token
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default CreateNFT;