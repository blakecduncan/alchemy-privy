import "./App.css";
import { usePrivy, useLogin } from "@privy-io/react-auth";
import {
  useAlchemySendTransaction,
  useAlchemyPrepareSwap,
  useAlchemySubmitSwap,
  type PrepareSwapResult,
} from "./sdk";
import {
  createPublicClient,
  http,
  formatEther,
  parseEther,
  isAddress,
  type Address,
  type Hex,
} from "viem";
import { baseSepolia, base } from "viem/chains";
import { useEffect, useState } from "react";
import { useWallets } from "@privy-io/react-auth";

function App() {
  const { sendTransaction, isLoading } = useAlchemySendTransaction();
  const prepareSwap = useAlchemyPrepareSwap();
  const submitSwap = useAlchemySubmitSwap();
  const { wallets } = useWallets();

  const [balance, setBalance] = useState<string | null>(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [currentChain, setCurrentChain] = useState<number>(baseSepolia.id);
  const [isSwitchingChain, setIsSwitchingChain] = useState(false);

  // Send transaction form state
  const [recipientAddress, setRecipientAddress] = useState("");
  const [amount, setAmount] = useState("0.001");
  const [addressError, setAddressError] = useState("");

  // Swap form state
  const [fromToken, setFromToken] = useState(
    "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
  ); // ETH
  const [toToken, setToToken] = useState(
    "0x4200000000000000000000000000000000000006"
  );
  const [swapAmount, setSwapAmount] = useState("0.001");
  const [preparedSwap, setPreparedSwap] = useState<PrepareSwapResult | null>(
    null
  );

  const { ready, authenticated, user, logout } = usePrivy();
  const { login } = useLogin();
  const disableLogin = !ready || (ready && authenticated);

  // Fetch balance when authenticated or chain changes
  useEffect(() => {
    const fetchBalance = async () => {
      if (!authenticated || !user?.wallet?.address) {
        setBalance(null);
        return;
      }

      setIsLoadingBalance(true);
      try {
        // Use the current chain instead of hardcoded baseSepolia
        const chain = currentChain === base.id ? base : baseSepolia;

        const publicClient = createPublicClient({
          chain,
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
  }, [authenticated, user?.wallet?.address, currentChain]);

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

  const handlePrepareSwap = async () => {
    if (!toToken || !isAddress(toToken)) {
      alert("Please enter a valid token address");
      return;
    }

    if (!swapAmount || parseFloat(swapAmount) <= 0) {
      alert("Please enter a valid amount");
      return;
    }

    try {
      const result = await prepareSwap.prepareSwap({
        fromToken: fromToken as Address,
        toToken: toToken as Address,
        minimumToAmount: `0x${parseEther(swapAmount).toString(16)}` as Hex,
      });

      setPreparedSwap(result);
    } catch (error) {
      console.error("Failed to prepare swap:", error);
      alert(
        `Failed to prepare swap: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  };

  const handleExecuteSwap = async () => {
    if (!preparedSwap) return;

    try {
      const result = await submitSwap.submitSwap(preparedSwap.preparedCalls);
      alert(`Swap successful! Transaction: ${result.txnHash}`);

      // Reset form
      setPreparedSwap(null);
      setToToken("");
      setSwapAmount("0.001");
      prepareSwap.reset();
      submitSwap.reset();
    } catch (error) {
      console.error("Swap failed:", error);
      alert(
        `Swap failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  };

  const handleCancelSwap = () => {
    setPreparedSwap(null);
    prepareSwap.reset();
    submitSwap.reset();
  };

  const handleChainSwitch = async (chainId: number) => {
    const wallet = wallets.find((w) => w.walletClientType === "privy");
    if (!wallet) {
      alert("No wallet found");
      return;
    }

    setIsSwitchingChain(true);
    try {
      await wallet.switchChain(chainId);
      setCurrentChain(chainId);
      alert(
        `Successfully switched to ${
          chainId === base.id ? "Base" : "Base Sepolia"
        }`
      );
    } catch (error) {
      console.error("Failed to switch chain:", error);
      alert(
        `Failed to switch chain: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setIsSwitchingChain(false);
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
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
        }}
      >
        <h1 style={{ margin: 0 }}>Welcome!</h1>

        {/* Chain Switcher */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <label htmlFor="chainSelect" style={{ fontWeight: "500" }}>
            Network:
          </label>
          <select
            id="chainSelect"
            value={currentChain}
            onChange={(e) => handleChainSwitch(Number(e.target.value))}
            disabled={isSwitchingChain}
            style={{
              padding: "8px 12px",
              fontSize: "14px",
              borderRadius: "4px",
              border: "1px solid #ccc",
              backgroundColor: isSwitchingChain ? "#f0f0f0" : "white",
              color: "#333",
              cursor: isSwitchingChain ? "not-allowed" : "pointer",
            }}
          >
            <option value={baseSepolia.id}>Base Sepolia</option>
            <option value={base.id}>Base</option>
          </select>
          {isSwitchingChain && (
            <span style={{ fontSize: "14px", color: "#666" }}>
              Switching...
            </span>
          )}
        </div>
      </div>

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

      {/* Swap Section */}
      <div style={{ marginBottom: "20px", marginTop: "30px" }}>
        <h3 style={{ marginBottom: "10px" }}>Token Swap</h3>

        {!preparedSwap ? (
          <>
            <div style={{ marginBottom: "15px" }}>
              <label
                htmlFor="fromToken"
                style={{
                  display: "block",
                  marginBottom: "5px",
                  fontWeight: "500",
                }}
              >
                From Token:
              </label>
              <input
                id="fromToken"
                type="text"
                value={fromToken}
                onChange={(e) => setFromToken(e.target.value)}
                placeholder="0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"
                style={{
                  width: "100%",
                  padding: "10px",
                  fontSize: "14px",
                  borderRadius: "4px",
                  border: "1px solid #ccc",
                  boxSizing: "border-box",
                }}
              />
              <small style={{ color: "#666", fontSize: "12px" }}>
                ETH: 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE
              </small>
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label
                htmlFor="toToken"
                style={{
                  display: "block",
                  marginBottom: "5px",
                  fontWeight: "500",
                }}
              >
                To Token:
              </label>
              <input
                id="toToken"
                type="text"
                value={toToken}
                onChange={(e) => setToToken(e.target.value)}
                placeholder="0x..."
                style={{
                  width: "100%",
                  padding: "10px",
                  fontSize: "14px",
                  borderRadius: "4px",
                  border: "1px solid #ccc",
                  boxSizing: "border-box",
                }}
              />
              <small style={{ color: "#666", fontSize: "12px" }}>
                USDC (Base Sepolia): 0x036CbD53842c5426634e7929541eC2318f3dCF7e
              </small>
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label
                htmlFor="swapAmount"
                style={{
                  display: "block",
                  marginBottom: "5px",
                  fontWeight: "500",
                }}
              >
                Amount:
              </label>
              <input
                id="swapAmount"
                type="number"
                value={swapAmount}
                onChange={(e) => setSwapAmount(e.target.value)}
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
              onClick={handlePrepareSwap}
              disabled={prepareSwap.isLoading}
              style={{
                padding: "12px 24px",
                backgroundColor: prepareSwap.isLoading ? "#6c757d" : "#28a745",
                color: "white",
                border: "none",
                borderRadius: "4px",
                fontSize: "16px",
                cursor: prepareSwap.isLoading ? "not-allowed" : "pointer",
              }}
            >
              {prepareSwap.isLoading ? "Getting Quote..." : "Get Swap Quote"}
            </button>
          </>
        ) : (
          <div
            style={{
              border: "1px solid #ddd",
              borderRadius: "4px",
              padding: "15px",
              backgroundColor: "#f8f9fa",
            }}
          >
            <h4 style={{ marginTop: 0, marginBottom: "10px" }}>Swap Quote</h4>
            <p style={{ margin: "5px 0" }}>
              <strong>From Amount:</strong>{" "}
              {formatEther(BigInt(preparedSwap.quote.fromAmount))} tokens
            </p>
            <p style={{ margin: "5px 0" }}>
              <strong>Minimum You'll Receive:</strong>{" "}
              {formatEther(BigInt(preparedSwap.quote.minimumToAmount))} tokens
            </p>
            <p style={{ margin: "5px 0", marginBottom: "15px" }}>
              <strong>Expires:</strong>{" "}
              {new Date(
                parseInt(preparedSwap.quote.expiry, 16) * 1000
              ).toLocaleString()}
            </p>

            <button
              onClick={handleExecuteSwap}
              disabled={submitSwap.isLoading}
              style={{
                padding: "12px 24px",
                backgroundColor: submitSwap.isLoading ? "#6c757d" : "#28a745",
                color: "white",
                border: "none",
                borderRadius: "4px",
                marginRight: "10px",
                fontSize: "16px",
                cursor: submitSwap.isLoading ? "not-allowed" : "pointer",
              }}
            >
              {submitSwap.isLoading ? "Executing..." : "Confirm Swap"}
            </button>

            <button
              onClick={handleCancelSwap}
              disabled={submitSwap.isLoading}
              style={{
                padding: "12px 24px",
                backgroundColor: "#6c757d",
                color: "white",
                border: "none",
                borderRadius: "4px",
                fontSize: "16px",
                cursor: submitSwap.isLoading ? "not-allowed" : "pointer",
              }}
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
