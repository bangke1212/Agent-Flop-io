import { createHash, createPrivateKey, createPublicKey, sign } from "node:crypto";

const ED25519_PKCS8_PREFIX = Buffer.from("302e020100300506032b657004220420", "hex");
const INVISIBLE = /[\p{Cc}\p{Cf}\p{Cs}\p{Co}\p{Zl}\p{Zp}]/gu;
const BASE58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

export type Identity = { did: string };
export type LobbyMessage = {
  id: string;
  author: string;
  text: string;
  timestamp: string | null;
  sequence: number | null;
};

function seedBytes(seed: string): Buffer {
  if (/^[0-9a-fA-F]{64}$/.test(seed)) return Buffer.from(seed, "hex");
  return createHash("sha256").update(seed, "utf8").digest();
}

function base58(bytes: Buffer): string {
  let value = BigInt(`0x${bytes.toString("hex")}`);
  let output = "";
  while (value > 0n) {
    const remainder = Number(value % 58n);
    output = BASE58[remainder] + output;
    value /= 58n;
  }
  for (const byte of bytes) {
    if (byte !== 0) break;
    output = BASE58[0] + output;
  }
  return output || BASE58[0];
}

function keyPair(seed: string) {
  const privateKey = createPrivateKey({ key: Buffer.concat([ED25519_PKCS8_PREFIX, seedBytes(seed)]), format: "der", type: "pkcs8" });
  const publicDer = createPublicKey(privateKey).export({ format: "der", type: "spki" }) as Buffer;
  return { privateKey, publicKey: publicDer.subarray(-32) };
}

export function getIdentity(): Identity | null {
  const seed = process.env.SIGN_SEED?.trim();
  if (!seed) return null;
  const { publicKey } = keyPair(seed);
  return { did: `did:key:z${base58(Buffer.concat([Buffer.from([0xed, 0x01]), publicKey]))}` };
}

export function sweepText(value: string, limit = 4096): string {
  const cleaned = value.replace(INVISIBLE, " ").trim();
  if (!cleaned) throw new Error("Pesan tidak boleh kosong.");
  if (cleaned.length > limit) throw new Error(`Pesan terlalu panjang. Maksimal ${limit} karakter.`);
  return cleaned;
}

export function signSay(seed: string, room: string, nonce: number, text: string): { did: string; signature: string } {
  const cleaned = sweepText(text);
  const { privateKey, publicKey } = keyPair(seed);
  const did = `did:key:z${base58(Buffer.concat([Buffer.from([0xed, 0x01]), publicKey]))}`;
  const canonical = `${room}|${nonce}|${cleaned}`;
  const signature = sign(null, Buffer.from(canonical, "utf8"), privateKey).toString("base64url");
  return { did, signature };
}

export async function sendSignedSay(room: string, nonce: number, text: string): Promise<{ did: string; remoteStatus: number; remoteBody: string }> {
  const seed = process.env.SIGN_SEED?.trim();
  if (!seed) throw new Error("SIGN_SEED belum dikonfigurasi di server.");
  const { did, signature } = signSay(seed, room, nonce, text);
  const url = `https://technocore.chat/r/${encodeURIComponent(room)}/say-signed/${encodeURIComponent(did)}/${encodeURIComponent(signature)}/${nonce}/${encodeURIComponent(sweepText(text))}`;
  const response = await fetch(url, { method: "GET", signal: AbortSignal.timeout(12000), cache: "no-store" });
  const remoteBody = (await response.text()).slice(0, 400);
  if (!response.ok) throw new Error(`Technocore menolak request (${response.status}).`);
  return { did, remoteStatus: response.status, remoteBody };
}

function normalizeLobbyItem(item: Record<string, unknown>, index: number): LobbyMessage {
  return {
    id: String(item.id ?? item.seq ?? index),
    author: String(item.from ?? item.author ?? item.nick ?? "unknown"),
    text: String(item.text ?? item.message ?? ""),
    timestamp: item.ts ? String(item.ts) : item.created_at ? String(item.created_at) : null,
    sequence: item.seq ? Number(item.seq) : null,
  };
}

export async function fetchLobby(): Promise<LobbyMessage[]> {
  const response = await fetch(`https://technocore.chat/r/lobby?format=json&limit=50&n=${Date.now()}`, { cache: "no-store", signal: AbortSignal.timeout(10000) });
  const raw = await response.text();
  if (!response.ok) throw new Error(`Lobby tidak dapat dimuat (${response.status}).`);
  try {
    const parsed: unknown = JSON.parse(raw);
    const values = Array.isArray(parsed) ? parsed : typeof parsed === "object" && parsed !== null && Array.isArray((parsed as { messages?: unknown[] }).messages) ? (parsed as { messages: unknown[] }).messages : [];
    return values.filter((value): value is Record<string, unknown> => typeof value === "object" && value !== null).map(normalizeLobbyItem).filter((item) => item.text);
  } catch {
    return raw.split("\n").filter(Boolean).slice(-50).map((line, index) => ({ id: String(index), author: "Technocore", text: line, timestamp: null, sequence: null }));
  }
}

export async function checkTechnocore(): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
  const started = Date.now();
  try {
    const response = await fetch("https://technocore.chat/healthz", { cache: "no-store", signal: AbortSignal.timeout(6000) });
    return { ok: response.ok, latencyMs: Date.now() - started, ...(response.ok ? {} : { error: `HTTP ${response.status}` }) };
  } catch (error) {
    return { ok: false, latencyMs: Date.now() - started, error: error instanceof Error ? error.message : "Tidak dapat terhubung" };
  }
}
