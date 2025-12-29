"use client";

import { Home, Plus, ShoppingCart, User, Wallet, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "./ui/button";
import ConnectWalletModal from "./modals/ConnectWallet";
import WalletProfileDropdown from "./modals/WalletProfileDropdown";
import { instrumentSerif } from "@/lib/fonts";

// Sepolia network configuration
const SEPOLIA_NETWORK = {
  chainId: "0xaa36a7", // 11155111 in hex
  chainName: "Sepolia Test Network",
  nativeCurrency: {
    name: "SepoliaETH",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrls: ["https://rpc.sepolia.org"],
  blockExplorerUrls: ["https://sepolia.etherscan.io"],
};

const SEPOLIA_CHAIN_ID = 11155111;

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
  const [activeTab, setActiveTab] = useState<string>("marketplace");
  const [walletInfo, setWalletInfo] = useState<WalletInfo | null>(null);
  const [networkError, setNetworkError] = useState<string>("");
  
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const tab = searchParams.get('tab') || 'marketplace';
    setActiveTab(tab);
  }, [searchParams]);

  // Check if already connected on mount
  useEffect(() => {
    checkExistingConnection();
  }, []);

  // Listen for account and network changes
  useEffect(() => {
    if (typeof window !== "undefined" && window.ethereum) {
      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length === 0) {
          // User disconnected
          handleDisconnect();
        } else if (accounts[0] !== account) {
          // Account changed
          checkConnection(accounts[0]);
        }
      };

      const handleChainChanged = () => {
        // Reload the page when chain changes
        window.location.reload();
      };

      window.ethereum.on("accountsChanged", handleAccountsChanged);
      window.ethereum.on("chainChanged", handleChainChanged);

      return () => {
        window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
        window.ethereum.removeListener("chainChanged", handleChainChanged);
      };
    }
  }, [account]);

  const checkExistingConnection = async () => {
    if (typeof window !== "undefined" && window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ 
          method: "eth_accounts" 
        });
        
        if (accounts.length > 0) {
          await checkConnection(accounts[0]);
        }
      } catch (error) {
        console.error("Error checking existing connection:", error);
      }
    }
  };

  const checkConnection = async (address: string) => {
    try {
      const chainId = await window.ethereum.request({ method: "eth_chainId" });
      const chainIdNumber = parseInt(chainId, 16);

      if (chainIdNumber !== SEPOLIA_CHAIN_ID) {
        setNetworkError("Please switch to Sepolia network");
        setIsConnected(false);
        setAccount("");
        setWalletInfo(null);
        return;
      }

      // Get balance
      const balance = await window.ethereum.request({
        method: "eth_getBalance",
        params: [address, "latest"],
      });

      const balanceInEth = (parseInt(balance, 16) / 1e18).toFixed(4);

      setWalletInfo({
        address,
        balance: balanceInEth,
        network: {
          name: "Sepolia",
          chainId: chainIdNumber,
          symbol: "ETH",
          isTestnet: true,
        },
      });

      setIsConnected(true);
      setAccount(address);
      setNetworkError("");
    } catch (error) {
      console.error("Error checking connection:", error);
      setNetworkError("Failed to verify connection");
    }
  };

  const switchToSepolia = async (): Promise<boolean> => {
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: SEPOLIA_NETWORK.chainId }],
      });
      return true;
    } catch (switchError: any) {
      // This error code indicates that the chain has not been added to MetaMask
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [SEPOLIA_NETWORK],
          });
          return true;
        } catch (addError) {
          console.error("Error adding Sepolia network:", addError);
          throw new Error("Failed to add Sepolia network to MetaMask");
        }
      }
      throw switchError;
    }
  };

  const navigateToTab = (tab: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('tab', tab);
    router.push(`?${params.toString()}`, { scroll: false });
  };

  const connectWallet = async (
    walletType: string = "metamask",
  ): Promise<void> => {
    setIsConnecting(true);
    setNetworkError("");
    
    try {
      if (walletType === "metamask") {
        if (typeof window === "undefined" || !window.ethereum) {
          alert("Please install MetaMask to connect your wallet.");
          return;
        }

        // Request accounts
        const accounts = await window.ethereum.request({
          method: "eth_requestAccounts",
        });

        if (accounts.length === 0) {
          throw new Error("No accounts found");
        }

        // Check current network
        const chainId = await window.ethereum.request({ method: "eth_chainId" });
        const chainIdNumber = parseInt(chainId, 16);

        // If not on Sepolia, switch or add it
        if (chainIdNumber !== SEPOLIA_CHAIN_ID) {
          setNetworkError("Switching to Sepolia network...");
          const switched = await switchToSepolia();
          
          if (!switched) {
            throw new Error("Failed to switch to Sepolia network");
          }
        }

        // Get balance
        const balance = await window.ethereum.request({
          method: "eth_getBalance",
          params: [accounts[0], "latest"],
        });

        const balanceInEth = (parseInt(balance, 16) / 1e18).toFixed(4);

        setWalletInfo({
          address: accounts[0],
          balance: balanceInEth,
          network: {
            name: "Sepolia",
            chainId: SEPOLIA_CHAIN_ID,
            symbol: "ETH",
            isTestnet: true,
          },
        });

        setIsConnected(true);
        setAccount(accounts[0]);
        setIsWalletModalOpen(false);
        setNetworkError("");
      } else {
        // For other wallet types, show a message
        alert(`${walletType} wallet connection coming soon! Please use MetaMask for now.`);
      }
    } catch (error: any) {
      console.error("Error connecting wallet:", error);
      
      if (error.code === 4001) {
        setNetworkError("Connection request rejected");
      } else if (error.code === -32002) {
        setNetworkError("Please check MetaMask for pending connection request");
      } else {
        setNetworkError(error.message || "Failed to connect wallet");
      }
      
      setIsConnected(false);
      setAccount("");
      setWalletInfo(null);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = (): void => {
    setIsConnected(false);
    setAccount("");
    setWalletInfo(null);
    setNetworkError("");
  };

  const navItems = [
    { id: "marketplace", label: "Marketplace", icon: Home },
    { id: "create", label: "Create", icon: Plus },
    { id: "my-nfts", label: "My NFTs", icon: User },
  ];

  return (
    <>
      {/* Glassmorphism backdrop */}
      <div className="fixed inset-x-0 top-0 h-20 bg-gradient-to-b from-black/20 via-black/10 to-transparent backdrop-blur-md z-40" />
      
      <header className="fixed inset-x-0 top-0 flex items-center justify-between px-4 md:px-8 py-4 z-50">
        {/* Logo Section */}
        <div className="flex items-center space-x-3">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg blur-sm opacity-75" />
            <div className="relative bg-black/50 p-2 rounded-lg border border-white/10">
              <Zap className="h-5 w-5 text-white" />
            </div>
          </div>
          <button
            onClick={() => navigateToTab("marketplace")}
            className={`text-2xl md:text-3xl font-bold bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent hover:from-purple-200 hover:via-pink-200 hover:to-gray-300 transition-all duration-300 ${instrumentSerif.className}`}
          >
            ArtiFusion
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center space-x-1 bg-black/20 border border-white/10 rounded-xl p-1 backdrop-blur-sm">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => navigateToTab(item.id)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                  isActive
                    ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/25"
                    : "text-gray-300 hover:text-white hover:bg-white/10"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Mobile Navigation */}
        <nav className="flex md:hidden items-center space-x-1 bg-black/20 border border-white/10 rounded-lg p-1 backdrop-blur-sm">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => navigateToTab(item.id)}
                className={`p-2 rounded-md transition-all duration-300 ${
                  isActive
                    ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/25"
                    : "text-gray-300 hover:text-white hover:bg-white/10"
                }`}
              >
                <Icon className="h-4 w-4" />
              </button>
            );
          })}
        </nav>

        {/* Wallet Section */}
        <div className="flex items-center space-x-3">
          {!isConnected || networkError ? (
            <div className="flex flex-col items-end space-y-1">
              <Button
                onClick={() => setIsWalletModalOpen(true)}
                disabled={isConnecting}
                className="group relative overflow-hidden bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-0 px-4 py-2 h-10 text-sm font-medium transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-purple-500/25"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-pink-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative flex items-center space-x-2">
                  {isConnecting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span className="hidden sm:inline">Connecting...</span>
                    </>
                  ) : (
                    <>
                      <Wallet className="h-4 w-4" />
                      <span className="hidden sm:inline">Connect</span>
                    </>
                  )}
                </div>
              </Button>
              {networkError && (
                <span className="text-xs text-red-400 bg-red-500/10 px-2 py-1 rounded">
                  {networkError}
                </span>
              )}
            </div>
          ) : (
            <div className="flex items-center space-x-3">
              {/* Network Indicator - Hidden on mobile */}
              <div className="hidden lg:flex items-center space-x-2 px-3 py-2 bg-black/30 border border-white/10 rounded-lg backdrop-blur-sm">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <span className="text-xs text-gray-300 font-medium">Sepolia</span>
              </div>

              {/* Cart Button */}
              <Button 
                size="sm" 
                variant="outline"
                className="bg-black/30 border-white/10 hover:bg-white/10 text-white hover:text-white h-10 w-10 p-0 backdrop-blur-sm transition-all duration-200 hover:scale-105"
              >
                <ShoppingCart className="h-4 w-4" />
              </Button>

              {/* Wallet Profile */}
              <div className="relative">
                <WalletProfileDropdown
                  account={account}
                  balance={walletInfo ? `${walletInfo.balance} ETH` : "0 ETH"}
                  onDisconnect={handleDisconnect}
                />
              </div>
            </div>
          )}
        </div>

        <ConnectWalletModal
          isOpen={isWalletModalOpen}
          onClose={() => setIsWalletModalOpen(false)}
          onConnect={connectWallet}
          isConnecting={isConnecting}
          walletInfo={walletInfo}
        />
      </header>
    </>
  );
}