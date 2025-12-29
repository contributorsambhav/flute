"use client";

import React, { useEffect, useState, Suspense } from "react";
import { Tabs, TabsContent } from "@/app/components/ui/tabs";
import { useRouter, useSearchParams } from "next/navigation";

import CreateNFT from "@/app/components/pages/CreateNFT";
import MyNFTs from "@/app/components/pages/MyNFTs";
import NFTMarketplace from "@/app/components/pages/NFTmarketplace";
import Navbar from "@/app/components/navbar";

const HomeContent: React.FC = () => {
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

const Home: React.FC = () => {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <HomeContent />
    </Suspense>
  );
};

export default Home;