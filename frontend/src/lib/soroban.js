import {
  rpc,
  Contract,
  TransactionBuilder,
  Address,
  nativeToScVal,
  scValToNative,
  BASE_FEE,
} from "@stellar/stellar-sdk";
import { NETWORK } from "./walletKit";

export const RPC_URL = import.meta.env.VITE_SOROBAN_RPC_URL || "https://soroban-testnet.stellar.org";
export const CONTRACT_ID = import.meta.env.VITE_CONTRACT_ID || "";

export const server = new rpc.Server(RPC_URL, { allowHttp: false });

export function getContract() {
  if (!CONTRACT_ID) {
    throw new Error(
      "Contract ID belum diset. Isi VITE_CONTRACT_ID di file .env setelah deploy contract."
    );
  }
  return new Contract(CONTRACT_ID);
}

/**
 * Simulate a read-only contract call (no signature needed) and return
 * the native JS value of the result. `sourcePublicKey` just needs to be
 * a valid, existing testnet account (used for simulation fee context only).
 */
export async function readContract(method, args = [], sourcePublicKey) {
  const contract = getContract();
  const sourceAccount = await server.getAccount(sourcePublicKey);

  const tx = new TransactionBuilder(sourceAccount, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(30)
    .build();

  const sim = await server.simulateTransaction(tx);

  if (rpc.Api.isSimulationError(sim)) {
    throw new ContractError(sim.error);
  }

  if (!sim.result) {
    throw new ContractError("Simulasi tidak mengembalikan hasil.");
  }

  return scValToNative(sim.result.retval);
}

/**
 * Build + simulate + assemble a WRITE transaction (e.g. `vote`). Returns
 * an XDR string ready to be signed by the connected wallet.
 */
export async function buildInvokeTx(method, args, sourcePublicKey) {
  const contract = getContract();
  const sourceAccount = await server.getAccount(sourcePublicKey);

  const tx = new TransactionBuilder(sourceAccount, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(60)
    .build();

  const sim = await server.simulateTransaction(tx);

  if (rpc.Api.isSimulationError(sim)) {
    throw new ContractError(sim.error);
  }

  const prepared = rpc.assembleTransaction(tx, sim).build();
  return prepared.toXDR();
}

/**
 * Submit a signed XDR and poll until the transaction reaches a final
 * status (SUCCESS or FAILED). Throws ContractError on failure.
 */
export async function submitAndTrack(signedXDR, onStatus) {
  const tx = TransactionBuilder.fromXDR(signedXDR, NETWORK);

  onStatus?.("submitting");
  const sendResult = await server.sendTransaction(tx);

  if (sendResult.status === "ERROR" || sendResult.status === "DUPLICATE") {
    throw new ContractError(
      sendResult.errorResult ? String(sendResult.errorResult) : "Transaksi ditolak oleh network."
    );
  }

  onStatus?.("pending");
  const hash = sendResult.hash;

  // Poll every 2s, up to ~30s
  for (let i = 0; i < 15; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const res = await server.getTransaction(hash);

    if (res.status === rpc.Api.GetTransactionStatus.SUCCESS) {
      return { status: "success", hash };
    }
    if (res.status === rpc.Api.GetTransactionStatus.FAILED) {
      throw new ContractError(`Transaksi gagal di ledger (hash: ${hash}).`);
    }
    // else NOT_FOUND -> still pending, keep polling
  }

  throw new ContractError("Timeout menunggu konfirmasi transaksi.");
}

/**
 * Poll for new `vote` events emitted by the contract since a given ledger.
 * Used to keep the UI in sync in near real-time across multiple users.
 */
export async function fetchVoteEvents(startLedger) {
  const res = await server.getEvents({
    startLedger,
    filters: [
      {
        type: "contract",
        contractIds: [CONTRACT_ID],
        topics: [["vote"]],
      },
    ],
    limit: 50,
  });

  return res.events.map((e) => ({
    ledger: e.ledger,
    id: e.id,
    txHash: e.txHash,
    voter: (() => {
      try {
        return scValToNative(e.topic[1]);
      } catch {
        return null;
      }
    })(),
    optionIndex: (() => {
      try {
        return scValToNative(e.value);
      } catch {
        return null;
      }
    })(),
  }));
}

export async function getLatestLedger() {
  const latest = await server.getLatestLedger();
  return latest.sequence;
}

export function addressToScVal(publicKey) {
  return new Address(publicKey).toScVal();
}

export function u32ToScVal(n) {
  return nativeToScVal(n, { type: "u32" });
}

/**
 * Normalized error class so the UI can distinguish error categories.
 */
export class ContractError extends Error {
  constructor(raw) {
    const message = typeof raw === "string" ? raw : raw?.message || JSON.stringify(raw);
    super(message);
    this.name = "ContractError";
    this.raw = raw;
  }
}
