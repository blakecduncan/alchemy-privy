import "./App.css";
import { usePrivy } from "@privy-io/react-auth";
import { useLogin } from "@privy-io/react-auth";
import { useSendSponsoredTransaction } from "./sdk/useSendSponsoredTransaction";
import { zeroAddress } from "viem";

function App() {
  const { sendSponsoredTransaction } = useSendSponsoredTransaction();

  const { ready, authenticated, user, logout } = usePrivy();
  const { login } = useLogin();
  const disableLogin = !ready || (ready && authenticated);

  if (!ready) {
    return <div>Loading...</div>;
  }

  const handleSendTransaction = async () => {
    try {
      const txnHash = await sendSponsoredTransaction({
        target: zeroAddress,
        value: 0n,
        data: "0x",
      });

      alert(`Transaction sent: ${txnHash}`);
    } catch (error) {
      console.error("Transaction failed:", error);
    }
  };

  if (!authenticated) {
    return (
      <div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
        <h1>Login with Privy</h1>
        <button disabled={disableLogin} onClick={login}>
          Log in
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
      <h1>Welcome!</h1>
      <div style={{ marginBottom: "20px" }}>
        <p>
          <strong>Email:</strong> {user?.email?.address}
        </p>
        <p>
          <strong>Wallet:</strong> {user?.wallet?.address}
        </p>
      </div>

      <div style={{ marginBottom: "20px" }}>
        <button
          onClick={handleSendTransaction}
          style={{
            padding: "12px 24px",
            backgroundColor: "#17a2b8",
            color: "white",
            border: "none",
            borderRadius: "4px",
            marginRight: "10px",
            fontSize: "16px",
          }}
        >
          Send Transaction
        </button>

        <button
          onClick={logout}
          style={{
            padding: "12px 24px",
            backgroundColor: "#dc3545",
            color: "white",
            border: "none",
            borderRadius: "4px",
            fontSize: "16px",
          }}
        >
          Logout
        </button>
      </div>

      <p style={{ fontSize: "12px", color: "#666" }}>
        Note: The transaction sends 0.0001 ETH to a test address. Make sure you
        have sufficient balance and are connected to the right network.
      </p>
    </div>
  );
}

export default App;
