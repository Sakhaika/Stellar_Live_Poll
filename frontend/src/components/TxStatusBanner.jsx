const STEPS = {
  idle: null,
  simulating: "🔄 Menyimulasikan transaksi...",
  "awaiting-signature": "✍️ Menunggu tanda tangan di wallet...",
  submitting: "📡 Mengirim transaksi ke network...",
  pending: "⏳ Menunggu konfirmasi ledger...",
  success: "✅ Transaksi berhasil!",
  error: "❌ Transaksi gagal",
};

export default function TxStatusBanner({ status, hash, errorInfo }) {
  if (status === "idle" || !status) return null;

  const explorerUrl = hash ? `https://stellar.expert/explorer/testnet/tx/${hash}` : null;

  return (
    <div className={`card tx-banner tx-${status}`}>
      <p className="tx-banner-text">{STEPS[status]}</p>

      {status === "error" && errorInfo && (
        <>
          <p className="tx-banner-title">{errorInfo.title}</p>
          <p className="tx-banner-desc">{errorInfo.description}</p>
        </>
      )}

      {hash && (
        <p className="tx-hash">
          Hash: <code>{hash}</code>
        </p>
      )}

      {explorerUrl && (
        <a className="btn btn-link" href={explorerUrl} target="_blank" rel="noreferrer">
          Lihat di Stellar Expert →
        </a>
      )}
    </div>
  );
}
