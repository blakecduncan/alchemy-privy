import { type PropsWithChildren, createContext, useContext } from "react";

export interface SmartWalletsConfig {
  apiKey: string;
  policyId: string;
}

const SmartWalletsCtx = createContext<SmartWalletsConfig | null>(null);

export function SmartWalletsProvider({
  children,
  ...config
}: PropsWithChildren<SmartWalletsConfig>) {
  return (
    <SmartWalletsCtx.Provider value={config}>
      {children}
    </SmartWalletsCtx.Provider>
  );
}

// handy helper so consumer code is tiny
export function useSmartWalletsConfig() {
  const ctx = useContext(SmartWalletsCtx);
  if (!ctx) throw new Error("Missing <SmartWalletsProvider/>");
  return ctx;
}
