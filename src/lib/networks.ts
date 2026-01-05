// lib/networks.ts
export interface NetworkConfig {
  chainId: number;
  name: string;
  symbol: string;
  rpcUrl: string;
  blockExplorer: string;
  contractAddress: string;
  isTestnet: boolean;
  faucets?: string[];
}

export const SUPPORTED_NETWORKS: Record<number, NetworkConfig> = {
  11155111: {
    chainId: 11155111,
    name: 'Sepolia Testnet',
    symbol: 'SepoliaETH',
    rpcUrl: 'https://eth-sepolia.g.alchemy.com/v2/rxUcWxJuV1W4pIY79qeptqyeAf8KaKUk',
    blockExplorer: 'https://sepolia.etherscan.io',
    contractAddress: '0x4a5056236e5C92700c2F883EE86Bc5f0AFaBc957',
    isTestnet: true,
    faucets: [
      'https://sepoliafaucet.com/',
      'https://cloud.google.com/application/web3/faucet/ethereum/sepolia'
    ]
  },

  14601: {
    chainId: 14601,
    name: 'Sonic Testnet',
    symbol: 'S',
    rpcUrl: 'https://rpc.testnet.soniclabs.com',
    blockExplorer: 'https://testnet.sonicscan.org',
    contractAddress: '0x286C776439Be2cEA7823F2c4FB0845aA7cC95003',
    isTestnet: true,
    faucets: [
      'https://testnet.soniclabs.com/account'
    ]
  }
};

export const DEFAULT_NETWORK = SUPPORTED_NETWORKS[11155111];

export const getNetworkConfig = (chainId: number): NetworkConfig | undefined => {
  return SUPPORTED_NETWORKS[chainId];
};

export const isNetworkSupported = (chainId: number): boolean => {
  return chainId in SUPPORTED_NETWORKS;
};

export const getAllSupportedNetworks = (): NetworkConfig[] => {
  return Object.values(SUPPORTED_NETWORKS);
};