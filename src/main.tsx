import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { PrivyProvider } from "@privy-io/react-auth";
import { AlchemyProvider } from "./sdk";
import { baseSepolia } from "viem/chains";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AlchemyProvider
      apiKey={import.meta.env.VITE_ALCHEMY_API_KEY}
      policyId={import.meta.env.VITE_ALCHEMY_POLICY_ID}
      defaultSponsored={true}
    >
      <PrivyProvider
        appId={import.meta.env.VITE_PRIVY_APP_ID}
        clientId={import.meta.env.VITE_PRIVY_CLIENT_ID}
        config={{
          defaultChain: baseSepolia,
          embeddedWallets: {
            ethereum: {
              createOnLogin: "all-users",
            },
          },
        }}
      >
        <App />
      </PrivyProvider>
    </AlchemyProvider>
  </StrictMode>
);
