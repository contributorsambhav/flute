"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Wallet, X, ExternalLink } from "lucide-react";

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
  isConnecting,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-neutral-900 border-neutral-800 text-white max-h-[90vh] max-w-[95vw] sm:max-w-lg md:max-w-2xl lg:max-w-4xl overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-between pb-4">
          <DialogTitle className="text-lg sm:text-xl lg:text-2xl font-bold">
            Connect a Wallet
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
          {/* Left side - Wallet options */}
          <div className="order-1">
            {/* Installed Section */}
            <div className="mb-4 sm:mb-6">
              <h3 className="text-purple-400 text-sm font-medium mb-3">
                Installed
              </h3>
              <Button
                onClick={() => onConnect("metamask")}
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
                    Recent
                  </div>
                </div>
                {isConnecting && (
                  <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                )}
              </Button>
            </div>

            {/* Popular Section */}
            <div>
              <h3 className="text-neutral-400 text-sm font-medium mb-3">
                Popular
              </h3>
              <div className="space-y-2">
                <Button
                  onClick={() => onConnect("rainbow")}
                  disabled={isConnecting}
                  className="w-full flex items-center justify-start space-x-3 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 h-12 sm:h-14 px-3 sm:px-4"
                >
                  <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-br from-neutral-400 via-stone-400 to-stone-500 rounded-lg flex items-center justify-center shrink-0">
                    <div className="w-3 h-3 sm:w-4 sm:h-4 bg-white rounded-full"></div>
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <div className="font-medium text-sm sm:text-base truncate">
                      Rainbow
                    </div>
                  </div>
                </Button>

                <Button
                  onClick={() => onConnect("coinbase")}
                  disabled={isConnecting}
                  className="w-full flex items-center justify-start space-x-3 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 h-12 sm:h-14 px-3 sm:px-4"
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

                <Button
                  onClick={() => onConnect("walletconnect")}
                  disabled={isConnecting}
                  className="w-full flex items-center justify-start space-x-3 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 h-12 sm:h-14 px-3 sm:px-4"
                >
                  <div className="w-6 h-6 sm:w-8 sm:h-8 bg-blue-500 rounded-lg flex items-center justify-center shrink-0">
                    <div className="w-3 h-3 sm:w-4 sm:h-4 bg-white rounded"></div>
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <div className="font-medium text-sm sm:text-base truncate">
                      WalletConnect
                    </div>
                  </div>
                </Button>
              </div>
            </div>
          </div>

          {/* Right side - What is a Wallet info */}
          <div className="bg-neutral-800/50 rounded-lg p-4 sm:p-6 order-2 lg:order-none">
            <h3 className="text-lg sm:text-xl font-bold mb-4 sm:mb-6">
              What is a Wallet?
            </h3>

            <div className="space-y-4 sm:space-y-6">
              <div className="flex items-start space-x-3 sm:space-x-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-purple-500 to-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Wallet className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <div className="min-w-0">
                  <h4 className="font-semibold mb-1 sm:mb-2 text-sm sm:text-base">
                    A Home for your Digital Assets
                  </h4>
                  <p className="text-neutral-400 text-xs sm:text-sm leading-relaxed">
                    Wallets are used to send, receive, store, and display
                    digital assets like Ethereum and NFTs.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3 sm:space-x-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-pink-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <div className="w-5 h-5 sm:w-6 sm:h-6 bg-white rounded-lg flex items-center justify-center">
                    <div className="w-2 h-2 sm:w-3 sm:h-3 bg-gradient-to-br from-pink-500 to-purple-600 rounded"></div>
                  </div>
                </div>
                <div className="min-w-0">
                  <h4 className="font-semibold mb-1 sm:mb-2 text-sm sm:text-base">
                    A New Way to Log In
                  </h4>
                  <p className="text-neutral-400 text-xs sm:text-sm leading-relaxed">
                    Instead of creating new accounts and passwords on every
                    website, just connect your wallet.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 sm:mt-8 space-y-2 sm:space-y-3">
              <Button className="w-full bg-stone-600 h-9 text-sm">
                Get a Wallet
              </Button>
              <Button
                variant="outline"
                className="w-full text-neutral-800 h-9 text-sm"
              >
                Learn More
                <ExternalLink className="ml-2 h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ConnectWalletModal;
