'use client'

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Wallet, X, ExternalLink } from 'lucide-react';

interface ConnectWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: (walletType: string) => Promise<void>;
  isConnecting: boolean;
}

const ConnectWalletModal: React.FC<ConnectWalletModalProps> = ({
  isOpen,
  onClose,
  onConnect,
  isConnecting
}) => {
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
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-6">
          {/* Left side - Wallet options */}
          <div>
            {/* Installed Section */}
            <div className="mb-6">
              <h3 className="text-purple-400 text-sm font-medium mb-3">Installed</h3>
              <Button
                onClick={() => onConnect('metamask')}
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
                  onClick={() => onConnect('rainbow')}
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
                  onClick={() => onConnect('coinbase')}
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
                  onClick={() => onConnect('walletconnect')}
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
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ConnectWalletModal;