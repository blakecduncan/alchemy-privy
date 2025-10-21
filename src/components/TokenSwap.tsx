import { useState } from "react";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, ArrowDownUp, ArrowLeftRight } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  useAlchemyPrepareSwap,
  useAlchemySubmitSwap,
  useAlchemyClient,
  type PrepareSwapResult,
} from "@account-kit/privy-integration";
import { formatEther, formatUnits, type Address, type Hex } from "viem";
import { base } from "viem/chains";
import type { User } from "@privy-io/react-auth";
import { AlertCircle } from "lucide-react";

// Hardcoded token addresses
const ETH_ADDRESS = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
const USDC_ADDRESS_BASE = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

interface TokenSwapProps {
  user: User | null;
  currentChain: number | null;
  onSuccess?: () => void;
}

export function TokenSwap({ currentChain, onSuccess }: TokenSwapProps) {
  const prepareSwap = useAlchemyPrepareSwap();
  const submitSwap = useAlchemySubmitSwap();
  const { getClient } = useAlchemyClient();

  // Swap direction: true = ETH -> USDC, false = USDC -> ETH
  const [ethToUsdc, setEthToUsdc] = useState(true);
  const [swapAmount, setSwapAmount] = useState("0.01");
  const [preparedSwap, setPreparedSwap] = useState<PrepareSwapResult | null>(
    null
  );

  const handlePrepareSwap = async () => {
    if (!swapAmount || Number.parseFloat(swapAmount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    try {
      const fromToken = ethToUsdc ? ETH_ADDRESS : USDC_ADDRESS_BASE;
      const toToken = ethToUsdc ? USDC_ADDRESS_BASE : ETH_ADDRESS;

      // Calculate the actual amount to swap based on user input and token decimals
      const fromDecimals = ethToUsdc ? 18 : 6;
      const amountInSmallestUnit = BigInt(
        Number.parseFloat(swapAmount) * 10 ** fromDecimals
      );

      const { account } = await getClient();
      const fromAddress = account.address;

      const result = await prepareSwap.prepareSwap({
        from: fromAddress,
        fromToken: fromToken as Address,
        toToken: toToken as Address,
        fromAmount: `0x${amountInSmallestUnit.toString(16)}` as Hex,
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
      setSwapAmount("0.01");
      prepareSwap.reset();
      submitSwap.reset();

      // Trigger balance refresh
      if (onSuccess) {
        onSuccess();
      }
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

  const handleFlipDirection = () => {
    if (preparedSwap) return; // Don't allow flipping during active swap
    setEthToUsdc(!ethToUsdc);
  };

  const fromTokenSymbol = ethToUsdc ? "ETH" : "USDC";
  const toTokenSymbol = ethToUsdc ? "USDC" : "ETH";
  const fromTokenDecimals = ethToUsdc ? 18 : 6;
  const toTokenDecimals = ethToUsdc ? 6 : 18;

  // Check if we're on Base mainnet
  const isMainnet = currentChain === base.id;
  const isDisabled = !isMainnet || prepareSwap.isLoading;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ArrowDownUp className="h-5 w-5" />
          Token Swap
        </CardTitle>
        <CardDescription>Swap ETH and USDC on Base mainnet</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isMainnet && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Token swaps are only available on mainnet chains. Please switch to
              Base mainnet to use this feature.
            </AlertDescription>
          </Alert>
        )}

        {!preparedSwap ? (
          <>
            {/* Swap Direction Display */}
            <div className="space-y-3">
              <div className="rounded-lg border border-border p-4 bg-muted/50">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-muted-foreground">From</span>
                    <span className="text-lg font-semibold">
                      {fromTokenSymbol}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleFlipDirection}
                    disabled={isDisabled}
                    className="h-10 w-10"
                  >
                    <ArrowLeftRight className="h-5 w-5" />
                  </Button>
                  <div className="flex flex-col gap-1 items-end">
                    <span className="text-xs text-muted-foreground">To</span>
                    <span className="text-lg font-semibold">
                      {toTokenSymbol}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="swapAmount">Amount to Swap</Label>
                <div className="relative">
                  <Input
                    id="swapAmount"
                    type="number"
                    value={swapAmount}
                    onChange={(e) => setSwapAmount(e.target.value)}
                    placeholder="0.01"
                    step={ethToUsdc ? "0.001" : "1"}
                    min="0"
                    className="pr-16"
                    disabled={!isMainnet}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">
                    {fromTokenSymbol}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Enter the amount of {fromTokenSymbol} you want to swap
                </p>
              </div>
            </div>

            <Button
              onClick={handlePrepareSwap}
              disabled={isDisabled}
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
                  <span className="text-sm font-medium">You'll Send:</span>
                  <span className="font-mono text-sm font-semibold">
                    {fromTokenDecimals === 18
                      ? Number(
                          formatEther(BigInt(preparedSwap.quote.fromAmount))
                        ).toFixed(6)
                      : Number(
                          formatUnits(BigInt(preparedSwap.quote.fromAmount), 6)
                        ).toFixed(2)}{" "}
                    {fromTokenSymbol}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-sm font-medium">
                    You'll Receive (min):
                  </span>
                  <span className="font-mono text-sm font-semibold">
                    {toTokenDecimals === 18
                      ? Number(
                          formatEther(
                            BigInt(preparedSwap.quote.minimumToAmount)
                          )
                        ).toFixed(6)
                      : Number(
                          formatUnits(
                            BigInt(preparedSwap.quote.minimumToAmount),
                            6
                          )
                        ).toFixed(2)}{" "}
                    {toTokenSymbol}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Quote Expires:</span>
                  <span className="text-sm">
                    {new Date(
                      Number.parseInt(preparedSwap.quote.expiry, 16) * 1000
                    ).toLocaleTimeString()}
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
  );
}
