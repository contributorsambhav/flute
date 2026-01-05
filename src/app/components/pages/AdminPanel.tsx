'use client';

import { AlertTriangle, CheckCircle, DollarSign, Loader2, TrendingUp, Wallet } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import React, { useCallback, useEffect, useState } from 'react';

import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { blockchainService } from '@/lib/blockchain';
import { getNetworkConfig } from '@/lib/networks';

interface AdminPanelProps {
  isConnected: boolean;
  account: string;
  currentChainId: number;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ isConnected, account, currentChainId }) => {
  const [isOwner, setIsOwner] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [contractBalance, setContractBalance] = useState<string>('0');
  const [totalFees, setTotalFees] = useState<string>('0');
  const [listingPrice, setListingPrice] = useState<string>('0');
  const [newListingPrice, setNewListingPrice] = useState<string>('');
  const [withdrawAmount, setWithdrawAmount] = useState<string>('');

  const [isWithdrawingFees, setIsWithdrawingFees] = useState<boolean>(false);
  const [isWithdrawingAmount, setIsWithdrawingAmount] = useState<boolean>(false);
  const [isUpdatingPrice, setIsUpdatingPrice] = useState<boolean>(false);

  const networkConfig = getNetworkConfig(currentChainId);
  const networkSymbol = networkConfig?.symbol || 'ETH';

  // Check if connected account is the contract owner
  // Check if connected account is the contract owner
  const checkOwnership = useCallback(async (): Promise<void> => {
    if (!isConnected || !account || !networkConfig) {
      setIsOwner(false);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Get contract address for current network
      const contractAddress = networkConfig.contractAddress;

      if (!contractAddress) {
        console.warn('No contract address for current network');
        setIsOwner(false);
        return;
      }

      // Create provider and contract instance using ethers.js
      const { ethers } = await import('ethers');

      if (!window.ethereum) {
        throw new Error('Ethereum provider not available');
      }

      const provider = new ethers.BrowserProvider(window.ethereum);

      // Minimal ABI for owner() function
      const minimalABI = ['function owner() view returns (address)'];

      const contract = new ethers.Contract(contractAddress, minimalABI, provider);

      // Call owner() function
      const ownerAddress = await contract.owner();

      // Compare addresses (case-insensitive)
      const isOwnerResult = account.toLowerCase() === ownerAddress.toLowerCase();

      setIsOwner(isOwnerResult);

      if (isOwnerResult) {
        console.log('✅ Admin access granted');
      }
    } catch (error) {
      console.error('Error checking ownership from contract:', error);
      setIsOwner(false);
    } finally {
      setLoading(false);
    }
  }, [isConnected, account, networkConfig]);
  // Load admin data
  const loadAdminData = useCallback(async (): Promise<void> => {
    if (!isOwner) return;

    try {
      const [balance, fees, price] = await Promise.all([blockchainService.getContractBalance(), blockchainService.getTotalFeesCollected(), blockchainService.getListingPrice()]);

      setContractBalance(balance);
      setTotalFees(fees);
      setListingPrice(price);
    } catch (error) {
      console.error('Error loading admin data:', error);
    }
  }, [isOwner]);

  useEffect(() => {
    checkOwnership();
  }, [checkOwnership]);

  useEffect(() => {
    if (isOwner) {
      loadAdminData();
      // Refresh data every 30 seconds
      const interval = setInterval(loadAdminData, 30000);
      return () => clearInterval(interval);
    }
  }, [isOwner, loadAdminData]);

  // Withdraw all fees
  const handleWithdrawFees = async (): Promise<void> => {
    const confirmed = window.confirm(`Withdraw all collected fees (${totalFees} ${networkSymbol})?\n\n` + `This will transfer all fees to your wallet.\n\n` + `Do you want to proceed?`);

    if (!confirmed) return;

    try {
      setIsWithdrawingFees(true);

      // Note: You need to add withdrawFees() function to your blockchain service
      // This should call the withdrawFees() function from your smart contract
      const txHash = await blockchainService.withdrawFees();

      alert(`Fees withdrawn successfully!\n\n` + `Transaction Hash: ${txHash}\n\n` + `You can view it on ${networkConfig?.blockExplorer}/tx/${txHash}`);

      // Reload admin data
      await loadAdminData();
    } catch (error) {
      console.error('Error withdrawing fees:', error);
      alert(`Failed to withdraw fees: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsWithdrawingFees(false);
    }
  };

  // Withdraw specific amount
  const handleWithdrawAmount = async (): Promise<void> => {
    const amount = parseFloat(withdrawAmount);

    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid amount greater than 0');
      return;
    }

    const contractBalanceNum = parseFloat(contractBalance);
    if (amount > contractBalanceNum) {
      alert(`Amount exceeds contract balance (${contractBalance} ${networkSymbol})`);
      return;
    }

    const confirmed = window.confirm(`Withdraw ${withdrawAmount} ${networkSymbol}?\n\n` + `This will transfer the specified amount to your wallet.\n\n` + `Do you want to proceed?`);

    if (!confirmed) return;

    try {
      setIsWithdrawingAmount(true);

      // Note: You need to add withdrawAmount() function to your blockchain service
      const txHash = await blockchainService.withdrawAmount(withdrawAmount);

      alert(`Amount withdrawn successfully!\n\n` + `Transaction Hash: ${txHash}\n\n` + `You can view it on ${networkConfig?.blockExplorer}/tx/${txHash}`);

      setWithdrawAmount('');
      await loadAdminData();
    } catch (error) {
      console.error('Error withdrawing amount:', error);
      alert(`Failed to withdraw amount: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsWithdrawingAmount(false);
    }
  };

  // Update listing price
  const handleUpdateListingPrice = async (): Promise<void> => {
    const price = parseFloat(newListingPrice);

    if (isNaN(price) || price < 0) {
      alert('Please enter a valid price (0 or greater)');
      return;
    }

    const confirmed = window.confirm(`Update listing price to ${newListingPrice} ${networkSymbol}?\n\n` + `Current price: ${listingPrice} ${networkSymbol}\n` + `New price: ${newListingPrice} ${networkSymbol}\n\n` + `Do you want to proceed?`);

    if (!confirmed) return;

    try {
      setIsUpdatingPrice(true);

      // Note: You need to add updateListingPrice() function to your blockchain service
      const txHash = await blockchainService.updateListingPrice(newListingPrice);

      alert(`Listing price updated successfully!\n\n` + `Transaction Hash: ${txHash}\n\n` + `You can view it on ${networkConfig?.blockExplorer}/tx/${txHash}`);

      setNewListingPrice('');
      await loadAdminData();
    } catch (error) {
      console.error('Error updating listing price:', error);
      alert(`Failed to update listing price: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsUpdatingPrice(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-white text-xl flex items-center space-x-3">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Loading admin panel...</span>
        </div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <Wallet className="w-16 h-16 text-white/30 mb-4" />
        <h2 className="text-white text-2xl font-bold mb-2">Connect Your Wallet</h2>
        <p className="text-white/70">Please connect your wallet to access the admin panel</p>
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <AlertTriangle className="w-16 h-16 text-red-400 mb-4" />
        <h2 className="text-white text-2xl font-bold mb-2">Access Denied</h2>
        <p className="text-white/70">You are not authorized to access the admin panel</p>
        <p className="text-white/50 text-sm mt-2">Only the contract owner can access this page</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Admin Dashboard</h1>
        <p className="text-white/70">Manage your NFT marketplace and withdraw collected fees</p>
        <div className="mt-3 inline-flex items-center px-3 py-1 bg-green-500/20 border border-green-500/30 rounded-full">
          <CheckCircle className="w-4 h-4 text-green-400 mr-2" />
          <span className="text-green-400 text-sm font-medium">Verified Owner</span>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-white/5 border-white/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-sm font-medium flex items-center">
              <Wallet className="w-4 h-4 mr-2" />
              Contract Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-white">
              {contractBalance} {networkSymbol}
            </p>
            <p className="text-white/60 text-xs mt-1">Total funds in contract</p>
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-white/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-sm font-medium flex items-center">
              <TrendingUp className="w-4 h-4 mr-2" />
              Total Fees Collected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-white">
              {totalFees} {networkSymbol}
            </p>
            <p className="text-white/60 text-xs mt-1">Accumulated listing fees</p>
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-white/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-sm font-medium flex items-center">
              <DollarSign className="w-4 h-4 mr-2" />
              Current Listing Price
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-white">
              {listingPrice} {networkSymbol}
            </p>
            <p className="text-white/60 text-xs mt-1">Fee to list NFT for sale</p>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Withdraw All Fees */}
        <Card className="bg-white/5 border-white/20">
          <CardHeader>
            <CardTitle className="text-white">Withdraw All Fees</CardTitle>
            <CardDescription className="text-white/70">Withdraw all accumulated listing fees to your wallet</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <p className="text-blue-400 text-sm font-medium mb-1">Available to Withdraw</p>
              <p className="text-white text-2xl font-bold">
                {totalFees} {networkSymbol}
              </p>
            </div>
            <Button onClick={handleWithdrawFees} disabled={isWithdrawingFees || parseFloat(totalFees) <= 0} className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50">
              {isWithdrawingFees ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Withdrawing...
                </>
              ) : (
                <>
                  <Wallet className="mr-2 h-4 w-4" />
                  Withdraw All Fees
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Withdraw Specific Amount */}
        <Card className="bg-white/5 border-white/20">
          <CardHeader>
            <CardTitle className="text-white">Withdraw Specific Amount</CardTitle>
            <CardDescription className="text-white/70">Withdraw a specific amount from the contract balance</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-white text-sm font-medium block mb-2">Amount ({networkSymbol})</label>
              <Input type="number" step="0.001" min="0" max={contractBalance} placeholder="0.1" value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} className="bg-white/10 border-white/20 text-white" />
              <p className="text-white/50 text-xs mt-1">
                Max: {contractBalance} {networkSymbol}
              </p>
            </div>
            <Button onClick={handleWithdrawAmount} disabled={isWithdrawingAmount || !withdrawAmount || parseFloat(withdrawAmount) <= 0 || parseFloat(withdrawAmount) > parseFloat(contractBalance)} className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50">
              {isWithdrawingAmount ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Withdrawing...
                </>
              ) : (
                <>
                  <DollarSign className="mr-2 h-4 w-4" />
                  Withdraw Amount
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Update Listing Price */}
        <Card className="bg-white/5 border-white/20 md:col-span-2">
          <CardHeader>
            <CardTitle className="text-white">Update Listing Price</CardTitle>
            <CardDescription className="text-white/70">Change the fee required to list an NFT for sale on the marketplace</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-white text-sm font-medium block mb-2">New Listing Price ({networkSymbol})</label>
                <Input type="number" step="0.001" min="0" placeholder={listingPrice} value={newListingPrice} onChange={(e) => setNewListingPrice(e.target.value)} className="bg-white/10 border-white/20 text-white" />
                <p className="text-white/50 text-xs mt-1">
                  Current: {listingPrice} {networkSymbol}
                </p>
              </div>
              <div className="flex items-end">
                <Button onClick={handleUpdateListingPrice} disabled={isUpdatingPrice || !newListingPrice || parseFloat(newListingPrice) < 0 || parseFloat(newListingPrice) === parseFloat(listingPrice)} className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50">
                  {isUpdatingPrice ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <TrendingUp className="mr-2 h-4 w-4" />
                      Update Listing Price
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <div className="flex items-start space-x-2">
                <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-yellow-200">
                  <p className="font-medium mb-1">Important</p>
                  <p>Changing the listing price will affect all future NFT listings. Existing listings will retain their original fees.</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminPanel;
