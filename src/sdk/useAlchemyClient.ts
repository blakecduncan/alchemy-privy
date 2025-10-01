import { useCallback, useRef } from "react";
import { WalletClientSigner, type AuthorizationRequest } from "@aa-sdk/core";
import {
  createWalletClient,
  custom,
  type Address,
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
import { useAlchemyConfig } from "./Provider";
import { getChain } from "./getChain";

/**
 * Hook to get and memoize a SmartWalletClient instance
 * The client is cached and reused across renders
 *
 * @returns Object containing the smart wallet client
 *
 * @example
 * ```tsx
 * const { client } = useAlchemyClient();
 * ```
 */
export function useAlchemyClient() {
  const { wallets } = useWallets();
  const { signAuthorization } = useSignAuthorization();
  const config = useAlchemyConfig();

  const clientRef = useRef<SmartWalletClient | null>(null);

  const getEmbeddedWallet = useCallback((): PrivyWallet => {
    const embedded = wallets.find((w) => w.walletClientType === "privy");
    if (!embedded) {
      throw new Error(
        "Privy embedded wallet not found. Please ensure the user is authenticated."
      );
    }
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
    // Return cached client if available
    if (clientRef.current) {
      return clientRef.current;
    }

    const embeddedWallet = getEmbeddedWallet();
    const chain = getEmbeddedWalletChain();
    const provider = await embeddedWallet.getEthereumProvider();

    // Create base signer from Privy wallet
    const baseSigner = new WalletClientSigner(
      createWalletClient({
        account: embeddedWallet.address as Address,
        chain,
        transport: custom(provider),
      }),
      "privy"
    );

    // Extend signer with EIP-7702 authorization support
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

    // Determine transport configuration
    const transportConfig = config.url
      ? { rpcUrl: config.url }
      : config.jwt
      ? { jwt: config.jwt }
      : config.apiKey
      ? { apiKey: config.apiKey }
      : undefined;

    if (!transportConfig) {
      throw new Error(
        "AlchemyProvider requires at least one of: apiKey, jwt, or url"
      );
    }

    // Determine policy ID (use first if array)
    const policyId = Array.isArray(config.policyId)
      ? config.policyId[0]
      : config.policyId;

    // Create and cache the smart wallet client
    clientRef.current = createSmartWalletClient({
      chain,
      transport: alchemy(transportConfig),
      signer,
      policyId,
    });

    return clientRef.current;
  }, [
    getEmbeddedWallet,
    getEmbeddedWalletChain,
    signAuthorization,
    config.apiKey,
    config.jwt,
    config.url,
    config.policyId,
  ]);

  return { client: getClient };
}
