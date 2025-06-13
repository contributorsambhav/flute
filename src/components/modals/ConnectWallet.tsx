'use client'

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Wallet, X, ExternalLink, Wifi, AlertCircle } from 'lucide-react';

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

// Network configurations
const NETWORKS = {
  1: { name: 'Ethereum Mainnet', symbol: 'ETH', isTestnet: false },
  11155111: { name: 'Sepolia Testnet', symbol: 'SepoliaETH', isTestnet: true },
  137: { name: 'Polygon Mainnet', symbol: 'MATIC', isTestnet: false },
  80001: { name: 'Mumbai Testnet', symbol: 'MATIC', isTestnet: true },
  80002: { name: 'Amoy Testnet', symbol: 'POL', isTestnet: true },
  56: { name: 'BSC Mainnet', symbol: 'BNB', isTestnet: false },
  97: { name: 'BSC Testnet', symbol: 'tBNB', isTestnet: true },
  43114: { name: 'Avalanche Mainnet', symbol: 'AVAX', isTestnet: false },
  43113: { name: 'Fuji Testnet', symbol: 'AVAX', isTestnet: true },
};

const ConnectWalletModal: React.FC<ConnectWalletModalProps> = ({
  isOpen,
  onClose,
  onConnect,
  isConnecting,
  walletInfo
}) => {
  const [networkError, setNetworkError] = useState<string | null>(null);

  // Format balance to prevent wrong display
  const formatBalance = (balance: string, decimals: number = 18): string => {
    try {
      if (!balance || balance === '0') return '0';
      
      // Handle different balance formats (wei, ether string, number)
      let balanceInWei: bigint;
      
      if (typeof balance === 'string' && balance.includes('.')) {
        // Already in ether format
        return parseFloat(balance).toFixed(4);
      } else {
        // Assume it's in wei
        balanceInWei = BigInt(balance);
        const divisor = BigInt(10 ** decimals);
        const quotient = balanceInWei / divisor;
        const remainder = balanceInWei % divisor;
        
        if (remainder === BigInt(0)) {
          return quotient.toString();
        } else {
          const decimal = Number(remainder) / Number(divisor);
          return (Number(quotient) + decimal).toFixed(4);
        }
      }
    } catch (error) {
      console.error('Error formatting balance:', error);
      return '0';
    }
  };

  // Get network info
  const getNetworkInfo = (chainId: number) => {
    return NETWORKS[chainId as keyof typeof NETWORKS] || {
      name: `Unknown Network (${chainId})`,
      symbol: 'ETH',
      isTestnet: false
    };
  };

  useEffect(() => {
    if (walletInfo?.network) {
      const networkInfo = getNetworkInfo(walletInfo.network.chainId);
      if (networkInfo.name.includes('Unknown')) {
        setNetworkError(`Unsupported network: Chain ID ${walletInfo.network.chainId}`);
      } else {
        setNetworkError(null);
      }
    }
  }, [walletInfo]);

  const handleConnect = async (walletType: string) => {
    try {
      setNetworkError(null);
      await onConnect(walletType);
    } catch (error: any) {
      if (error.code === 4902) {
        setNetworkError('Please add this network to your wallet first');
      } else if (error.code === -32002) {
        setNetworkError('Please check your wallet for pending connection requests');
      } else {
        setNetworkError('Failed to connect wallet. Please try again.');
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-4xl">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle className="text-2xl font-bold">Connect a Wallet</DialogTitle>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onClose}
            className="h-6 w-6 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>

        {/* Connected Wallet Info */}
        {walletInfo && (
          <div className="bg-gray-800/50 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-medium text-green-400">Wallet Connected</h3>
              <div className="flex items-center space-x-2">
                <Wifi className="w-4 h-4 text-green-400" />
                <span className="text-sm text-green-400">Connected</span>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-400 mb-1">Address</p>
                <p className="font-mono text-sm bg-gray-800 p-2 rounded">
                  {`${walletInfo.address.slice(0, 6)}...${walletInfo.address.slice(-4)}`}
                </p>
              </div>
              
              <div>
                <p className="text-sm text-gray-400 mb-1">Network</p>
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${
                    getNetworkInfo(walletInfo.network.chainId).isTestnet 
                      ? 'bg-yellow-400' 
                      : 'bg-green-400'
                  }`}></div>
                  <span className="text-sm">
                    {getNetworkInfo(walletInfo.network.chainId).name}
                  </span>
                </div>
              </div>
              
              <div>
                <p className="text-sm text-gray-400 mb-1">Balance</p>
                <p className="font-medium">
                  {formatBalance(walletInfo.balance)} {getNetworkInfo(walletInfo.network.chainId).symbol}
                </p>
              </div>
              
              <div>
                <p className="text-sm text-gray-400 mb-1">Chain ID</p>
                <p className="text-sm">{walletInfo.network.chainId}</p>
              </div>
            </div>

            {networkError && (
              <div className="flex items-center space-x-2 mt-3 p-3 bg-red-900/20 border border-red-500/30 rounded">
                <AlertCircle className="w-4 h-4 text-red-400" />
                <span className="text-sm text-red-400">{networkError}</span>
              </div>
            )}
          </div>
        )}
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-6">
          {/* Left side - Wallet options */}
          <div>
            {/* Installed Section */}
            <div className="mb-6">
              <h3 className="text-purple-400 text-sm font-medium mb-3">Installed</h3>
              <Button
                onClick={() => handleConnect('metamask')}
                disabled={isConnecting}
                className="w-full flex items-center justify-start space-x-3 bg-gray-800 hover:bg-gray-700 border border-gray-700 h-14 px-4"
              >
                <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
                  <div className="w-6 h-6 bg-white rounded mask-fox"></div>
                </div>
                <div className="flex-1 text-left">
                  <div className="font-medium">MetaMask</div>
                  <div className="text-sm text-gray-400">Recent</div>
                </div>
                {isConnecting && <Loader2 className="h-4 w-4 animate-spin" />}
              </Button>
            </div>

            {/* Popular Section */}
            <div>
              <h3 className="text-gray-400 text-sm font-medium mb-3">Popular</h3>
              <div className="space-y-2">
                <Button
                  onClick={() => handleConnect('rainbow')}
                  disabled={isConnecting}
                  className="w-full flex items-center justify-start space-x-3 bg-gray-800 hover:bg-gray-700 border border-gray-700 h-14 px-4"
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-red-400 via-yellow-400 to-blue-500 rounded-lg flex items-center justify-center">
                    <div className="w-4 h-4 bg-white rounded-full"></div>
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-medium">Rainbow</div>
                  </div>
                </Button>

                <Button
                  onClick={() => handleConnect('coinbase')}
                  disabled={isConnecting}
                  className="w-full flex items-center justify-start space-x-3 bg-gray-800 hover:bg-gray-700 border border-gray-700 h-14 px-4"
                >
                  <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                    <div className="w-4 h-4 bg-white rounded-full"></div>
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-medium">Coinbase Wallet</div>
                  </div>
                </Button>

                <Button
                  onClick={() => handleConnect('walletconnect')}
                  disabled={isConnecting}
                  className="w-full flex items-center justify-start space-x-3 bg-gray-800 hover:bg-gray-700 border border-gray-700 h-14 px-4"
                >
                  <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                    <div className="w-4 h-4 bg-white rounded"></div>
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-medium">WalletConnect</div>
                  </div>
                </Button>
              </div>
            </div>
          </div>

          {/* Right side - What is a Wallet info */}
          <div className="bg-gray-800/50 rounded-lg p-6">
            <h3 className="text-xl font-bold mb-6">What is a Wallet?</h3>
            
            <div className="space-y-6">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Wallet className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h4 className="font-semibold mb-2">A Home for your Digital Assets</h4>
                  <p className="text-gray-400 text-sm">
                    Wallets are used to send, receive, store, and display digital assets like Ethereum and NFTs.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <div className="w-6 h-6 bg-white rounded-lg flex items-center justify-center">
                    <div className="w-3 h-3 bg-gradient-to-br from-pink-500 to-purple-600 rounded"></div>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">A New Way to Log In</h4>
                  <p className="text-gray-400 text-sm">
                    Instead of creating new accounts and passwords on every website, just connect your wallet.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8 space-y-3">
              <Button className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
                Get a Wallet
              </Button>
              <Button variant="ghost" className="w-full text-purple-400 hover:text-purple-300">
                Learn More
                <ExternalLink className="ml-2 h-4 w-4" />
              </Button>
            </div>

            {/* Network Support Info */}
            <div className="mt-6 p-3 bg-gray-900/50 rounded border border-gray-700">
              <h4 className="text-sm font-medium mb-2">Supported Networks</h4>
              <div className="text-xs text-gray-400 space-y-1">
                <div>• Ethereum (ETH)</div>
                <div>• Sepolia Testnet (SepoliaETH)</div>
                <div>• Polygon (MATIC/POL)</div>
                <div>• BSC (BNB)</div>
                <div>• Avalanche (AVAX)</div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ConnectWalletModal;