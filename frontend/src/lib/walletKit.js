import { StellarWalletsKit, Networks } from "@creit.tech/stellar-wallets-kit";
import { FreighterModule } from "@creit.tech/stellar-wallets-kit/modules/freighter";
import { xBullModule } from "@creit.tech/stellar-wallets-kit/modules/xbull";
import { AlbedoModule } from "@creit.tech/stellar-wallets-kit/modules/albedo";
import { LobstrModule } from "@creit.tech/stellar-wallets-kit/modules/lobstr";
import { HanaModule } from "@creit.tech/stellar-wallets-kit/modules/hana";

export const NETWORK = Networks.TESTNET;

let initialized = false;

/**
 * Inisialisasi kit sekali saja (idempotent). Mendaftarkan beberapa wallet
 * sekaligus supaya user bisa pilih via modal (multi-wallet support).
 */
export function initWalletKit() {
  if (initialized) return;
  StellarWalletsKit.init({
    network: NETWORK,
    modules: [
      new FreighterModule(),
      new xBullModule(),
      new AlbedoModule(),
      new LobstrModule(),
      new HanaModule(),
    ],
    authModal: {
      showInstallLabel: true,
    },
  });
  initialized = true;
}

/**
 * Buka modal pilihan wallet. User pilih salah satu dari daftar yang tersedia,
 * kit lalu meminta address dari wallet tersebut.
 */
export async function connectWallet() {
  initWalletKit();
  const { address } = await StellarWalletsKit.authModal();
  return address;
}

export async function disconnectWallet() {
  await StellarWalletsKit.disconnect();
}

export async function signXDR(xdr, address) {
  return StellarWalletsKit.signTransaction(xdr, {
    networkPassphrase: NETWORK,
    address,
  });
}

export { StellarWalletsKit };
