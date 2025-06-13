"use client";

declare global {
  interface Window {
    ethereum?: any;
  }
}
import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import NFTMarketplace from "@/components/pages/NFTmarketplace";
import CreateNFT from "@/components/pages/CreateNFT";
import Navbar from "@/components/navbar";

const Home: React.FC = () => {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [account, setAccount] = useState<string>("");

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-900 via-neutral-900 to-stone-900">
      <Navbar
        account={account}
        setAccount={setAccount}
        isConnected={isConnected}
        setIsConnected={setIsConnected}
      />
      <div className="px-4 py-8 pt-24">
        <Tabs defaultValue="marketplace" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8 bg-neutral-800 text-white">
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
          </TabsList>

          <TabsContent value="marketplace" className="space-y-6">
            <NFTMarketplace isConnected={isConnected} account={account} />
          </TabsContent>

          <TabsContent value="create" className="space-y-6">
            <CreateNFT isConnected={isConnected} account={account} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Home;
