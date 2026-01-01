"use client";

import { AlertTriangle, CheckCircle, Cloud, Image, Loader2, Palette, Sparkles, Upload } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import React, { useEffect, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';

import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Textarea } from '@/app/components/ui/textarea';
import { blockchainService } from '@/lib/blockchain';

type ArtStyle =
  | "realistic"
  | "abstract"
  | "cyberpunk"
  | "fantasy"
  | "minimalist";
type CreationMode = "upload" | "generate";

interface CreateNFTProps {
  isConnected: boolean;
  account: string;
  onConnectionChange?: () => void;
}

interface IPFSUploadResult {
  imageUrl: string;
  metadataUrl: string;
  imageCid: string;
  metadataCid: string;
}

const CreateNFT: React.FC<CreateNFTProps> = ({ isConnected, account, onConnectionChange }) => {
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isUploadingToIPFS, setIsUploadingToIPFS] = useState<boolean>(false);
  const [isMinting, setIsMinting] = useState<boolean>(false);
  const [prompt, setPrompt] = useState<string>("");
  const [selectedStyle, setSelectedStyle] = useState<ArtStyle>("realistic");
  const [nftImage, setNftImage] = useState<string>("");
  const [nftTitle, setNftTitle] = useState<string>("");
  const [nftDescription, setNftDescription] = useState<string>("");
  const [creationMode, setCreationMode] = useState<CreationMode>("upload");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [ipfsData, setIpfsData] = useState<IPFSUploadResult | null>(null);
  const [isUploadedToIPFS, setIsUploadedToIPFS] = useState<boolean>(false);
  const [connectionStatus, setConnectionStatus] = useState<string>('');

  useEffect(() => {
    const verifyConnection = async () => {
      if (isConnected && account) {
        try {
          const currentAccount = await blockchainService.getCurrentAccount();
          if (currentAccount?.toLowerCase() !== account.toLowerCase()) {
            console.warn('Account mismatch detected, reinitializing connection...');
            setConnectionStatus('Account mismatch - please reconnect');
            if (onConnectionChange) {
              onConnectionChange();
            }
          } else {
            setConnectionStatus('Connected and verified');
          }
        } catch (error) {
          console.error('Connection verification failed:', error);
          setConnectionStatus('Connection verification failed');
        }
      } else {
        setConnectionStatus('Not connected');
      }
    };

    verifyConnection();
  }, [isConnected, account, onConnectionChange]);

  const handleImageUpload = (
    event: React.ChangeEvent<HTMLInputElement>,
  ): void => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setNftImage(result);
      };
      reader.readAsDataURL(file);
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
    setNftImage("");
    setIsUploadedToIPFS(false);
    setIpfsData(null);

    try {
      const response = await fetch("/api/generate-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt, style: selectedStyle }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate image from AI");
      }

      const data = await response.json();
      if (data.imageUrl) {
        setNftImage(data.imageUrl);
        setNftTitle(prompt.length > 30 ? prompt.slice(0, 30) + "..." : prompt);
        setNftDescription(
          `AI generated artwork: "${prompt}" (${selectedStyle} style)`,
        );

        const response = await fetch(data.imageUrl);
        const blob = await response.blob();
        const file = new File([blob], `ai-art-${Date.now()}.png`, {
          type: "image/png",
        });
        setUploadedFile(file);
      } else {
        throw new Error("No image URL received from AI generation.");
      }
    } catch (error) {
      console.error("Error generating AI art:", error);
      alert(
        `Error generating AI art: ${error instanceof Error ? error.message : String(error)}`,
      );
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
      formData.append("file", uploadedFile);

      const metadata = {
        name: nftTitle,
        description: nftDescription,
        attributes: [
          {
            trait_type: "Creation Method",
            value: creationMode === "generate" ? "AI Generated" : "Uploaded",
          },
          {
            trait_type: "Creator",
            value: account,
          },
        ],
      };

      if (creationMode === "generate") {
        metadata.attributes.push({
          trait_type: "Art Style",
          value: selectedStyle,
        });
        metadata.attributes.push({
          trait_type: "AI Prompt",
          value: prompt,
        });
      }

      formData.append("metadata", JSON.stringify(metadata));

      const response = await fetch("/api/upload-to-ipfs", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to upload to IPFS");
      }

      const data: IPFSUploadResult = await response.json();
      setIpfsData(data);
      setIsUploadedToIPFS(true);

      alert(
        `Successfully uploaded to IPFS!\nImage: ${data.imageUrl}\nMetadata: ${data.metadataUrl}`,
      );
    } catch (error) {
      console.error("Error uploading to IPFS:", error);
      alert(
        `Error uploading to IPFS: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    } finally {
      setIsUploadingToIPFS(false);
    }
  };

  const mintNFT = async (): Promise<void> => {
    if (!isUploadedToIPFS || !ipfsData) {
      alert("Please upload to IPFS first before minting.");
      return;
    }
    if (!isConnected) {
      alert("Please connect your wallet to mint an NFT.");
      return;
    }

    setIsMinting(true);

    try {
      const currentAccount = await blockchainService.getCurrentAccount();
      if (!currentAccount) {
        const reconnectedAccount = await blockchainService.connectWallet();
        if (!reconnectedAccount) {
          throw new Error("Failed to connect wallet. Please try connecting again.");
        }
        console.log('Wallet reconnected:', reconnectedAccount);
      }

      const category = creationMode === 'generate' ? "ai-generated" : "uploaded";

      const result = await blockchainService.mintNFT(
        ipfsData.metadataUrl,
        category
      );

      console.log('Mint result:', result);

      alert(`NFT successfully minted!\nToken ID: ${result.tokenId}\nTransaction Hash: ${result.transactionHash}`);

      resetForm();

    } catch (error) {
      console.error('Error minting NFT:', error);

      let errorMessage = 'Unknown error occurred';
      if (error instanceof Error) {
        errorMessage = error.message;
      }

      if (errorMessage.includes('Wallet not connected') || errorMessage.includes('not connected')) {
        errorMessage += '\n\nTip: Try disconnecting and reconnecting your wallet, then refresh the page.';
        if (onConnectionChange) {
          onConnectionChange();
        }
      }

      alert(`Error minting NFT: ${errorMessage}`);
    } finally {
      setIsMinting(false);
    }
  };

  const resetForm = (): void => {
    setNftTitle('');
    setNftDescription('');
    setNftImage('');
    setPrompt('');
    setUploadedFile(null);
    setIpfsData(null);
    setIsUploadedToIPFS(false);
  };

  const handleStyleChange = (value: string): void => {
    setSelectedStyle(value as ArtStyle);
  };

  const handleCreationModeChange = (mode: CreationMode): void => {
    setCreationMode(mode);
    setNftImage("");
    setPrompt("");
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
        
        {connectionStatus && (
          <div className={`text-sm px-3 py-1 rounded-full inline-flex items-center w-fit ${
            connectionStatus.includes('verified') || connectionStatus.includes('Connected') 
              ? 'bg-green-500/20 text-green-400 border border-green-500/30'
              : connectionStatus.includes('mismatch') || connectionStatus.includes('failed')
              ? 'bg-red-500/20 text-red-400 border border-red-500/30'
              : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
          }`}>
            {connectionStatus.includes('verified') || connectionStatus.includes('Connected') ? (
              <CheckCircle className="w-3 h-3 mr-1" />
            ) : (
              <AlertTriangle className="w-3 h-3 mr-1" />
            )}
            {connectionStatus}
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex gap-4 mb-6">
            <Button
            variant={creationMode === "upload" ? "default" : "outline"}
            onClick={() => handleCreationModeChange("upload")}
            className="h-9 text-white text-sm sm:text-base bg-neutral-800 border-neutral-700 hover:bg-neutral-700 hover:text-white"
            >
            <Upload className="mr-2 h-4 w-4" />
            Upload Image
            </Button>
          <Button
            variant={creationMode === "generate" ? "default" : "outline"}
            onClick={() => handleCreationModeChange("generate")}
            className="h-9 text-white text-sm sm:text-base bg-neutral-800 border-neutral-700 hover:bg-neutral-700 hover:text-white"
          >
            <Sparkles className="mr-2 h-4 w-4" />
            Generate AI Art
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          <div className="space-y-6">
            {creationMode === "upload" ? (
              <div>
                <label className="text-white font-medium block mb-3 text-sm sm:text-base">
                  Upload Image
                </label>
                <div className="border-2 border-dashed border-neutral-700 rounded-lg p-6 sm:p-8 text-center hover:border-neutral-600 transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    id="image-upload"
                  />
                  <label
                    htmlFor="image-upload"
                    className="cursor-pointer block"
                  >
                    <Image className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-neutral-500 mb-3 sm:mb-4" />
                    <p className="text-white/80 text-sm sm:text-base mb-2">
                      Click to upload an image
                    </p>
                    <p className="text-white/50 text-xs sm:text-sm">
                      PNG, JPG, GIF up to 10MB
                    </p>
                  </label>
                </div>
              </div>
            ) : (
              <div className="space-y-4 sm:space-y-6">
                <div>
                  <label className="text-white font-medium block mb-3 text-sm sm:text-base">
                    AI Prompt
                  </label>
                  <Textarea
                    placeholder="Describe the artwork you want to create..."
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    className="bg-neutral-800 border-neutral-700 text-white placeholder:text-neutral-400 min-h-[80px] sm:min-h-[100px] text-sm sm:text-base"
                  />
                </div>

                <div>
                  <label className="text-white font-medium block mb-3 text-sm sm:text-base">
                    Art Style
                  </label>
                    <Select
                    value={selectedStyle}
                    onValueChange={handleStyleChange}
                    >
                    <SelectTrigger className="bg-neutral-800 border-neutral-700 text-white h-11 sm:h-12">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-neutral-800 border-neutral-700">
                      <SelectItem value="realistic" className="text-white">Realistic</SelectItem>
                      <SelectItem value="abstract" className="text-white">Abstract</SelectItem>
                      <SelectItem value="cyberpunk" className="text-white">Cyberpunk</SelectItem>
                      <SelectItem value="fantasy" className="text-white">Fantasy</SelectItem>
                      <SelectItem value="minimalist" className="text-white">Minimalist</SelectItem>
                    </SelectContent>
                    </Select>
                </div>

                <Button
                  onClick={generateAIArt}
                  disabled={!prompt.trim() || isGenerating}
                  className="w-full h-11 sm:h-12 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-sm sm:text-base"
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

            <div className="space-y-4 sm:space-y-6">
              <div>
                <label className="text-white font-medium block mb-3 text-sm sm:text-base">
                  NFT Title
                </label>
                <Input
                  placeholder="Enter NFT title..."
                  value={nftTitle}
                  onChange={(e) => setNftTitle(e.target.value)}
                  className="bg-neutral-800 border-neutral-700 text-white placeholder:text-neutral-400 h-11 sm:h-12 text-sm sm:text-base"
                />
              </div>

              <div>
                <label className="text-white font-medium block mb-3 text-sm sm:text-base">
                  Description
                </label>
                <Textarea
                  placeholder="Describe your NFT..."
                  value={nftDescription}
                  onChange={(e) => setNftDescription(e.target.value)}
                  className="bg-neutral-800 border-neutral-700 text-white placeholder:text-neutral-400 min-h-[80px] sm:min-h-[100px] text-sm sm:text-base"
                />
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {nftImage && (
              <div>
                <h3 className="text-white font-medium mb-3 text-sm sm:text-base">
                  Preview
                </h3>
                <div className="relative bg-neutral-800 rounded-lg p-4 sm:p-6">
                  <img
                    src={nftImage}
                    alt="NFT preview"
                    className="w-full rounded-lg shadow-lg"
                  />
                </div>
              </div>
            )}

            <div className="space-y-3 sm:space-y-4">
              <Button
                onClick={uploadToIPFS}
                disabled={
                  !uploadedFile ||
                  !nftTitle.trim() ||
                  !nftDescription.trim() ||
                  isUploadingToIPFS ||
                  isUploadedToIPFS
                }
                className={`w-full h-11 sm:h-12 text-sm sm:text-base ${
                  isUploadedToIPFS
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-blue-600 hover:bg-blue-700"
                } disabled:opacity-50`}
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

              {isUploadedToIPFS && ipfsData && (
                <div className="p-3 sm:p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                  <h4 className="text-green-400 font-medium mb-2 text-sm sm:text-base">
                    IPFS Upload Successful
                  </h4>
                  <div className="text-xs sm:text-sm text-white/70 space-y-2">
                    <div>
                      <p className="font-medium">Image URL:</p>
                      <a
                        href={ipfsData.imageUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:underline break-all"
                      >
                        {ipfsData.imageUrl}
                      </a>
                    </div>
                    <div>
                      <p className="font-medium">Metadata URL:</p>
                      <a
                        href={ipfsData.metadataUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:underline break-all"
                      >
                        {ipfsData.metadataUrl}
                      </a>
                    </div>
                  </div>
                </div>
              )}

              <Button
                onClick={mintNFT}
                disabled={
                  !isUploadedToIPFS ||
                  !ipfsData?.metadataUrl ||
                  !isConnected ||
                  isMinting
                }
                className="w-full h-11 sm:h-12 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-sm sm:text-base"
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
            </div>

            <div className="space-y-2">
              {!isConnected && (
                <p className="text-red-400 text-xs sm:text-sm text-center p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                  ⚠️ Please connect your wallet to mint NFTs
                </p>
              )}

              {isConnected && !isUploadedToIPFS && nftImage && (
                <p className="text-yellow-400 text-xs sm:text-sm text-center p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                  ⚠️ Please upload to IPFS before minting your NFT
                </p>
              )}

              {isConnected &&
                isUploadedToIPFS &&
                ipfsData && (
                  <p className="text-green-400 text-xs sm:text-sm text-center p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                    ✅ Ready to mint! Click &quot;Mint NFT&quot; to create your token
                  </p>
                )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CreateNFT;