"use client";
import { instrumentSerif } from "@/lib/fonts";
import { useState } from "react";
import { Button } from "./ui/button";
import { ShoppingCart, Wallet } from "lucide-react";
import WalletProfileDropdown from "./modals/WalletProfileDropdown";
import ConnectWalletModal from "./modals/ConnectWallet";
import Link from "next/link";

export default function Navbar({
  account,
  setAccount,
  isConnected,
  setIsConnected,
}: {
  account: string;
  setAccount: (account: string) => void;
  isConnected: boolean;
  setIsConnected: (isConnected: boolean) => void;
}) {
  const [isWalletModalOpen, setIsWalletModalOpen] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);

  const connectWallet = async (
    walletType: string = "metamask",
  ): Promise<void> => {
    setIsConnecting(true);
    try {
      if (walletType === "metamask") {
        if (typeof window !== "undefined" && window.ethereum) {
          const accounts = await window.ethereum.request({
            method: "eth_requestAccounts",
          });

          if (accounts.length > 0) {
            setIsConnected(true);
            setAccount(accounts[0]);
            setIsWalletModalOpen(false);
          }
        } else {
          alert("Please install MetaMask to connect your wallet.");
        }
      } else {
        await new Promise((resolve) => setTimeout(resolve, 1500));
        setIsConnected(true);
        setAccount("0x742d35Cc6e8f742d35B...742d35Bd");
        setIsWalletModalOpen(false);
      }
    } catch (error) {
      console.error("Error connecting wallet:", error);
      alert("Failed to connect wallet. Please try again.");
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = (): void => {
    setIsConnected(false);
    setAccount("");
  };

  return (
    <header className="fixed inset-x-0 flex justify-between px-5 py-3 bg-neutral-800/90 border-b border-dashed backdrop-blur-xl border-neutral-700 z-50">
      <div className="flex items-center space-x-2">
        {/* <Sparkles className="h-8 w-8 text-neutral-400" /> */}
        <Link
          href="/"
          className={`text-xl md:text-3xl font-bold text-white ${instrumentSerif.className}`}
        >
          ArtiFusion
        </Link>
      </div>

      <div className="flex items-center space-x-4">
        {!isConnected ? (
          <Button
            onClick={() => setIsWalletModalOpen(true)}
            className="bg-neutral-600 hover:bg-neutral-600 h-7 text-xs"
          >
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
      <ConnectWalletModal
        isOpen={isWalletModalOpen}
        onClose={() => setIsWalletModalOpen(false)}
        onConnect={connectWallet}
        isConnecting={isConnecting}
      />
    </header>
  );
}
