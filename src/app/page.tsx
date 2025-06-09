'use client';

declare global {
  interface Window {
    ethereum?: any;
  }
}

import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Sparkles, Wallet, ShoppingCart } from 'lucide-react';
import NFTMarketplace from '@/components/pages/NFTmarketplace';
import CreateNFT from '@/components/pages/CreateNFT';
import ConnectWalletModal from '@/components/modals/ConnectWallet';
import WalletProfileDropdown from '@/components/modals/WalletProfileDropdown';

const Home: React.FC = () => {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [account, setAccount] = useState<string>('');
  const [isWalletModalOpen, setIsWalletModalOpen] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);

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
        await new Promise(resolve => setTimeout(resolve, 1500));
        setIsConnected(true);
        setAccount('0x742d35Cc6e8f742d35B...742d35Bd');
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <div className="container mx-auto px-4 py-8">
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

        <Tabs defaultValue="marketplace" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="marketplace">Marketplace</TabsTrigger>
            <TabsTrigger value="create">Create NFT</TabsTrigger>
          </TabsList>

          <TabsContent value="marketplace" className="space-y-6">
            <NFTMarketplace 
              isConnected={isConnected}
              account={account}
            />
          </TabsContent>

          <TabsContent value="create" className="space-y-6">
            <CreateNFT 
              isConnected={isConnected}
              account={account}
            />
          </TabsContent>
        </Tabs>

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

export default Home;