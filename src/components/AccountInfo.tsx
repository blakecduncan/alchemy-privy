import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Loader2, LogOut } from "lucide-react";
import type { User } from "@privy-io/react-auth";
import { useAlchemyClient } from "@account-kit/privy-integration";
import { useEffect, useState } from "react";
import {
  createPublicClient,
  http,
  formatEther,
  formatUnits,
  type Address,
} from "viem";
import { baseSepolia, base } from "viem/chains";

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

interface AccountInfoProps {
  user: User | null;
  authenticated: boolean;
  currentChain: number | null;
  usdcAddress: string | undefined;
  onLogout: () => void;
}

export function AccountInfo({
  user,
  authenticated,
  currentChain,
  usdcAddress,
  onLogout,
}: AccountInfoProps) {
  const { getClient } = useAlchemyClient();
  const [smartWalletAddress, setSmartWalletAddress] = useState<string | null>(
    null
  );
  const [balance, setBalance] = useState<string | null>(null);
  const [usdcBalance, setUsdcBalance] = useState<string | null>(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);

  // Fetch smart wallet address in owner mode
  useEffect(() => {
    const fetchSmartWalletAddress = async () => {
      if (!authenticated) {
        setSmartWalletAddress(null);
        return;
      }

      try {
        const { account } = await getClient();
        console.log("Smart wallet address:", account.address);
        console.log("Privy signer address:", user?.wallet?.address);
        setSmartWalletAddress(account.address);
      } catch (error) {
        console.error("Failed to get smart wallet address:", error);
      }
    };

    fetchSmartWalletAddress();
  }, [authenticated, getClient, user?.wallet?.address]);

  // Fetch balances when authenticated or chain changes
  useEffect(() => {
    const fetchBalances = async () => {
      // Use smart wallet address if available, otherwise fall back to Privy signer
      const addressToCheck = smartWalletAddress || user?.wallet?.address;

      if (!authenticated || !addressToCheck || currentChain === null) {
        setBalance(null);
        setUsdcBalance(null);
        return;
      }

      setIsLoadingBalance(true);
      try {
        const chain = currentChain === base.id ? base : baseSepolia;
        console.log("Fetching balances on chain:", chain.id, chain.name);
        console.log("Checking balances for address:", addressToCheck);
        const publicClient = createPublicClient({
          chain,
          transport: http(),
        });

        // Fetch ETH balance
        const balanceWei = await publicClient.getBalance({
          address: addressToCheck as Address,
        });
        console.log("balanceWei", balanceWei);
        setBalance(formatEther(balanceWei));

        // Fetch USDC balance
        if (usdcAddress) {
          try {
            const usdcBalanceWei = await publicClient.readContract({
              address: usdcAddress as Address,
              abi: ERC20_ABI,
              functionName: "balanceOf",
              args: [addressToCheck as Address],
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
      } catch (error) {
        console.error("Failed to fetch balances:", error);
        setBalance("Error");
        setUsdcBalance("Error");
      } finally {
        setIsLoadingBalance(false);
      }
    };

    fetchBalances();
  }, [
    authenticated,
    smartWalletAddress,
    user?.wallet?.address,
    currentChain,
    usdcAddress,
  ]);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Account Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-col gap-1">
          <span className="text-sm text-muted-foreground">Email</span>
          <span className="font-mono text-sm">{user?.email?.address}</span>
        </div>
        <Separator />
        <div className="flex flex-col gap-1">
          <span className="text-sm text-muted-foreground">
            Privy Signer Address
          </span>
          <span className="font-mono text-xs break-all">
            {user?.wallet?.address}
          </span>
        </div>
        <Separator />
        <div className="flex flex-col gap-1">
          <span className="text-sm text-muted-foreground">
            Smart Wallet Address (Owner Mode)
          </span>
          <span className="font-mono text-xs break-all">
            {smartWalletAddress || (
              <span className="flex items-center gap-2">
                <Loader2 className="h-3 w-3 animate-spin" />
                Loading...
              </span>
            )}
          </span>
        </div>
        <Separator />
        <div className="flex flex-col gap-1">
          <span className="text-sm text-muted-foreground">ETH Balance</span>
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
          <span className="text-sm text-muted-foreground">USDC Balance</span>
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
        <Button
          onClick={onLogout}
          variant="destructive"
          className="w-full mt-4"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </CardContent>
    </Card>
  );
}
