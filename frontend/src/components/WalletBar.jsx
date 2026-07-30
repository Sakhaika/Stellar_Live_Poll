function shorten(address) {
  if (!address) return "";
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

export default function WalletBar({ address, isConnecting, onConnect, onDisconnect }) {
  return (
    <div className="card wallet-bar">
      {!address ? (
        <button className="btn btn-primary" onClick={onConnect} disabled={isConnecting}>
          {isConnecting ? "Menghubungkan..." : "🔗 Connect Wallet"}
        </button>
      ) : (
        <div className="wallet-connected-row">
          <span className="badge badge-success">● {shorten(address)}</span>
          <button className="btn btn-secondary" onClick={onDisconnect}>
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
}
