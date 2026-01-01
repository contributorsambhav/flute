"use client";

import { AlertCircle, AlertTriangle, CheckCircle, ExternalLink, Loader2, Wallet, Wifi } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/app/components/ui/dialog';
import React, { useEffect, useState } from 'react';
import { getAllSupportedNetworks, isNetworkSupported } from '@/lib/networks';

import { Button } from '@/app/components/ui/button';

interface WalletInfo {
  address: string;
  balance: string;
  network: {
    name: string;
    chainId: number;
    symbol: string;
    isTestnet: boolean;
  };
}

interface ConnectWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: (walletType: string) => Promise<void>;
  isConnecting: boolean;
  walletInfo?: WalletInfo | null;
}

const ConnectWalletModal: React.FC<ConnectWalletModalProps> = ({
  isOpen,
  onClose,
  onConnect,
  isConnecting,
  walletInfo
}) => {
  const [networkError, setNetworkError] = useState<string | null>(null);
  const supportedNetworks = getAllSupportedNetworks();

  useEffect(() => {
    if (walletInfo?.network) {
      if (!isNetworkSupported(walletInfo.network.chainId)) {
        setNetworkError(`Unsupported network detected. Please switch to one of our supported networks.`);
      } else {
        setNetworkError(null);
      }
    }
  }, [walletInfo]);

  const handleConnect = async (walletType: string) => {
    try {
      setNetworkError(null);
      await onConnect(walletType);
    } catch (error: unknown) {
      if (typeof error === "object" && error !== null && "code" in error) {
        const { code } = error as { code?: number };

        if (code === 4902) {
          setNetworkError("Network will be added to your wallet");
          return;
        }

        if (code === -32002) {
          setNetworkError("Please check your wallet for pending connection requests");
          return;
        }
        
        if (code === 4001) {
          setNetworkError("Connection request rejected by user");
          return;
        }
      }

      setNetworkError("Failed to connect wallet. Please try again.");
    }
  };



  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-neutral-900 border-neutral-800 text-white max-h-[90vh] max-w-[95vw] sm:max-w-lg md:max-w-2xl lg:max-w-4xl overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-between pb-4">
          <DialogTitle className="text-lg sm:text-xl lg:text-2xl font-bold">
            Connect Your Wallet
          </DialogTitle>
        </DialogHeader>

        {/* Supported Networks Notice */}
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-4">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-blue-400 font-medium mb-1">Multi-Chain Support</h4>
              <p className="text-sm text-blue-200/80 mb-2">
                This marketplace supports multiple blockchain networks. Connect your wallet and select a network.
              </p>
              <div className="text-xs text-blue-200/60">
                <p className="font-semibold mb-1">Supported Networks:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                  {supportedNetworks.map(network => (
                    <div key={network.chainId}>• {network.name} ({network.symbol})</div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Connected Wallet Info */}
        {walletInfo && (
          <div className={`rounded-lg p-4 mb-6 ${
            isNetworkSupported(walletInfo.network.chainId)
              ? 'bg-green-500/10 border border-green-500/30' 
              : 'bg-red-500/10 border border-red-500/30'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <h3 className={`text-lg font-medium ${
                isNetworkSupported(walletInfo.network.chainId)
                  ? 'text-green-400' 
                  : 'text-red-400'
              }`}>
                {isNetworkSupported(walletInfo.network.chainId)
                  ? `Connected to ${walletInfo.network.name}` 
                  : 'Unsupported Network'}
              </h3>
              <div className="flex items-center space-x-2">
                {isNetworkSupported(walletInfo.network.chainId) ? (
                  <>
                    <Wifi className="w-4 h-4 text-green-400" />
                    <span className="text-sm text-green-400">Connected</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-4 h-4 text-red-400" />
                    <span className="text-sm text-red-400">Unsupported</span>
                  </>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-400 mb-1">Address</p>
                <p className="font-mono text-sm bg-gray-800 p-2 rounded break-all">
                  {walletInfo.address}
                </p>
              </div>
              
              <div>
                <p className="text-sm text-gray-400 mb-1">Network</p>
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${
                    isNetworkSupported(walletInfo.network.chainId)
                      ? 'bg-green-400' 
                      : 'bg-red-400'
                  }`}></div>
                  <span className="text-sm">
                    {walletInfo.network.name} (Chain ID: {walletInfo.network.chainId})
                  </span>
                </div>
              </div>
              
              <div>
                <p className="text-sm text-gray-400 mb-1">Balance</p>
                <p className="font-medium">
                  {walletInfo.balance} {walletInfo.network.symbol}
                </p>
              </div>
              
              <div>
                <p className="text-sm text-gray-400 mb-1">Status</p>
                <div className="flex items-center space-x-2">
                  {isNetworkSupported(walletInfo.network.chainId) ? (
                    <>
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      <span className="text-sm text-green-400">Ready to use</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-4 h-4 text-red-400" />
                      <span className="text-sm text-red-400">Switch network required</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {!isNetworkSupported(walletInfo.network.chainId) && (
              <div className="mt-4">
                <p className="text-yellow-400 text-sm mb-2">
                  Please switch to one of the supported networks using the network selector after connecting.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Error Display */}
        {networkError && (
          <div className="flex items-center space-x-2 mb-4 p-3 bg-red-900/20 border border-red-500/30 rounded">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span className="text-sm text-red-400">{networkError}</span>
          </div>
        )}
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-6">
          {/* Left side - Wallet options */}
          <div className="order-1">
            <div className="mb-4 sm:mb-6">
              <h3 className="text-purple-400 text-sm font-medium mb-3">
                Installed
              </h3>
              <Button
                onClick={() => handleConnect('metamask')}
                disabled={isConnecting}
                className="w-full flex items-center justify-start space-x-3 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 h-12 sm:h-14 px-3 sm:px-4"
              >
                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-orange-500 rounded-lg flex items-center justify-center shrink-0">
                  <div className="w-4 h-4 sm:w-6 sm:h-6 bg-white rounded mask-fox"></div>
                </div>
                <div className="flex-1 text-left min-w-0">
                  <div className="font-medium text-sm sm:text-base truncate">
                    MetaMask
                  </div>
                  <div className="text-xs sm:text-sm text-neutral-400">
                    Connect to any supported network
                  </div>
                </div>
                {isConnecting && (
                  <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                )}
              </Button>
            </div>

            <div>
              <h3 className="text-neutral-400 text-sm font-medium mb-3">
                Other Wallets (Coming Soon)
              </h3>
              <div className="space-y-2 opacity-50 pointer-events-none">
                <Button
                  disabled
                  className="w-full flex items-center justify-start space-x-3 bg-neutral-800 border border-neutral-700 h-12 sm:h-14 px-3 sm:px-4"
                >
                  <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-br from-neutral-400 via-stone-400 to-stone-500 rounded-lg flex items-center justify-center shrink-0">
                    <div className="w-3 h-3 sm:w-4 sm:h-4 bg-white rounded-full"></div>
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <div className="font-medium text-sm sm:text-base truncate">
                      WalletConnect
                    </div>
                  </div>
                </Button>

                <Button
                  disabled
                  className="w-full flex items-center justify-start space-x-3 bg-neutral-800 border border-neutral-700 h-12 sm:h-14 px-3 sm:px-4"
                >
                  <div className="w-6 h-6 sm:w-8 sm:h-8 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
                    <div className="w-3 h-3 sm:w-4 sm:h-4 bg-white rounded-full"></div>
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <div className="font-medium text-sm sm:text-base truncate">
                      Coinbase Wallet
                    </div>
                  </div>
                </Button>
              </div>
            </div>
          </div>

          {/* Right side - What is a Wallet info */}
          <div className="bg-neutral-800/50 rounded-lg p-4 sm:p-6 order-2 lg:order-none">
            <h3 className="text-lg sm:text-xl font-bold mb-4 sm:mb-6">
              Multi-Chain NFT Marketplace
            </h3>

            <div className="space-y-4 sm:space-y-6">
              <div className="flex items-start space-x-3 sm:space-x-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-purple-500 to-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Wallet className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <div className="min-w-0">
                  <h4 className="font-semibold mb-1 sm:mb-2 text-sm sm:text-base">
                    Multiple Networks Supported
                  </h4>
                  <p className="text-neutral-400 text-xs sm:text-sm leading-relaxed">
                    Trade NFTs across {supportedNetworks.length} different blockchain networks. Switch networks anytime using the network selector.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3 sm:space-x-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-pink-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Wifi className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <div className="min-w-0">
                  <h4 className="font-semibold mb-1 sm:mb-2 text-sm sm:text-base">
                    Seamless Network Switching
                  </h4>
                  <p className="text-neutral-400 text-xs sm:text-sm leading-relaxed">
                    Easily switch between supported networks with a single click. Your NFTs are network-specific.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 sm:mt-8 space-y-2 sm:space-y-3">
              <Button 
                className="w-full bg-stone-600 h-9 text-sm"
                onClick={() => window.open('https://metamask.io/download/', '_blank')}
              >
                Get MetaMask
              </Button>
              <Button
                variant="outline"
                className="w-full text-neutral-800 h-9 text-sm"
                onClick={() => window.open('https://ethereum.org/en/wallets/', '_blank')}
              >
                Learn More
                <ExternalLink className="ml-2 h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
            </div>

            {/* Network List */}
            <div className="mt-6 p-3 bg-gray-900/50 rounded border border-gray-700">
              <h4 className="text-sm font-medium mb-2 flex items-center">
                <Wifi className="w-4 h-4 mr-2 text-purple-400" />
                Supported Networks
              </h4>
              <div className="space-y-2">
                {supportedNetworks.map(network => (
                  <div key={network.chainId} className="text-xs text-gray-400 flex items-center justify-between">
                    <span>• {network.name}</span>
                    <span className="text-gray-500">({network.symbol})</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ConnectWalletModal;