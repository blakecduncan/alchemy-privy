import { WalletClientSigner, type AuthorizationRequest } from "@aa-sdk/core";
import {
  createWalletClient,
  custom,
  type Address,
  type Hash,
  type Authorization,
} from "viem";
import {
  useWallets,
  useSignAuthorization,
  type ConnectedWallet as PrivyWallet,
} from "@privy-io/react-auth";
import {
  createSmartWalletClient,
  type SmartWalletClient,
} from "@account-kit/wallet-client";
import { alchemy } from "@account-kit/infra";
import { useSmartWalletsConfig } from "./Provider";
import { useCallback, useRef, useState } from "react";
import { getChain } from "./getChain";
import { toHex } from "viem";

export type CallData = {
  to: Address;
  data?: `0x${string}`;
  value?: string | number | bigint;
};

export function useSendSponsoredTransaction() {
  const { wallets } = useWallets();
  const { signAuthorization } = useSignAuthorization();
  const cfg = useSmartWalletsConfig();

  // State management replacing React Query
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<Hash | null>(null);

  // cache client instance – avoids re‑creation
  const clientRef = useRef<SmartWalletClient | null>(null);

  const getEmbeddedWallet = useCallback((): PrivyWallet => {
    const embedded = wallets.find((w) => w.walletClientType === "privy");
    if (!embedded) throw new Error("Embedded wallet not ready");
    return embedded;
  }, [wallets]);

  const getEmbeddedWalletChain = useCallback(() => {
    const embedded = getEmbeddedWallet();
    // Handle CAIP-2 format like "eip155:1"
    const chainIdStr = embedded.chainId?.toString();
    const numericChainId = chainIdStr?.includes(":")
      ? chainIdStr.split(":")[1]
      : chainIdStr;
    return getChain(Number(numericChainId));
  }, [getEmbeddedWallet]);

  const getClient = useCallback(async (): Promise<SmartWalletClient> => {
    if (clientRef.current) return clientRef.current;

    const embeddedWallet = getEmbeddedWallet();
    const chain = getEmbeddedWalletChain();
    const provider = await embeddedWallet.getEthereumProvider();

    const baseSigner = new WalletClientSigner(
      createWalletClient({
        account: embeddedWallet.address as Address,
        chain,
        transport: custom(provider),
      }),
      "privy"
    );

    const signer = {
      ...baseSigner,
      signAuthorization: async (
        unsignedAuth: AuthorizationRequest<number>
      ): Promise<Authorization<number, true>> => {
        const signature = await signAuthorization({
          ...unsignedAuth,
          contractAddress: unsignedAuth.address ?? unsignedAuth.contractAddress,
        });

        return {
          ...unsignedAuth,
          ...signature,
        };
      },
    };

    clientRef.current = createSmartWalletClient({
      chain,
      transport: alchemy({
        apiKey: cfg.apiKey,
      }),
      signer,
      policyId: cfg.policyId,
    });

    return clientRef.current;
  }, [
    getEmbeddedWallet,
    getEmbeddedWalletChain,
    signAuthorization,
    cfg.apiKey,
    cfg.policyId,
  ]);

  const sendSponsoredTransaction = useCallback(
    async (calls: CallData | CallData[]): Promise<Hash> => {
      setIsLoading(true);
      setError(null);

      try {
        const client = await getClient();
        const embeddedWallet = getEmbeddedWallet();

        // Normalize calls to array format and convert values to hex
        const callsArray = Array.isArray(calls) ? calls : [calls];
        const formattedCalls = callsArray.map((call) => ({
          to: call.to,
          data: call.data,
          value: toHex(call.value ?? 0n),
        }));

        // Send the calls with gas sponsorship
        const result = await client.sendCalls({
          from: embeddedWallet.address as Address,
          calls: formattedCalls,
          capabilities: {
            eip7702Auth: true,
            paymasterService: {
              policyId: cfg.policyId,
            },
          },
        });

        // Get the transaction hash from the result
        const txHash = await client.waitForCallsStatus({
          id: result.preparedCallIds[0],
          timeout: 60_000,
        });

        const hash = txHash.receipts?.[0]?.transactionHash as Hash;
        setData(hash);
        return hash;
      } catch (err) {
        const error =
          err instanceof Error ? err : new Error("Transaction failed");
        setError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [getClient, getEmbeddedWallet, cfg.policyId]
  );

  const reset = useCallback(() => {
    setError(null);
    setData(null);
    setIsLoading(false);
  }, []);

  return {
    sendSponsoredTransaction,
    isLoading,
    error,
    data,
    reset,
  };
}
