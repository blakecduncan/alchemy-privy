import "./App.css";
import { usePrivy, useLogin } from "@privy-io/react-auth";
import { useAlchemySendTransaction } from "./sdk";
import {
  createPublicClient,
  http,
  formatEther,
  parseEther,
  isAddress,
  type Address,
} from "viem";
import { baseSepolia } from "viem/chains";
import { useEffect, useState } from "react";

function App() {
  const { sendTransaction, isLoading } = useAlchemySendTransaction();
  const [balance, setBalance] = useState<string | null>(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);

  // Form state
  const [recipientAddress, setRecipientAddress] = useState("");
  const [amount, setAmount] = useState("0.001");
  const [addressError, setAddressError] = useState("");

  const { ready, authenticated, user, logout } = usePrivy();
  const { login } = useLogin();
  const disableLogin = !ready || (ready && authenticated);

  // Fetch balance when authenticated
  useEffect(() => {
    const fetchBalance = async () => {
      if (!authenticated || !user?.wallet?.address) {
        setBalance(null);
        return;
      }

      setIsLoadingBalance(true);
      try {
        const publicClient = createPublicClient({
          chain: baseSepolia,
          transport: http(),
        });

        const balanceWei = await publicClient.getBalance({
          address: user.wallet.address as Address,
        });

        setBalance(formatEther(balanceWei));
      } catch (error) {
        console.error("Failed to fetch balance:", error);
        setBalance("Error");
      } finally {
        setIsLoadingBalance(false);
      }
    };

    fetchBalance();
  }, [authenticated, user?.wallet?.address]);

  if (!ready) {
    return <div>Loading...</div>;
  }

  const handleSendTransaction = async () => {
    // Validate address
    if (!recipientAddress) {
      setAddressError("Address is required");
      return;
    }

    if (!isAddress(recipientAddress)) {
      setAddressError("Invalid Ethereum address");
      return;
    }

    setAddressError("");

    // Validate amount
    if (!amount || parseFloat(amount) <= 0) {
      alert("Please enter a valid amount greater than 0");
      return;
    }

    try {
      const result = await sendTransaction({
        to: recipientAddress as Address,
        value: parseEther(amount),
        data: "0x",
      });

      alert(`Transaction sent: ${result.txnHash}`);

      // Clear form after successful transaction
      setRecipientAddress("");
      setAmount("0.001");
    } catch (error) {
      console.error("Transaction failed:", error);
      alert(
        `Transaction failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
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
        <p>
          <strong>Balance:</strong>{" "}
          {isLoadingBalance
            ? "Loading..."
            : balance
            ? `${parseFloat(balance).toFixed(4)} ETH`
            : "—"}
        </p>
      </div>

      <div style={{ marginBottom: "20px" }}>
        <h3 style={{ marginBottom: "10px" }}>Send Transaction</h3>

        <div style={{ marginBottom: "15px" }}>
          <label
            htmlFor="recipient"
            style={{ display: "block", marginBottom: "5px", fontWeight: "500" }}
          >
            Recipient Address:
          </label>
          <input
            id="recipient"
            type="text"
            value={recipientAddress}
            onChange={(e) => {
              setRecipientAddress(e.target.value);
              setAddressError("");
            }}
            placeholder="0x..."
            style={{
              width: "100%",
              padding: "10px",
              fontSize: "14px",
              borderRadius: "4px",
              border: addressError ? "2px solid #dc3545" : "1px solid #ccc",
              boxSizing: "border-box",
            }}
          />
          {addressError && (
            <p style={{ color: "#dc3545", fontSize: "14px", marginTop: "5px" }}>
              {addressError}
            </p>
          )}
        </div>

        <div style={{ marginBottom: "15px" }}>
          <label
            htmlFor="amount"
            style={{ display: "block", marginBottom: "5px", fontWeight: "500" }}
          >
            Amount (ETH):
          </label>
          <input
            id="amount"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.001"
            step="0.001"
            min="0"
            style={{
              width: "100%",
              padding: "10px",
              fontSize: "14px",
              borderRadius: "4px",
              border: "1px solid #ccc",
              boxSizing: "border-box",
            }}
          />
        </div>

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
