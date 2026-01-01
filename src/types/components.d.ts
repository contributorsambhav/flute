export interface BaseComponentProps {
  isConnected: boolean;
  account: string;
  currentChainId?: number;
}

// Use type alias instead of empty interface
export type NFTMarketplaceProps = BaseComponentProps;

export type CreateNFTProps = BaseComponentProps;

export type MyNFTsProps = BaseComponentProps;

export type AdminPanelProps = BaseComponentProps;
