import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from "node:crypto";
import { productionSecret } from "./config";

const TEXT_PREFIX = "htenc:v1:";
const BINARY_PREFIX = Buffer.from("HTE1", "ascii");

function encryptionKey(): Buffer | null {
  const encoded = productionSecret("HEALTHTHREAD_DATA_ENCRYPTION_KEY", 43);
  if (!encoded) return null;
  const key = Buffer.from(encoded, "base64");
  if (key.length !== 32) {
    throw new Error("healththread-data-encryption-key-must-be-32-bytes-base64");
  }
  return key;
}

function encrypt(plain: Buffer, aad: string): Buffer {
  const key = encryptionKey();
  if (!key) return plain;
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(Buffer.from(aad, "utf8"));
  const ciphertext = Buffer.concat([cipher.update(plain), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), ciphertext]);
}

function decrypt(payload: Buffer, aad: string): Buffer {
  const key = encryptionKey();
  if (!key) throw new Error("encrypted-data-key-unavailable");
  if (payload.length < 29) throw new Error("encrypted-data-invalid");
  const iv = payload.subarray(0, 12);
  const tag = payload.subarray(12, 28);
  const ciphertext = payload.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAAD(Buffer.from(aad, "utf8"));
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

export function sealText(plain: string, aad: string): string {
  const key = encryptionKey();
  if (!key) return plain;
  return `${TEXT_PREFIX}${encrypt(Buffer.from(plain, "utf8"), aad).toString("base64url")}`;
}

export function openText(stored: string, aad: string): string {
  if (!stored.startsWith(TEXT_PREFIX)) return stored;
  return decrypt(Buffer.from(stored.slice(TEXT_PREFIX.length), "base64url"), aad).toString("utf8");
}

export function sealBytes(plain: Buffer, aad: string): Buffer {
  const key = encryptionKey();
  if (!key) return plain;
  return Buffer.concat([BINARY_PREFIX, encrypt(plain, aad)]);
}

export function openBytes(stored: Buffer, aad: string): Buffer {
  if (!stored.subarray(0, BINARY_PREFIX.length).equals(BINARY_PREFIX)) return stored;
  return decrypt(stored.subarray(BINARY_PREFIX.length), aad);
}

export function encryptionConfigured(): boolean {
  return Boolean(encryptionKey());
}
