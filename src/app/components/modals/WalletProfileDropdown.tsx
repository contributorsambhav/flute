"use client";

import { ChevronDown, Copy, ExternalLink, LogOut } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";

import { Button } from "@/app/components/ui/button";

interface WalletProfileDropdownProps {
  account: string;
  balance?: string;
  onDisconnect: () => void;
}

const WalletProfileDropdown: React.FC<WalletProfileDropdownProps> = ({
  account,
  balance = "0 ETH",
  onDisconnect,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [copyFeedback, setCopyFeedback] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleCopyAddress = async () => {
    try {
      await navigator.clipboard.writeText(account);
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    } catch (error) {
      console.error("Failed to copy address:", error);
    }
  };

  const handleDisconnect = () => {
    onDisconnect();
    setIsOpen(false);
  };

  const handleViewOnExplorer = () => {
    window.open(`https://sepolia.etherscan.io/address/${account}`, '_blank');
  };

  const getWalletIcon = () => {
    return (
      <div className="w-7 h-7 bg-orange-500 rounded-full flex items-center justify-center">
        <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center">
          <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
        </div>
      </div>
    );
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        variant="ghost"
        className="flex items-center space-x-2 bg-white/10 hover:bg-white/20 border border-white/20 px-3 py-2 h-10"
      >
        {getWalletIcon()}
        <div className="flex flex-col items-start">
          <span className="text-white font-medium text-xs">
            {account.slice(0, 6)}...{account.slice(-4)}
          </span>
          <span className="text-white/70 text-xs hidden sm:inline">{balance}</span>
        </div>
        <ChevronDown
          className={`h-4 w-4 text-white/70 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </Button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-72 bg-neutral-900 border border-neutral-700 rounded-lg shadow-xl z-50">
          {/* Header */}
          <div className="p-4 border-b border-neutral-700">
            <div className="flex items-center space-x-3 mb-3">
              {getWalletIcon()}
              <div className="flex-1 min-w-0">
                <div className="text-white/70 text-xs mb-1">Sepolia Testnet</div>
                <div className="text-white font-medium text-xs truncate">
                  {account}
                </div>
              </div>
            </div>
            <div className="bg-neutral-800 rounded-lg p-3">
              <div className="text-white/60 text-xs mb-1">Balance</div>
              <div className="text-xl font-bold text-white">
                {balance}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="p-2">
            <Button
              onClick={handleCopyAddress}
              variant="ghost"
              className="w-full flex items-center justify-start space-x-3 text-white hover:bg-neutral-800 p-3 h-auto"
            >
              <div className="w-8 h-8 bg-neutral-700 rounded-lg flex items-center justify-center">
                <Copy className="h-4 w-4 text-white" />
              </div>
              <div className="flex-1 text-left">
                <div className="font-medium text-white text-sm">
                  {copyFeedback ? "Copied!" : "Copy Address"}
                </div>
                {copyFeedback && (
                  <div className="text-xs text-green-400">
                    Address copied to clipboard
                  </div>
                )}
              </div>
            </Button>

            <Button
              onClick={handleViewOnExplorer}
              variant="ghost"
              className="w-full flex items-center justify-start space-x-3 text-white hover:bg-neutral-800 p-3 h-auto"
            >
              <div className="w-8 h-8 bg-neutral-700 rounded-lg flex items-center justify-center">
                <ExternalLink className="h-4 w-4 text-white" />
              </div>
              <div className="flex-1 text-left text-white">
                <div className="font-medium text-sm">View on Etherscan</div>
                <div className="text-xs text-white/60">Sepolia Explorer</div>
              </div>
            </Button>

            <div className="border-t border-neutral-700 my-2"></div>

            <Button
              onClick={handleDisconnect}
              variant="ghost"
              className="w-full flex items-center justify-start space-x-3 text-red-400 hover:bg-red-900/20 p-3 h-auto"
            >
              <div className="w-8 h-8 bg-red-900/30 rounded-lg flex items-center justify-center">
                <LogOut className="h-4 w-4 text-red-400" />
              </div>
              <div className="flex-1 text-left">
                <div className="font-medium text-sm">Disconnect</div>
                <div className="text-xs text-red-400/60">Log out of wallet</div>
              </div>
            </Button>
          </div>

          {/* Footer - Faucet Link */}
          <div className="p-3 border-t border-neutral-700 bg-neutral-800/50">
            <a
              href="https://sepoliafaucet.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-400 hover:text-blue-300 flex items-center justify-center"
            >
              Need test ETH? Get from Sepolia Faucet
              <ExternalLink className="h-3 w-3 ml-1" />
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

export default WalletProfileDropdown;