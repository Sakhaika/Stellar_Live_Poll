import { useCallback, useEffect, useRef, useState } from "react";
import { connectWallet, disconnectWallet, signXDR } from "./lib/walletKit";
import {
  readContract,
  buildInvokeTx,
  submitAndTrack,
  fetchVoteEvents,
  getLatestLedger,
  addressToScVal,
  u32ToScVal,
  CONTRACT_ID,
} from "./lib/soroban";
import { classifyError } from "./lib/errors";

import WalletBar from "./components/WalletBar";
import PollCard from "./components/PollCard";
import TxStatusBanner from "./components/TxStatusBanner";
import ActivityFeed from "./components/ActivityFeed";
import "./App.css";

const READ_SOURCE = import.meta.env.VITE_READ_SOURCE_ACCOUNT || "";
const POLL_INTERVAL_MS = 6000;

export default function App() {
  const [address, setAddress] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [walletError, setWalletError] = useState(null);

  const [poll, setPoll] = useState({ question: "", options: [], results: [] });
  const [isLoadingPoll, setIsLoadingPoll] = useState(true);
  const [hasVoted, setHasVoted] = useState(false);
  const [selectedOption, setSelectedOption] = useState(null);

  const [txStatus, setTxStatus] = useState("idle");
  const [txHash, setTxHash] = useState(null);
  const [txError, setTxError] = useState(null);

  const [events, setEvents] = useState([]);
  const lastLedgerRef = useRef(null);

  const readSource = address || READ_SOURCE;

  const refreshPoll = useCallback(async () => {
    if (!CONTRACT_ID || !readSource) return;
    try {
      const [question, options, results] = await Promise.all([
        readContract("get_question", [], readSource),
        readContract("get_options", [], readSource),
        readContract("get_results", [], readSource),
      ]);
      setPoll({ question, options, results: results.map(Number) });

      if (address) {
        const voted = await readContract("has_voted", [addressToScVal(address)], readSource);
        setHasVoted(Boolean(voted));
      }
    } catch (err) {
      console.error("refreshPoll error:", err);
    } finally {
      setIsLoadingPoll(false);
    }
  }, [readSource, address]);

  // Initial load + whenever wallet connects
  useEffect(() => {
    setIsLoadingPoll(true);
    refreshPoll();
  }, [refreshPoll]);

  // Real-time sync: poll results + new vote events periodically
  useEffect(() => {
    if (!CONTRACT_ID) return;

    const interval = setInterval(async () => {
      try {
        if (lastLedgerRef.current === null) {
          const latest = await getLatestLedger();
          lastLedgerRef.current = Math.max(latest - 100, 1); // look back a bit on first run
        }
        const newEvents = await fetchVoteEvents(lastLedgerRef.current);
        if (newEvents.length > 0) {
          lastLedgerRef.current = Math.max(...newEvents.map((e) => e.ledger)) + 1;
          setEvents((prev) => [...newEvents.reverse(), ...prev].slice(0, 30));
          refreshPoll();
        }
      } catch (err) {
        console.error("event polling error:", err);
      }
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [refreshPoll]);

  async function handleConnect() {
    setIsConnecting(true);
    setWalletError(null);
    try {
      const addr = await connectWallet();
      setAddress(addr);
    } catch (err) {
      setWalletError(classifyError(err));
    } finally {
      setIsConnecting(false);
    }
  }

  async function handleDisconnect() {
    await disconnectWallet().catch(() => {});
    setAddress(null);
    setHasVoted(false);
    setSelectedOption(null);
    setTxStatus("idle");
  }

  async function handleVote() {
    if (selectedOption === null || !address) return;
    setTxError(null);
    setTxHash(null);

    try {
      setTxStatus("simulating");
      const xdr = await buildInvokeTx(
        "vote",
        [addressToScVal(address), u32ToScVal(selectedOption)],
        address
      );

      setTxStatus("awaiting-signature");
      const signed = await signXDR(xdr, address);

      setTxStatus("submitting");
      const result = await submitAndTrack(signed.signedTxXdr, (s) => setTxStatus(s));

      setTxStatus("success");
      setTxHash(result.hash);
      setHasVoted(true);
      await refreshPoll();
    } catch (err) {
      console.error("vote error:", err);
      setTxStatus("error");
      setTxError(classifyError(err));
    }
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>🗳️ Stellar Live Poll</h1>
        <p className="muted">Testnet · Multi-wallet · Real-time — Yellow Belt submission</p>
      </header>

      {!CONTRACT_ID && (
        <div className="alert">
          ⚠️ <code>VITE_CONTRACT_ID</code> belum diset. Deploy contract dulu lalu isi file{" "}
          <code>.env</code>.
        </div>
      )}

      {walletError && (
        <div className="alert">
          <strong>{walletError.title}:</strong> {walletError.description}
        </div>
      )}

      <WalletBar
        address={address}
        isConnecting={isConnecting}
        onConnect={handleConnect}
        onDisconnect={handleDisconnect}
      />

      <PollCard
        question={poll.question}
        options={poll.options}
        results={poll.results}
        hasVoted={hasVoted}
        selectedOption={selectedOption}
        onSelect={setSelectedOption}
        onVote={handleVote}
        isVoting={["simulating", "awaiting-signature", "submitting", "pending"].includes(
          txStatus
        )}
        isConnected={Boolean(address)}
        isLoading={isLoadingPoll}
      />

      <TxStatusBanner status={txStatus} hash={txHash} errorInfo={txError} />

      <ActivityFeed events={events} options={poll.options} />

      <footer className="app-footer">
        <span className="muted small">
          Network: Stellar Testnet · Contract:{" "}
          <code>{CONTRACT_ID ? `${CONTRACT_ID.slice(0, 6)}...${CONTRACT_ID.slice(-4)}` : "not set"}</code>
        </span>
      </footer>
    </div>
  );
}
