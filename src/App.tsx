"use client";

import { usePrivy, useLogin } from "@privy-io/react-auth";
import {
  useAlchemySendTransaction,
  useAlchemyPrepareSwap,
  useAlchemySubmitSwap,
  type PrepareSwapResult,
} from "@account-kit/privy-integration";
import {
  createPublicClient,
  http,
  formatEther,
  formatUnits,
  parseEther,
  isAddress,
  type Address,
  type Hex,
} from "viem";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, ArrowDownUp, Send, LogOut, Wallet } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { toast, Toaster } from "sonner";

// ERC20 ABI for balanceOf function
const ERC20_ABI = [
  {
    constant: true,
    inputs: [{ name: "_owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "balance", type: "uint256" }],
    type: "function",
  },
] as const;

export default function App() {
  const { sendTransaction, isLoading } = useAlchemySendTransaction();
  const prepareSwap = useAlchemyPrepareSwap();
  const submitSwap = useAlchemySubmitSwap();
  const { wallets } = useWallets();

  const [balance, setBalance] = useState<string | null>(null);
  const [usdcBalance, setUsdcBalance] = useState<string | null>(null);
  const [wethBalance, setWethBalance] = useState<string | null>(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [currentChain, setCurrentChain] = useState<number | null>(null);
  const [isSwitchingChain, setIsSwitchingChain] = useState(false);

  // Token addresses - chain specific
  const TOKEN_ADDRESSES: Record<
    number,
    { USDC: string; WETH: string } | undefined
  > = {
    [base.id]: {
      USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      WETH: "0x4200000000000000000000000000000000000006",
    },
    [baseSepolia.id]: {
      USDC: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
      WETH: "0x4200000000000000000000000000000000000006",
    },
  };

  const USDC_ADDRESS = currentChain
    ? TOKEN_ADDRESSES[currentChain]?.USDC
    : undefined;
  const WETH_ADDRESS = currentChain
    ? TOKEN_ADDRESSES[currentChain]?.WETH
    : undefined;

  // Send transaction form state
  const [recipientAddress, setRecipientAddress] = useState("");
  const [amount, setAmount] = useState("0.001");
  const [addressError, setAddressError] = useState("");

  // Swap form state
  const [fromToken, setFromToken] = useState(
    "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
  );
  const [toToken, setToToken] = useState(
    "0x4200000000000000000000000000000000000006"
  );
  const [swapAmount, setSwapAmount] = useState("1");
  const [swapAmountType, setSwapAmountType] = useState<"from" | "minimumTo">(
    "from"
  );
  const [preparedSwap, setPreparedSwap] = useState<PrepareSwapResult | null>(
    null
  );

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

  // Fetch balances when authenticated or chain changes
  useEffect(() => {
    const fetchBalances = async () => {
      if (!authenticated || !user?.wallet?.address || currentChain === null) {
        setBalance(null);
        setUsdcBalance(null);
        setWethBalance(null);
        return;
      }

      setIsLoadingBalance(true);
      try {
        const chain = currentChain === base.id ? base : baseSepolia;
        console.log("Fetching balances on chain:", chain.id, chain.name);
        const publicClient = createPublicClient({
          chain,
          transport: http(),
        });

        // Fetch ETH balance
        const balanceWei = await publicClient.getBalance({
          address: user.wallet.address as Address,
        });
        console.log("balanceWei", balanceWei);
        setBalance(formatEther(balanceWei));

        // Fetch USDC balance
        if (USDC_ADDRESS) {
          try {
            const usdcBalanceWei = await publicClient.readContract({
              address: USDC_ADDRESS as Address,
              abi: ERC20_ABI,
              functionName: "balanceOf",
              args: [user.wallet.address as Address],
            });
            // USDC uses 6 decimals
            setUsdcBalance(formatUnits(usdcBalanceWei as bigint, 6));
          } catch (error) {
            console.error("Failed to fetch USDC balance:", error);
            setUsdcBalance("0");
          }
        } else {
          setUsdcBalance("N/A");
        }

        // Fetch WETH balance
        if (WETH_ADDRESS) {
          try {
            const wethBalanceWei = await publicClient.readContract({
              address: WETH_ADDRESS as Address,
              abi: ERC20_ABI,
              functionName: "balanceOf",
              args: [user.wallet.address as Address],
            });
            setWethBalance(formatEther(wethBalanceWei as bigint));
          } catch (error) {
            console.error("Failed to fetch WETH balance:", error);
            setWethBalance("0");
          }
        } else {
          setWethBalance("N/A");
        }
      } catch (error) {
        console.error("Failed to fetch balances:", error);
        setBalance("Error");
        setUsdcBalance("Error");
        setWethBalance("Error");
      } finally {
        setIsLoadingBalance(false);
      }
    };

    fetchBalances();
  }, [
    authenticated,
    user?.wallet?.address,
    currentChain,
    USDC_ADDRESS,
    WETH_ADDRESS,
  ]);

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

  const handlePrepareSwap = async () => {
    if (!fromToken || !isAddress(fromToken)) {
      toast.error("Please enter a valid from token address");
      return;
    }

    if (!toToken || !isAddress(toToken)) {
      toast.error("Please enter a valid to token address");
      return;
    }

    if (!swapAmount || Number.parseFloat(swapAmount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    try {
      let minimumToAmount: bigint;

      if (swapAmountType === "from") {
        // User entered amount to SEND - we need to calculate a reasonable minimumToAmount
        // For now, use a small minimumToAmount (0.000001) to get a quote
        // In production, you'd want to get a quote first to know expected output
        minimumToAmount = parseEther("0.000001");
      } else {
        // User entered minimum amount to RECEIVE
        // Determine decimals based on toToken
        const isToTokenUsdc =
          toToken.toLowerCase() === USDC_ADDRESS?.toLowerCase();
        minimumToAmount = isToTokenUsdc
          ? BigInt(Number.parseFloat(swapAmount) * 10 ** 6)
          : parseEther(swapAmount);
      }

      const result = await prepareSwap.prepareSwap({
        from: user?.wallet?.address as Address,
        fromToken: fromToken as Address,
        toToken: toToken as Address,
        minimumToAmount: `0x${minimumToAmount.toString(16)}` as Hex,
      });

      setPreparedSwap(result);
      toast.success("Swap quote prepared successfully");
    } catch (error) {
      console.error("Failed to prepare swap:", error);
      toast.error(
        `Failed to prepare swap: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  };

  const handleExecuteSwap = async () => {
    if (!preparedSwap) return;

    try {
      const result = await submitSwap.submitSwap(preparedSwap);
      toast.success(`Swap successful! Transaction: ${result.txnHash}`);

      setPreparedSwap(null);
      setToToken("");
      setSwapAmount("1");
      prepareSwap.reset();
      submitSwap.reset();
    } catch (error) {
      console.error("Swap failed:", error);
      toast.error(
        `Swap failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  };

  const handleCancelSwap = () => {
    setPreparedSwap(null);
    prepareSwap.reset();
    submitSwap.reset();
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
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="text-lg">Account Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-col gap-1">
                    <span className="text-sm text-muted-foreground">Email</span>
                    <span className="font-mono text-sm">
                      {user?.email?.address}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex flex-col gap-1">
                    <span className="text-sm text-muted-foreground">
                      Wallet Address
                    </span>
                    <span className="font-mono text-sm break-all">
                      {user?.wallet?.address}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex flex-col gap-1">
                    <span className="text-sm text-muted-foreground">
                      ETH Balance
                    </span>
                    <span className="text-lg font-semibold">
                      {isLoadingBalance ? (
                        <span className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Loading...
                        </span>
                      ) : balance ? (
                        `${Number.parseFloat(balance).toFixed(6)} ETH`
                      ) : (
                        "—"
                      )}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex flex-col gap-1">
                    <span className="text-sm text-muted-foreground">
                      USDC Balance
                    </span>
                    <span className="text-lg font-semibold">
                      {isLoadingBalance ? (
                        <span className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Loading...
                        </span>
                      ) : usdcBalance ? (
                        `${Number.parseFloat(usdcBalance).toFixed(2)} USDC`
                      ) : (
                        "—"
                      )}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex flex-col gap-1">
                    <span className="text-sm text-muted-foreground">
                      WETH Balance
                    </span>
                    <span className="text-lg font-semibold">
                      {isLoadingBalance ? (
                        <span className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Loading...
                        </span>
                      ) : wethBalance ? (
                        `${Number.parseFloat(wethBalance).toFixed(6)} WETH`
                      ) : (
                        "—"
                      )}
                    </span>
                  </div>
                  <Separator />
                  <Button
                    onClick={logout}
                    variant="destructive"
                    className="w-full mt-4"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </Button>
                </CardContent>
              </Card>
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
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ArrowDownUp className="h-5 w-5" />
                    Token Swap
                  </CardTitle>
                  <CardDescription>
                    Swap tokens on Base network (mainnet only)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!preparedSwap ? (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="fromToken">From Token</Label>
                        <Input
                          id="fromToken"
                          type="text"
                          value={fromToken}
                          onChange={(e) => setFromToken(e.target.value)}
                          placeholder="0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"
                          className="font-mono text-sm"
                        />
                        <p className="text-xs text-muted-foreground">
                          ETH: 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="toToken">To Token</Label>
                        <Input
                          id="toToken"
                          type="text"
                          value={toToken}
                          onChange={(e) => setToToken(e.target.value)}
                          placeholder="0x..."
                          className="font-mono text-sm"
                        />
                        <p className="text-xs text-muted-foreground">
                          USDC (Base Sepolia):
                          0x036CbD53842c5426634e7929541eC2318f3dCF7e
                        </p>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="swapAmount">
                            {swapAmountType === "from"
                              ? "Amount to Send"
                              : "Minimum to Receive"}
                          </Label>
                          <Button
                            variant="ghost"
                            size="sm"
                            type="button"
                            onClick={() =>
                              setSwapAmountType((prev) =>
                                prev === "from" ? "minimumTo" : "from"
                              )
                            }
                            className="h-auto p-1 text-xs"
                          >
                            Switch
                          </Button>
                        </div>
                        <Input
                          id="swapAmount"
                          type="number"
                          value={swapAmount}
                          onChange={(e) => setSwapAmount(e.target.value)}
                          placeholder={
                            swapAmountType === "from" ? "1" : "0.001"
                          }
                          step="0.01"
                          min="0"
                        />
                        <p className="text-xs text-muted-foreground">
                          {swapAmountType === "from"
                            ? "Enter how much you want to send"
                            : "Enter minimum amount you want to receive"}
                        </p>
                      </div>

                      <Button
                        onClick={handlePrepareSwap}
                        disabled={prepareSwap.isLoading}
                        className="w-full"
                      >
                        {prepareSwap.isLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Getting Quote...
                          </>
                        ) : (
                          "Get Swap Quote"
                        )}
                      </Button>
                    </>
                  ) : (
                    <div className="space-y-4">
                      <Alert>
                        <AlertDescription className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm font-medium">
                              From Amount:
                            </span>
                            <span className="font-mono text-sm">
                              {formatEther(
                                BigInt(preparedSwap.quote.fromAmount)
                              )}{" "}
                              tokens
                            </span>
                          </div>
                          <Separator />
                          <div className="flex justify-between">
                            <span className="text-sm font-medium">
                              Minimum You'll Receive:
                            </span>
                            <span className="font-mono text-sm">
                              {formatEther(
                                BigInt(preparedSwap.quote.minimumToAmount)
                              )}{" "}
                              tokens
                            </span>
                          </div>
                          <Separator />
                          <div className="flex justify-between">
                            <span className="text-sm font-medium">
                              Expires:
                            </span>
                            <span className="text-sm">
                              {new Date(
                                Number.parseInt(preparedSwap.quote.expiry, 16) *
                                  1000
                              ).toLocaleString()}
                            </span>
                          </div>
                        </AlertDescription>
                      </Alert>

                      <div className="flex gap-3">
                        <Button
                          onClick={handleExecuteSwap}
                          disabled={submitSwap.isLoading}
                          className="flex-1"
                        >
                          {submitSwap.isLoading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Executing...
                            </>
                          ) : (
                            "Confirm Swap"
                          )}
                        </Button>

                        <Button
                          onClick={handleCancelSwap}
                          disabled={submitSwap.isLoading}
                          variant="outline"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
