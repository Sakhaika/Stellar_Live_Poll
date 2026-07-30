#!/usr/bin/env bash
# Build kontrak poll ke WASM (release, optimized).
# Prasyarat: Rust + target wasm32-unknown-unknown + Stellar CLI.
#   rustup target add wasm32-unknown-unknown
#   cargo install --locked stellar-cli
set -euo pipefail

cd "$(dirname "$0")/../contracts/poll"

echo "🔨 Building poll-contract..."
stellar contract build

echo ""
echo "✅ Build selesai. WASM ada di:"
echo "   target/wasm32-unknown-unknown/release/poll_contract.wasm"
