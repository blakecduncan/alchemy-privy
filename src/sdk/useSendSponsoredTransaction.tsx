import {
  type UserOperationCallData,
  type BatchUserOperationCallData,
  WalletClientSigner,
  type SmartAccountSigner,
} from "@aa-sdk/core";
import { createWalletClient, custom, type Hex, type Hash } from "viem";
import { useWallets, useSignAuthorization } from "@privy-io/react-auth";
import { createModularAccountV2Client } from "@account-kit/smart-contracts";
import { alchemy } from "@account-kit/infra";
import { useSmartWalletsConfig } from "./Provider";
import { useCallback, useRef, useState } from "react";
import { getChain } from "./getChain";

export function useSendSponsoredTransaction() {
  const { wallets } = useWallets();
  const { signAuthorization } = useSignAuthorization();
  const cfg = useSmartWalletsConfig();

  // State management replacing React Query
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<Hash | null>(null);

  // cache signer instance – avoids walletClient re‑creation
  const signerRef = useRef<SmartAccountSigner | null>(null);

  const getEmbeddedWalletChain = useCallback(() => {
    const embedded = wallets.find((w) => w.walletClientType === "privy");
    if (!embedded) throw new Error("Embedded wallet not ready");
    // Handle CAIP-2 format like "eip155:1"
    const chainIdStr = embedded.chainId?.toString();
    const numericChainId = chainIdStr?.includes(":")
      ? chainIdStr.split(":")[1]
      : chainIdStr;
    return getChain(Number(numericChainId));
  }, [wallets]);

  const getSigner = useCallback(async () => {
    if (signerRef.current) return signerRef.current;

    const embedded = wallets.find((w) => w.walletClientType === "privy");
    if (!embedded) throw new Error("Embedded wallet not ready");

    const chain = getEmbeddedWalletChain();

    const baseSigner = new WalletClientSigner(
      createWalletClient({
        account: embedded.address as Hex,
        chain,
        transport: custom(await embedded.getEthereumProvider()),
      }),
      "privy"
    );

    signerRef.current = {
      ...baseSigner,
      // bridge Privy's signAuthorization into AA‑SDK
      signAuthorization: async (unsigned) =>
        // Privy returns ecsign‑style { signature } object
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await signAuthorization(unsigned as any),
    };
    return signerRef.current;
  }, [wallets, signAuthorization, getEmbeddedWalletChain]);

  const sendSponsoredTransaction = useCallback(
    async (
      uo: UserOperationCallData | BatchUserOperationCallData
    ): Promise<Hash> => {
      setIsLoading(true);
      setError(null);

      const chain = getEmbeddedWalletChain();

      try {
        const signer = await getSigner();
        const sac = await createModularAccountV2Client({
          mode: "7702",
          transport: alchemy({ apiKey: cfg.apiKey }),
          chain,
          signer,
          policyId: cfg.policyId,
        });

        const uoHash = await sac.sendUserOperation({ uo });
        const result = await sac.waitForUserOperationTransaction(uoHash);

        setData(result);
        return result;
      } catch (err) {
        const error =
          err instanceof Error ? err : new Error("Transaction failed");
        setError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [getSigner, cfg.apiKey, cfg.policyId, getEmbeddedWalletChain]
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
