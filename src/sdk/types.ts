import type { Address, Hash, Hex } from "viem";

/**
 * Configuration for the Alchemy provider
 */
export interface AlchemyProviderConfig {
  /** Alchemy API key for @account-kit/infra transport */
  apiKey?: string;

  /** JWT token for authentication */
  jwt?: string;

  /** Custom RPC URL */
  url?: string;

  /** Policy ID(s) for gas sponsorship */
  policyId?: string | string[];

  /**
   * Default: true → try to sponsor via Alchemy Gas Manager
   * Set to false to disable sponsorship by default
   */
  defaultSponsored?: boolean;
}

/**
 * Unsigned transaction request
 */
export interface UnsignedTransactionRequest {
  /** Recipient address */
  to: Address;

  /** Transaction data (calldata) */
  data?: Hex;

  /** Transaction value - accepts string | number | bigint */
  value?: string | number | bigint;
}

/**
 * Options for sending a transaction
 */
export interface SendTransactionOptions {
  /**
   * Whether to sponsor the transaction
   * Default: true if policy ID exists and defaultSponsored is not set to false
   */
  sponsored?: boolean;
}

/**
 * Result of a successful transaction
 */
export interface SendTransactionResult {
  /** EVM transaction hash (first receipt hash) */
  txnHash: Hash;
}

/**
 * Hook result for sending transactions
 */
export interface UseSendTransactionResult {
  /** Whether the transaction is currently being sent */
  isLoading: boolean;

  /** Error if transaction failed */
  error: Error | null;

  /** Transaction result if successful */
  data: SendTransactionResult | null;

  /** Reset the hook state */
  reset(): void;

  /** Send a transaction */
  sendTransaction(
    input: UnsignedTransactionRequest,
    options?: SendTransactionOptions
  ): Promise<SendTransactionResult>;
}
