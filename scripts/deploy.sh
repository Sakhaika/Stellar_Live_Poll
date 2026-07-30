#!/usr/bin/env bash
# Deploy poll-contract ke Stellar Testnet lalu inisialisasi poll-nya.
#
# Prasyarat:
#   1. Stellar CLI terinstall (cargo install --locked stellar-cli)
#   2. Identity/akun testnet sudah dibuat & funded:
#        stellar keys generate deployer --network testnet --fund
#   3. Contract sudah di-build (jalankan scripts/build.sh dulu)
#
# Usage:
#   ./scripts/deploy.sh "Rust atau JavaScript?" "Rust" "JavaScript"
set -euo pipefail

cd "$(dirname "$0")/.."

QUESTION="${1:-Stellar atau Ethereum untuk project berikutnya?}"
OPTION_A="${2:-Stellar}"
OPTION_B="${3:-Ethereum}"
IDENTITY="${STELLAR_DEPLOYER:-deployer}"
WASM_PATH="contracts/poll/target/wasm32-unknown-unknown/release/poll_contract.wasm"

if [ ! -f "$WASM_PATH" ]; then
  echo "❌ WASM belum ada. Jalankan ./scripts/build.sh dulu."
  exit 1
fi

echo "🚀 Deploying contract ke Testnet..."
CONTRACT_ID=$(stellar contract deploy \
  --wasm "$WASM_PATH" \
  --source "$IDENTITY" \
  --network testnet)

echo "✅ Contract deployed: $CONTRACT_ID"

ADMIN_ADDRESS=$(stellar keys address "$IDENTITY")

echo "⚙️  Initializing poll..."
stellar contract invoke \
  --id "$CONTRACT_ID" \
  --source "$IDENTITY" \
  --network testnet \
  -- \
  init \
  --admin "$ADMIN_ADDRESS" \
  --question "$QUESTION" \
  --options "[\"$OPTION_A\",\"$OPTION_B\"]"

echo ""
echo "🎉 Selesai! Simpan Contract ID ini ke frontend/.env:"
echo "   VITE_CONTRACT_ID=$CONTRACT_ID"
echo ""
echo "🔗 Cek di explorer:"
echo "   https://stellar.expert/explorer/testnet/contract/$CONTRACT_ID"
