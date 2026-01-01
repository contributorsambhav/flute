"use client";

import React, { Suspense, useEffect, useState } from "react";
import { Tabs, TabsContent } from "@/app/components/ui/tabs";
import { useRouter, useSearchParams } from "next/navigation";

import AdminPanel from "@/app/components/pages/AdminPanel";
import CreateNFT from "@/app/components/pages/CreateNFT";
import MyNFTs from "@/app/components/pages/MyNFTs";
import NFTMarketplace from "@/app/components/pages/NFTmarketplace";
import Navbar from "@/app/components/navbar";

const HomeContent: React.FC = () => {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [account, setAccount] = useState<string>("");
  const [currentChainId, setCurrentChainId] = useState<number>(0);
  const [isOwner, setIsOwner] = useState<boolean>(false);
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
        currentChainId={currentChainId}
        setCurrentChainId={setCurrentChainId}
        isOwner={isOwner}
        setIsOwner={setIsOwner}
      />
      <div className="px-4 py-8 pt-24">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsContent value="marketplace" className="space-y-6">
            <NFTMarketplace 
              isConnected={isConnected} 
              account={account}
              currentChainId={currentChainId}
            />
          </TabsContent>

          <TabsContent value="create" className="space-y-6">
            <CreateNFT 
              isConnected={isConnected} 
              account={account}
            />
          </TabsContent>

          <TabsContent value="my-nfts" className="space-y-6">
            <MyNFTs 
              isConnected={isConnected} 
              account={account}
              currentChainId={currentChainId}
            />
          </TabsContent>

          {/* Admin Panel - Only visible when user is owner */}
          {isOwner && (
            <TabsContent value="admin" className="space-y-6">
              <AdminPanel 
                isConnected={isConnected} 
                account={account}
                currentChainId={currentChainId}
              />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
};

const Home: React.FC = () => {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-neutral-900 via-neutral-900 to-stone-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    }>
      <HomeContent />
    </Suspense>
  );
};

export default Home;