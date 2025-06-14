import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { PrivyProvider } from "@privy-io/react-auth";
import { SmartWalletsProvider } from "./sdk/Provider.tsx";
import { sepolia } from "viem/chains";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <SmartWalletsProvider
      apiKey={import.meta.env.VITE_ALCHEMY_API_KEY}
      policyId={import.meta.env.VITE_ALCHEMY_POLICY_ID}
    >
      <PrivyProvider
        appId={import.meta.env.VITE_PRIVY_APP_ID}
        clientId={import.meta.env.VITE_PRIVY_CLIENT_ID}
        config={{
          defaultChain: sepolia,
          embeddedWallets: {
            ethereum: {
              createOnLogin: "all-users",
            },
          },
        }}
      >
        <App />
      </PrivyProvider>
    </SmartWalletsProvider>
  </StrictMode>
);
