import "./App.css";
import { usePrivy, useLogin } from "@privy-io/react-auth";
import { useAlchemySendTransaction } from "./sdk";
import { zeroAddress } from "viem";

function App() {
  const { sendTransaction, isLoading } = useAlchemySendTransaction();

  const { ready, authenticated, user, logout } = usePrivy();
  const { login } = useLogin();
  const disableLogin = !ready || (ready && authenticated);

  if (!ready) {
    return <div>Loading...</div>;
  }

  const handleSendTransaction = async () => {
    try {
      const result = await sendTransaction({
        to: zeroAddress,
        value: 0n,
        data: "0x",
      });

      alert(`Transaction sent: ${result.txnHash}`);
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
          disabled={isLoading}
          style={{
            padding: "12px 24px",
            backgroundColor: isLoading ? "#6c757d" : "#17a2b8",
            color: "white",
            border: "none",
            borderRadius: "4px",
            marginRight: "10px",
            fontSize: "16px",
            cursor: isLoading ? "not-allowed" : "pointer",
          }}
        >
          {isLoading ? "Sending..." : "Send Transaction"}
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
    </div>
  );
}

export default App;
