"use client";

declare global {
  interface Window {
    ethereum?: any;
  }
}

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import NFTMarketplace from "@/components/pages/NFTmarketplace";
import CreateNFT from "@/components/pages/CreateNFT";
import Navbar from "@/components/navbar";
import MyNFTs from "@/components/pages/MyNFTs";

const Home: React.FC = () => {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [account, setAccount] = useState<string>("");
  const [activeTab, setActiveTab] = useState<string>("marketplace");
  
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Get tab from URL parameter or default to marketplace
    const tab = searchParams.get('tab') || 'marketplace';
    setActiveTab(tab);
  }, [searchParams]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    // Update URL without page refresh
    const params = new URLSearchParams(searchParams);
    params.set('tab', value);
    router.push(`?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-900 via-neutral-900 to-stone-900">
      <Navbar
        account={account}
        setAccount={setAccount}
        isConnected={isConnected}
        setIsConnected={setIsConnected}
      />
      <div className="px-4 py-8 pt-24">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8 bg-neutral-800 text-white">
            <TabsTrigger
              value="marketplace"
              className="text-white data-[state=active]:text-neutral-800 "
            >
              Marketplace
            </TabsTrigger>
            <TabsTrigger
              value="create"
              className="text-white data-[state=active]:text-neutral-800"
            >
              Create NFT
            </TabsTrigger>
            <TabsTrigger
              value="my-nfts"
              className="text-white data-[state=active]:text-neutral-800"
            >
              My NFTs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="marketplace" className="space-y-6">
            <NFTMarketplace isConnected={isConnected} account={account} />
          </TabsContent>

          <TabsContent value="create" className="space-y-6">
            <CreateNFT isConnected={isConnected} account={account} />
          </TabsContent>

          <TabsContent value="my-nfts" className="space-y-6">
            <MyNFTs isConnected={isConnected} account={account} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Home;