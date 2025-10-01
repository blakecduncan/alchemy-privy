import { type PropsWithChildren, createContext, useContext } from "react";
import type { AlchemyProviderConfig } from "./types";

const AlchemyContext = createContext<AlchemyProviderConfig | null>(null);

/**
 * Provider component for Alchemy configuration
 * Wraps your app to provide Alchemy settings to hooks
 *
 * @example
 * ```tsx
 * <AlchemyProvider apiKey="your-api-key" policyId="your-policy-id">
 *   <App />
 * </AlchemyProvider>
 * ```
 */
export function AlchemyProvider({
  children,
  ...config
}: PropsWithChildren<AlchemyProviderConfig>) {
  return (
    <AlchemyContext.Provider value={config}>{children}</AlchemyContext.Provider>
  );
}

/**
 * Hook to access Alchemy configuration
 * @internal
 */
export function useAlchemyConfig(): AlchemyProviderConfig {
  const context = useContext(AlchemyContext);
  if (!context) {
    throw new Error("useAlchemyConfig must be used within <AlchemyProvider />");
  }
  return context;
}
