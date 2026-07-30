/**
 * Mengklasifikasikan error jadi beberapa kategori yang jelas, supaya UI bisa
 * menampilkan pesan & aksi yang tepat untuk masing-masing kasus.
 *
 * Kategori yang di-handle (requirement Level 2 — minimal 3 error types):
 * 1. WALLET_NOT_FOUND    - extension wallet tidak terdeteksi / belum diinstall
 * 2. USER_REJECTED       - user menolak/membatalkan approve di popup wallet
 * 3. INSUFFICIENT_BALANCE- saldo XLM tidak cukup untuk membayar fee/transaksi
 * 4. ALREADY_VOTED       - kasus spesifik kontrak: address sudah pernah vote
 * 5. NETWORK_ERROR       - gagal konek ke Horizon/RPC (timeout, offline, dll)
 * 6. UNKNOWN             - fallback untuk error yang tidak dikenali
 */
export function classifyError(err) {
  const message = (err?.message || String(err) || "").toLowerCase();

  if (
    message.includes("not detected") ||
    message.includes("not installed") ||
    message.includes("no wallet") ||
    message.includes("not available") ||
    message.includes("freighter is not")
  ) {
    return {
      type: "WALLET_NOT_FOUND",
      title: "Wallet tidak ditemukan",
      description:
        "Extension wallet tidak terdeteksi di browser kamu. Install salah satu wallet yang didukung lalu refresh halaman.",
    };
  }

  if (
    message.includes("reject") ||
    message.includes("declined") ||
    message.includes("cancelled") ||
    message.includes("canceled") ||
    message.includes("user closed")
  ) {
    return {
      type: "USER_REJECTED",
      title: "Transaksi dibatalkan",
      description: "Kamu menolak/menutup popup approval di wallet. Coba lagi kalau berubah pikiran.",
    };
  }

  if (
    message.includes("insufficient") ||
    message.includes("underfunded") ||
    message.includes("balance") && message.includes("low") ||
    message.includes("tx_insufficient_balance")
  ) {
    return {
      type: "INSUFFICIENT_BALANCE",
      title: "Saldo tidak cukup",
      description: "XLM di wallet kamu tidak cukup untuk membayar fee transaksi. Fund akun via Friendbot dulu.",
    };
  }

  if (message.includes("already voted")) {
    return {
      type: "ALREADY_VOTED",
      title: "Sudah pernah vote",
      description: "Address ini sudah pernah memberikan suara pada poll ini. Satu address hanya bisa vote sekali.",
    };
  }

  if (
    message.includes("network") ||
    message.includes("timeout") ||
    message.includes("fetch failed") ||
    message.includes("failed to fetch")
  ) {
    return {
      type: "NETWORK_ERROR",
      title: "Gagal terhubung ke network",
      description: "Tidak bisa menghubungi Stellar RPC/Horizon Testnet. Cek koneksi internet kamu dan coba lagi.",
    };
  }

  return {
    type: "UNKNOWN",
    title: "Terjadi kesalahan",
    description: err?.message || "Sesuatu yang tidak terduga terjadi.",
  };
}
