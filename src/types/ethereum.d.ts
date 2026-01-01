
interface EthereumRequestArgs {
  method: string;
  params?: unknown[];
}

// Use generic type parameter for event callbacks to allow proper typing
interface EthereumProvider {
  isMetaMask?: boolean;
  request: (args: EthereumRequestArgs) => Promise<unknown>;
  on<T = unknown>(event: string, callback: (...args: T[]) => void): void;
  removeListener<T = unknown>(event: string, callback: (...args: T[]) => void): void;
  selectedAddress?: string;
}

interface Window {
  ethereum?: EthereumProvider;
}