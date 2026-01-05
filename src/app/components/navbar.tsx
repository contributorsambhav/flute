"use client";

import { ChevronDown, Home, Plus, Settings, ShoppingCart, User, Wallet, Zap } from "lucide-react";
import {
  NetworkConfig,
  getAllSupportedNetworks,
  getNetworkConfig,
  isNetworkSupported
} from "@/lib/networks";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "./ui/button";
import ConnectWalletModal from "./modals/ConnectWallet";
import WalletProfileDropdown from "./modals/WalletProfileDropdown";
import { ethers } from "ethers";
import { instrumentSerif } from "@/lib/fonts";

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

interface ErrorWithCode {
  code?: number;
  message?: string;
}

interface WalletConnectProvider {
  enable: () => Promise<string[]>;
  request: (args: { method: string; params?: any[] }) => Promise<any>;
  disconnect: () => Promise<void>;
  on: (event: string, handler: (...args: any[]) => void) => void;
  removeListener: (event: string, handler: (...args: any[]) => void) => void;
  accounts: string[];
  chainId: number;
}

export default function Navbar({
  account,
  setAccount,
  isConnected,
  setIsConnected,
  setCurrentChainId,
  isOwner,
  setIsOwner,
}: {
  account: string;
  setAccount: (account: string) => void;
  isConnected: boolean;
  setIsConnected: (isConnected: boolean) => void;
  currentChainId: number;
  setCurrentChainId: (chainId: number) => void;
  isOwner: boolean;
  setIsOwner: (isOwner: boolean) => void;
}) {
  const [isWalletModalOpen, setIsWalletModalOpen] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>("marketplace");
  const [walletInfo, setWalletInfo] = useState<WalletInfo | null>(null);
  const [networkError, setNetworkError] = useState<string>("");
  const [currentNetwork, setCurrentNetwork] = useState<NetworkConfig | null>(null);
  const [isNetworkDropdownOpen, setIsNetworkDropdownOpen] = useState<boolean>(false);
  const [isCheckingOwnership, setIsCheckingOwnership] = useState<boolean>(false);
  const [walletProvider, setWalletProvider] = useState<any>(null);
  const [walletType, setWalletType] = useState<'metamask' | 'walletconnect' | null>(null);
  
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const tab = searchParams.get('tab') || 'marketplace';
    setActiveTab(tab);
  }, [searchParams]);

  useEffect(() => {
    checkExistingConnection();
  }, []);

  useEffect(() => {
    const checkOwnership = async () => {
      if (!isConnected || !account || !currentNetwork) {
        setIsOwner(false);
        return;
      }

      try {
        setIsCheckingOwnership(true);
        
        const contractAddress = currentNetwork.contractAddress;
        
        if (!contractAddress) {
          console.warn('No contract address for current network');
          setIsOwner(false);
          return;
        }

        if (!walletProvider) {
          console.warn('Wallet provider not available');
          setIsOwner(false);
          return;
        }

        const provider = new ethers.BrowserProvider(walletProvider);
        
        const minimalABI = [
          "function owner() view returns (address)"
        ];
        
        const contract = new ethers.Contract(contractAddress, minimalABI, provider);
        
        const ownerAddress = await contract.owner();
        
        const isOwnerResult = account.toLowerCase() === ownerAddress.toLowerCase();
        
        setIsOwner(isOwnerResult);
        
        if (isOwnerResult) {
          console.log('✅ Admin access granted');
        }
      } catch (error) {
        console.error('Error checking ownership from contract:', error);
        setIsOwner(false);
      } finally {
        setIsCheckingOwnership(false);
      }
    };

    checkOwnership();
  }, [isConnected, account, currentNetwork, setIsOwner, walletProvider]);

  useEffect(() => {
    if (!walletProvider) return;

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        handleDisconnect();
      } else if (accounts[0] !== account) {
        checkConnection(accounts[0]);
      }
    };

    const handleChainChanged = async (chainId: string | number) => {
      const chainIdNumber = typeof chainId === 'string' ? parseInt(chainId, 16) : chainId;
      const network = getNetworkConfig(chainIdNumber);
      
      if (network) {
        setCurrentNetwork(network);
        setCurrentChainId(chainIdNumber);
        setNetworkError("");
        if (account) {
          await checkConnection(account);
        }
      } else {
        setNetworkError("Unsupported network");
        setCurrentNetwork(null);
      }
    };

    const handleDisconnectEvent = () => {
      console.log('Wallet disconnected');
      handleDisconnect();
    };

    if (walletType === 'metamask' && typeof window !== "undefined" && window.ethereum) {
      window.ethereum.on("accountsChanged", handleAccountsChanged as never);
      window.ethereum.on("chainChanged", handleChainChanged as never);
      window.ethereum.on("disconnect", handleDisconnectEvent as never);
    } else if (walletType === 'walletconnect' && walletProvider) {
      walletProvider.on("accountsChanged", handleAccountsChanged);
      walletProvider.on("chainChanged", handleChainChanged);
      walletProvider.on("disconnect", handleDisconnectEvent);
    }

    return () => {
      if (walletType === 'metamask' && typeof window !== "undefined" && window.ethereum) {
        window.ethereum.removeListener("accountsChanged", handleAccountsChanged as never);
        window.ethereum.removeListener("chainChanged", handleChainChanged as never);
        window.ethereum.removeListener("disconnect", handleDisconnectEvent as never);
      } else if (walletType === 'walletconnect' && walletProvider) {
        walletProvider.removeListener("accountsChanged", handleAccountsChanged);
        walletProvider.removeListener("chainChanged", handleChainChanged);
        walletProvider.removeListener("disconnect", handleDisconnectEvent);
      }
    };
  }, [account, setCurrentChainId, walletProvider, walletType]);

  const checkExistingConnection = async () => {
    if (typeof window !== "undefined" && window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ 
          method: "eth_accounts" 
        }) as string[];
        
        if (accounts.length > 0) {
          setWalletProvider(window.ethereum);
          setWalletType('metamask');
          await checkConnection(accounts[0]);
        }
      } catch (error) {
        console.error("Error checking existing connection:", error);
      }
    }
  };

  const checkConnection = async (address: string) => {
    if (!walletProvider) {
      setNetworkError("Wallet provider not found");
      return;
    }

    try {
      const chainIdResult = await walletProvider.request({ method: "eth_chainId" });
      const chainIdNumber = typeof chainIdResult === 'string' 
        ? parseInt(chainIdResult, 16) 
        : chainIdResult;
      
      const network = getNetworkConfig(chainIdNumber);

      if (!network) {
        setNetworkError("Unsupported network");
        setIsConnected(false);
        setAccount("");
        setWalletInfo(null);
        setCurrentNetwork(null);
        setCurrentChainId(0);
        return;
      }

      const balance = await walletProvider.request({
        method: "eth_getBalance",
        params: [address, "latest"],
      }) as string;

      const balanceInEth = (parseInt(balance, 16) / 1e18).toFixed(4);

      setWalletInfo({
        address,
        balance: balanceInEth,
        network: {
          name: network.name,
          chainId: chainIdNumber,
          symbol: network.symbol,
          isTestnet: network.isTestnet,
        },
      });

      setCurrentNetwork(network);
      setCurrentChainId(chainIdNumber);
      setIsConnected(true);
      setAccount(address);
      setNetworkError("");
    } catch (error) {
      console.error("Error checking connection:", error);
      setNetworkError("Failed to verify connection");
    }
  };

  const switchNetwork = async (networkConfig: NetworkConfig): Promise<void> => {
    if (!walletProvider) {
      alert("Wallet not connected");
      return;
    }

    try {
      setIsNetworkDropdownOpen(false);
      
      await walletProvider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: `0x${networkConfig.chainId.toString(16)}` }],
      });
      
      setCurrentNetwork(networkConfig);
      setCurrentChainId(networkConfig.chainId);
      setNetworkError("");
      
      if (account) {
        await checkConnection(account);
      }
    } catch (switchError: unknown) {
      const error = switchError as ErrorWithCode;
      if (error.code === 4902) {
        try {
          await walletProvider.request({
            method: "wallet_addEthereumChain",
            params: [{
              chainId: `0x${networkConfig.chainId.toString(16)}`,
              chainName: networkConfig.name,
              nativeCurrency: {
                name: networkConfig.symbol,
                symbol: networkConfig.symbol,
                decimals: 18,
              },
              rpcUrls: [networkConfig.rpcUrl],
              blockExplorerUrls: [networkConfig.blockExplorer],
            }],
          });
          
          setCurrentNetwork(networkConfig);
          setCurrentChainId(networkConfig.chainId);
          setNetworkError("");
        } catch (addError) {
          console.error("Error adding network:", addError);
          setNetworkError(`Failed to add ${networkConfig.name}`);
        }
      } else if (error.code === 4001) {
        console.log("User rejected network switch");
      } else {
        console.error("Error switching network:", switchError);
        setNetworkError("Failed to switch network");
      }
    }
  };

  const navigateToTab = (tab: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('tab', tab);
    router.push(`?${params.toString()}`, { scroll: false });
  };

  const connectWallet = async (
    walletTypeParam: string = "metamask", 
    provider?: WalletConnectProvider
  ): Promise<void> => {
    setIsConnecting(true);
    setNetworkError("");
    
    try {
      if (walletTypeParam === "metamask") {
        if (typeof window === "undefined" || !window.ethereum) {
          alert("Please install MetaMask to connect your wallet.");
          return;
        }

        const accounts = await window.ethereum.request({
          method: "eth_requestAccounts",
        }) as string[];

        if (accounts.length === 0) {
          throw new Error("No accounts found");
        }

        setWalletProvider(window.ethereum);
        setWalletType('metamask');

        const chainId = await window.ethereum.request({ method: "eth_chainId" }) as string;
        const chainIdNumber = parseInt(chainId, 16);
        const network = getNetworkConfig(chainIdNumber);

        if (!network) {
          setNetworkError("Please switch to a supported network");
          const supportedNetworks = getAllSupportedNetworks();
          if (supportedNetworks.length > 0) {
            await switchNetwork(supportedNetworks[0]);
          }
          return;
        }

        const balance = await window.ethereum.request({
          method: "eth_getBalance",
          params: [accounts[0], "latest"],
        }) as string;

        const balanceInEth = (parseInt(balance, 16) / 1e18).toFixed(4);

        setWalletInfo({
          address: accounts[0],
          balance: balanceInEth,
          network: {
            name: network.name,
            chainId: chainIdNumber,
            symbol: network.symbol,
            isTestnet: network.isTestnet,
          },
        });

        setCurrentNetwork(network);
        setCurrentChainId(chainIdNumber);
        setIsConnected(true);
        setAccount(accounts[0]);
        setIsWalletModalOpen(false);
        setNetworkError("");

      } else if (walletTypeParam === "walletconnect" && provider) {
        const accounts = provider.accounts;
        const chainId = provider.chainId;

        if (!accounts || accounts.length === 0) {
          throw new Error("No accounts found in WalletConnect");
        }

        setWalletProvider(provider);
        setWalletType('walletconnect');

        const network = getNetworkConfig(chainId);

        if (!network) {
          setNetworkError("Please switch to a supported network");
          const supportedNetworks = getAllSupportedNetworks();
          if (supportedNetworks.length > 0) {
            await switchNetwork(supportedNetworks[0]);
          }
          return;
        }

        const balance = await provider.request({
          method: "eth_getBalance",
          params: [accounts[0], "latest"],
        }) as string;

        const balanceInEth = (parseInt(balance, 16) / 1e18).toFixed(4);

        setWalletInfo({
          address: accounts[0],
          balance: balanceInEth,
          network: {
            name: network.name,
            chainId: chainId,
            symbol: network.symbol,
            isTestnet: network.isTestnet,
          },
        });

        setCurrentNetwork(network);
        setCurrentChainId(chainId);
        setIsConnected(true);
        setAccount(accounts[0]);
        setIsWalletModalOpen(false);
        setNetworkError("");

        console.log('✅ WalletConnect connected successfully');
      }
    } catch (error: unknown) {
      console.error("Error connecting wallet:", error);
      
      const err = error as ErrorWithCode;
      if (err.code === 4001) {
        setNetworkError("Connection request rejected");
      } else if (err.code === -32002) {
        setNetworkError("Please check your wallet for pending connection request");
      } else {
        setNetworkError(err.message || "Failed to connect wallet");
      }
      
      setIsConnected(false);
      setAccount("");
      setWalletInfo(null);
      setCurrentNetwork(null);
      setCurrentChainId(0);
      setWalletProvider(null);
      setWalletType(null);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async (): Promise<void> => {
    if (walletType === 'walletconnect' && walletProvider?.disconnect) {
      try {
        await walletProvider.disconnect();
      } catch (error) {
        console.error('Error disconnecting WalletConnect:', error);
      }
    }

    setIsConnected(false);
    setAccount("");
    setWalletInfo(null);
    setNetworkError("");
    setCurrentNetwork(null);
    setCurrentChainId(0);
    setIsOwner(false);
    setWalletProvider(null);
    setWalletType(null);
  };

  const navItems = [
    { id: "marketplace", label: "Marketplace", icon: Home },
    { id: "create", label: "Create", icon: Plus },
    { id: "my-nfts", label: "My NFTs", icon: User },
    ...(isOwner ? [{ id: "admin", label: "Admin", icon: Settings }] : []),
  ];

  return (
    <>
      <div className="fixed inset-x-0 top-0 h-20 bg-gradient-to-b from-black/20 via-black/10 to-transparent backdrop-blur-md z-40" />
      
      <header className="fixed inset-x-0 top-0 flex items-center justify-between px-4 md:px-8 py-4 z-50">
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
                {item.id === "admin" && isCheckingOwnership && (
                  <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                )}
              </button>
            );
          })}
        </nav>

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
                title={item.label}
              >
                <Icon className="h-4 w-4" />
              </button>
            );
          })}
        </nav>

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
              {currentNetwork && (
                <div className="relative">
                  <button
                    onClick={() => setIsNetworkDropdownOpen(!isNetworkDropdownOpen)}
                    className="hidden lg:flex items-center space-x-2 px-3 py-2 bg-black/30 border border-white/10 rounded-lg backdrop-blur-sm hover:bg-white/10 transition-all duration-200"
                  >
                    <div className={`w-2 h-2 rounded-full animate-pulse ${
                      isNetworkSupported(currentNetwork.chainId) ? 'bg-green-400' : 'bg-red-400'
                    }`} />
                    <span className="text-xs text-gray-300 font-medium">
                      {currentNetwork.name}
                    </span>
                    <ChevronDown className={`h-3 w-3 text-gray-400 transition-transform duration-200 ${
                      isNetworkDropdownOpen ? 'rotate-180' : ''
                    }`} />
                  </button>

                  {isNetworkDropdownOpen && (
                    <>
                      <div 
                        className="fixed inset-0 z-40" 
                        onClick={() => setIsNetworkDropdownOpen(false)}
                      />
                      <div className="absolute right-0 mt-2 w-64 bg-neutral-900 border border-white/10 rounded-lg shadow-xl backdrop-blur-xl z-50 overflow-hidden">
                        <div className="p-2 border-b border-white/10">
                          <p className="text-xs text-gray-400 font-medium px-2 py-1">
                            Select Network
                          </p>
                        </div>
                        <div className="max-h-80 overflow-y-auto">
                          {getAllSupportedNetworks().map((network) => (
                            <button
                              key={network.chainId}
                              onClick={() => switchNetwork(network)}
                              className={`w-full flex items-center justify-between px-3 py-2 hover:bg-white/5 transition-colors ${
                                currentNetwork.chainId === network.chainId ? 'bg-white/10' : ''
                              }`}
                            >
                              <div className="flex items-center space-x-3">
                                <div className={`w-2 h-2 rounded-full ${
                                  currentNetwork.chainId === network.chainId 
                                    ? 'bg-green-400' 
                                    : 'bg-gray-400'
                                }`} />
                                <div className="text-left">
                                  <p className="text-sm text-white font-medium">
                                    {network.name}
                                  </p>
                                  <p className="text-xs text-gray-400">
                                    {network.symbol}
                                  </p>
                                </div>
                              </div>
                              {currentNetwork.chainId === network.chainId && (
                                <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                </div>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              <Button 
                size="sm" 
                variant="outline"
                className="bg-black/30 border-white/10 hover:bg-white/10 text-white hover:text-white h-10 w-10 p-0 backdrop-blur-sm transition-all duration-200 hover:scale-105"
              >
                <ShoppingCart className="h-4 w-4" />
              </Button>

              <div className="relative">
                <WalletProfileDropdown
                  account={account}
                  balance={walletInfo ? `${walletInfo.balance} ${currentNetwork?.symbol || 'ETH'}` : "0 ETH"}
                  onDisconnect={handleDisconnect}
                  walletType={walletType}
                  currentNetwork={currentNetwork}
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