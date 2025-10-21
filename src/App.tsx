"use client";

import { usePrivy, useLogin } from "@privy-io/react-auth";
import { useAlchemySendTransaction } from "@account-kit/privy-integration";
import { parseEther, isAddress, type Address } from "viem";
import { baseSepolia, base } from "viem/chains";
import { useEffect, useState } from "react";
import { useWallets } from "@privy-io/react-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Send, Wallet } from "lucide-react";
import { toast, Toaster } from "sonner";
import { AccountInfo } from "@/components/AccountInfo";
import { TokenSwap } from "@/components/TokenSwap";

export default function App() {
  const { sendTransaction, isLoading } = useAlchemySendTransaction();
  const { wallets } = useWallets();

  const [currentChain, setCurrentChain] = useState<number | null>(null);
  const [isSwitchingChain, setIsSwitchingChain] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Token addresses - chain specific
  const TOKEN_ADDRESSES: Record<number, string | undefined> = {
    [base.id]: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    [baseSepolia.id]: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
  };

  const USDC_ADDRESS = currentChain ? TOKEN_ADDRESSES[currentChain] : undefined;

  // Send transaction form state
  const [recipientAddress, setRecipientAddress] = useState("");
  const [amount, setAmount] = useState("0.001");
  const [addressError, setAddressError] = useState("");

  const { ready, authenticated, user, logout } = usePrivy();
  const { login } = useLogin();
  const disableLogin = !ready || (ready && authenticated);

  // Sync UI state with wallet's actual chain on mount
  useEffect(() => {
    if (!authenticated || wallets.length === 0) return;

    const wallet = wallets.find((w) => w.walletClientType === "privy");
    if (!wallet) return;

    // Get wallet's current chain
    const walletChainIdStr = wallet.chainId?.toString();
    const walletChainId = walletChainIdStr?.includes(":")
      ? Number(walletChainIdStr.split(":")[1])
      : Number(walletChainIdStr);

    // Initialize UI state to match wallet's actual chain
    if (currentChain === null || currentChain !== walletChainId) {
      console.log(`Syncing UI to wallet's current chain: ${walletChainId}`);
      setCurrentChain(walletChainId);
    }
  }, [authenticated, wallets, currentChain]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const handleSendTransaction = async () => {
    if (!recipientAddress) {
      setAddressError("Address is required");
      return;
    }

    if (!isAddress(recipientAddress)) {
      setAddressError("Invalid Ethereum address");
      return;
    }

    setAddressError("");

    if (!amount || Number.parseFloat(amount) <= 0) {
      toast.error("Please enter a valid amount greater than 0");
      return;
    }

    try {
      const result = await sendTransaction({
        to: recipientAddress as Address,
        value: parseEther(amount),
        data: "0x",
      });

      toast.success(`Transaction sent: ${result.txnHash}`);

      setRecipientAddress("");
      setAmount("0.001");
    } catch (error) {
      console.error("Transaction failed:", error);
      toast.error(
        `Transaction failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  };

  const handleChainSwitch = async (chainId: string) => {
    const wallet = wallets.find((w) => w.walletClientType === "privy");
    if (!wallet) {
      toast.error("No wallet found");
      return;
    }

    const numChainId = Number(chainId);
    setIsSwitchingChain(true);
    try {
      console.log(`Switching wallet and UI to chain ${numChainId}`);
      // Switch the wallet first
      await wallet.switchChain(numChainId);
      // Then update UI state to match
      setCurrentChain(numChainId);
      toast.success(
        `Successfully switched to ${
          numChainId === base.id ? "Base" : "Base Sepolia"
        }`
      );
    } catch (error) {
      console.error("Failed to switch chain:", error);
      toast.error(
        `Failed to switch chain: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setIsSwitchingChain(false);
    }
  };

  if (!authenticated) {
    return (
      <>
        <Toaster richColors position="top-right" />
        <div className="flex min-h-screen items-center justify-center bg-background">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Welcome to DeFi App</CardTitle>
              <CardDescription>
                Connect your wallet to get started
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                disabled={disableLogin}
                onClick={login}
                className="w-full"
                size="lg"
              >
                <Wallet className="mr-2 h-5 w-5" />
                Connect Wallet
              </Button>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <Toaster richColors position="top-right" />
      <div className="min-h-screen bg-background p-4 md:p-8">
        <div className="mx-auto max-w-7xl space-y-6">
          {/* Header */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>

            <div className="flex items-center gap-3">
              <Label htmlFor="network-select" className="text-sm font-medium">
                Network
              </Label>
              <Select
                value={
                  currentChain !== null ? currentChain.toString() : undefined
                }
                onValueChange={handleChainSwitch}
                disabled={isSwitchingChain || currentChain === null}
              >
                <SelectTrigger id="network-select" className="w-[180px]">
                  <SelectValue placeholder="Loading..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={baseSepolia.id.toString()}>
                    Base Sepolia
                  </SelectItem>
                  <SelectItem value={base.id.toString()}>Base</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Two-column layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left column - Account Info */}
            <div className="lg:col-span-1">
              <AccountInfo
                user={user}
                authenticated={authenticated}
                currentChain={currentChain}
                usdcAddress={USDC_ADDRESS}
                onLogout={logout}
                refreshTrigger={refreshTrigger}
              />
            </div>

            {/* Right column - Transaction cards */}
            <div className="lg:col-span-2 space-y-6">
              {/* Send Transaction Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Send className="h-5 w-5" />
                    Send Transaction
                  </CardTitle>
                  <CardDescription>
                    Transfer ETH to another address
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="recipient">Recipient Address</Label>
                    <Input
                      id="recipient"
                      type="text"
                      value={recipientAddress}
                      onChange={(e) => {
                        setRecipientAddress(e.target.value);
                        setAddressError("");
                      }}
                      placeholder="0x..."
                      className={addressError ? "border-destructive" : ""}
                    />
                    {addressError && (
                      <p className="text-sm text-destructive">{addressError}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="amount">Amount (ETH)</Label>
                    <Input
                      id="amount"
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.001"
                      step="0.001"
                      min="0"
                    />
                  </div>

                  <Button
                    onClick={handleSendTransaction}
                    disabled={isLoading}
                    className="w-full"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        Send Transaction
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Token Swap Card */}
              <TokenSwap
                user={user}
                currentChain={currentChain}
                onSuccess={() => setRefreshTrigger((prev) => prev + 1)}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
