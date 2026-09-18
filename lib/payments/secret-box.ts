import "server-only";

import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from "node:crypto";

import { env } from "@/lib/env";

const VERSION = "v1";
const IV_BYTES = 12;
const KEY_BYTES = 32;

function resolveKey(explicitKey?: string): Buffer {
  const raw = (explicitKey ?? env.PAYMENT_CREDENTIALS_KEY ?? "").trim();
  if (!raw) throw new Error("PAYMENT_CREDENTIALS_KEY is not configured.");
  let key: Buffer;
  try {
    key = Buffer.from(raw, "base64");
  } catch {
    throw new Error("PAYMENT_CREDENTIALS_KEY is malformed.");
  }
  if (key.length !== KEY_BYTES)
    throw new Error("PAYMENT_CREDENTIALS_KEY must decode to 32 bytes.");
  return key;
}

export function encryptSecret(plaintext: string, explicitKey?: string): string {
  const key = resolveKey(explicitKey);
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return [
    VERSION,
    iv.toString("base64url"),
    tag.toString("base64url"),
    ciphertext.toString("base64url"),
  ].join(".");
}

export function decryptSecret(payload: string, explicitKey?: string): string {
  const key = resolveKey(explicitKey);
  const parts = payload.split(".");
  if (parts.length !== 4 || parts[0] !== VERSION)
    throw new Error("Malformed encrypted payload.");
  const [, ivB64, tagB64, dataB64] = parts;
  let iv: Buffer;
  let tag: Buffer;
  let data: Buffer;
  try {
    iv = Buffer.from(ivB64, "base64url");
    tag = Buffer.from(tagB64, "base64url");
    data = Buffer.from(dataB64, "base64url");
  } catch {
    throw new Error("Malformed encrypted payload.");
  }
  if (iv.length !== IV_BYTES || tag.length !== 16)
    throw new Error("Malformed encrypted payload.");
  try {
    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString(
      "utf8",
    );
  } catch {
    throw new Error("Failed to decrypt payload.");
  }
}
