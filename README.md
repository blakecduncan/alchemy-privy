# Alchemy Privy Auth SDK

A production-ready SDK for integrating Alchemy Smart Wallets with Privy authentication, enabling gasless transactions via EIP-7702 delegations.

## Features

- **🔐 Seamless Privy Integration**: Drop-in hooks that work alongside Privy's authentication
- **⛽ Gas Sponsorship**: Optional transaction sponsorship via Alchemy Gas Manager
- **🪙 EIP-7702 Support**: Upgrade EOAs to smart wallets without transferring assets
- **⚡ Lightweight**: No react-query dependency, minimal overhead
- **🎯 Type-Safe**: Full TypeScript support with comprehensive type definitions
- **🔄 Flexible Configuration**: Support for API keys, JWT tokens, or custom RPC URLs

## Quick Start

### 1. Installation

```bash
yarn install
```

### 2. Environment Setup

Copy `env.example` to `.env` and configure your credentials:

```env
VITE_ALCHEMY_API_KEY=your_alchemy_api_key
VITE_ALCHEMY_POLICY_ID=your_gas_policy_id
VITE_PRIVY_APP_ID=your_privy_app_id
VITE_PRIVY_CLIENT_ID=your_privy_client_id
```

### 3. Provider Setup

Wrap your app with both `AlchemyProvider` and Privy's `PrivyProvider`:

```tsx
import { AlchemyProvider } from "./sdk";
import { PrivyProvider } from "@privy-io/react-auth";

function Root() {
  return (
    <AlchemyProvider
      apiKey={import.meta.env.VITE_ALCHEMY_API_KEY}
      policyId={import.meta.env.VITE_ALCHEMY_POLICY_ID}
    >
      <PrivyProvider appId={import.meta.env.VITE_PRIVY_APP_ID}>
        <App />
      </PrivyProvider>
    </AlchemyProvider>
  );
}
```

### 4. Send Transactions

Use the `useAlchemySendTransaction` hook to send gasless transactions:

```tsx
import { useAlchemySendTransaction } from "./sdk";

function MyComponent() {
  const { sendTransaction, isLoading, error, data } =
    useAlchemySendTransaction();

  const handleSend = async () => {
    try {
      const result = await sendTransaction({
        to: "0x...",
        data: "0x...",
        value: "1000000000000000000", // Accepts string, number, or bigint
      });

      console.log("Transaction hash:", result.txnHash);
    } catch (err) {
      console.error("Transaction failed:", err);
    }
  };

  return (
    <button onClick={handleSend} disabled={isLoading}>
      {isLoading ? "Sending..." : "Send Transaction"}
    </button>
  );
}
```

## SDK Structure

```
src/sdk/
├── Provider.tsx                      // <AlchemyProvider/> context
├── useAlchemyClient.ts               // Get & memoize SmartWalletClient
├── useAlchemySendTransaction.ts      // Send transactions with optional sponsorship
├── types.ts                          // TypeScript type definitions
├── getChain.ts                       // Chain configuration utility
└── index.ts                          // Public exports
```

## API Reference

### `<AlchemyProvider />`

Provider component that configures the SDK.

**Props:**

- `apiKey?: string` - Alchemy API key for transport
- `jwt?: string` - JWT token for authentication
- `url?: string` - Custom RPC URL
- `policyId?: string | string[]` - Gas policy ID(s) for sponsorship
- `defaultSponsored?: boolean` - Default: `true`. Enable/disable sponsorship by default

**Example:**

```tsx
<AlchemyProvider
  apiKey="your-api-key"
  policyId={["policy-1", "policy-2"]}
  defaultSponsored={true}
>
  {children}
</AlchemyProvider>
```

### `useAlchemyClient()`

Hook that returns a memoized `SmartWalletClient` instance. The client is cached at the module level and shared across all components that use this hook.

**Returns:**

```tsx
{
  client: () => Promise<SmartWalletClient>;
}
```

**Caching Behavior:**

- The client is cached globally at the module level (not per-component)
- **Automatic cleanup**: Cache is automatically cleared when user logs out or switches accounts
- Cache is automatically invalidated when configuration or wallet address changes
- No manual cleanup required - the SDK handles it for you!

### `resetClientCache()`

Utility function to manually clear the cached `SmartWalletClient`. **Note: You typically don't need to call this** as the SDK automatically clears the cache on logout and account changes.

This is provided for advanced use cases like testing or manual cache management.

**Example:**

```tsx
import { resetClientCache } from "./sdk";

// Manual cache reset (rarely needed)
resetClientCache();
```

### `useAlchemySendTransaction()`

Hook for sending transactions with optional gas sponsorship. Drop-in alternative to Privy's `useSendTransaction`.

**Returns:**

```tsx
{
  sendTransaction: (
    input: UnsignedTransactionRequest,
    options?: SendTransactionOptions
  ) => Promise<SendTransactionResult>;
  isLoading: boolean;
  error: Error | null;
  data: SendTransactionResult | null;
  reset: () => void;
}
```

**Transaction Input:**

```tsx
{
  to: Address;           // Recipient address
  data?: Hex;            // Transaction calldata
  value?: string | number | bigint;  // Transaction value
}
```

**Options:**

```tsx
{
  sponsored?: boolean;   // Override default sponsorship behavior
}
```

**Result:**

```tsx
{
  txnHash: Hash; // EVM transaction hash
}
```

## Advanced Usage

### Conditional Sponsorship

```tsx
// Always sponsor
await sendTransaction({ to: "0x...", value: 0n });

// Explicitly disable sponsorship
await sendTransaction({ to: "0x...", value: 0n }, { sponsored: false });
```

### Custom Transport Configuration

```tsx
// Using JWT instead of API key
<AlchemyProvider jwt="your-jwt-token" policyId="...">

// Using custom RPC URL
<AlchemyProvider url="https://custom-rpc.com" policyId="...">
```

### Access Smart Wallet Client Directly

```tsx
import { useAlchemyClient } from './sdk';

function AdvancedComponent() {
  const { client: getClient } = useAlchemyClient();

  const customOperation = async () => {
    const client = await getClient();
    // Use client directly for advanced operations
    const result = await client.sendUserOperation({...});
  };
}
```

## Development

Run the development server:

```bash
yarn dev
```

Build for production:

```bash
yarn build
```

## Technical Details

- **No React Query**: Keeps the SDK lightweight and minimizes friction with Privy's existing patterns
- **Module-Level Caching**: Smart wallet client is cached at the module level and shared across all components, ensuring true singleton behavior without React context overhead
- **Automatic Lifecycle Management**: Cache is automatically cleared on logout and account changes - no manual cleanup required
- **EIP-7702 Auth**: Automatic handling of EIP-7702 authorization signatures via Privy
- **Type Safety**: Comprehensive TypeScript types for all operations
- **Error Handling**: Proper error propagation with detailed error messages

## Supported Chains

The SDK supports all chains available in `@account-kit/infra`, including:

- Ethereum (Mainnet, Sepolia, Goerli)
- Optimism (Mainnet, Sepolia, Goerli)
- Arbitrum (One, Nova, Sepolia, Goerli)
- Base (Mainnet, Sepolia, Goerli)
- Polygon (Mainnet, Amoy, Mumbai)
- And many more...

See `src/sdk/getChain.ts` for the complete list.

## Future Enhancements

The following features are planned but not yet implemented:

- `useAlchemyPrepareSwap` - Request quotes and prepare swap calls
- `useAlchemySubmitSwap` - Sign and send prepared swap calls

## Contributing

This is a production-ready SDK designed for integration with Privy authentication. Contributions and feedback are welcome.

## License

MIT
