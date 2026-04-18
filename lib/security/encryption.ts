import "server-only";

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

import { env } from "@/lib/env";

const ENCRYPTION_PREFIX = "enc";
const ENCRYPTION_ALGORITHM = "aes-256-gcm";
const IV_LENGTH_BYTES = 12;
const AUTH_TAG_LENGTH_BYTES = 16;

type EncryptionKey = {
  key: Buffer;
  version: string;
};

function parseEncryptionKeys(): EncryptionKey[] {
  const raw = env.APP_ENCRYPTION_KEYS?.trim();

  if (!raw) {
    return [];
  }

  return raw
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const separatorIndex = entry.indexOf(":");

      if (separatorIndex <= 0 || separatorIndex === entry.length - 1) {
        throw new Error(
          "APP_ENCRYPTION_KEYS entries must use the format version:base64key.",
        );
      }

      const version = entry.slice(0, separatorIndex).trim();
      const encodedKey = entry.slice(separatorIndex + 1).trim();
      const key = Buffer.from(encodedKey, "base64");

      if (!version) {
        throw new Error("APP_ENCRYPTION_KEYS entries require a key version.");
      }

      if (key.length !== 32) {
        throw new Error(
          `APP_ENCRYPTION_KEYS key "${version}" must decode to 32 bytes.`,
        );
      }

      return {
        key,
        version,
      };
    });
}

const encryptionKeys = parseEncryptionKeys();

function requirePrimaryEncryptionKey() {
  const [primaryKey] = encryptionKeys;

  if (!primaryKey) {
    throw new Error(
      "APP_ENCRYPTION_KEYS must be configured before storing encrypted secrets.",
    );
  }

  return primaryKey;
}

function getEncryptionKeyByVersion(version: string) {
  const encryptionKey = encryptionKeys.find((key) => key.version === version);

  if (!encryptionKey) {
    throw new Error(`No encryption key is configured for version "${version}".`);
  }

  return encryptionKey;
}

function encodeBuffer(value: Buffer) {
  return value.toString("base64url");
}

function decodeBuffer(value: string) {
  return Buffer.from(value, "base64url");
}

export function isEncryptedValue(value: string | null | undefined): value is string {
  return typeof value === "string" && value.startsWith(`${ENCRYPTION_PREFIX}:`);
}

export function encryptValue(value: string) {
  if (isEncryptedValue(value)) {
    throw new Error("Refusing to encrypt a value that is already encrypted.");
  }

  const { key, version } = requirePrimaryEncryptionKey();
  const iv = randomBytes(IV_LENGTH_BYTES);
  const cipher = createCipheriv(ENCRYPTION_ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH_BYTES,
  });
  const encryptedValue = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return [
    ENCRYPTION_PREFIX,
    version,
    encodeBuffer(iv),
    encodeBuffer(encryptedValue),
    encodeBuffer(authTag),
  ].join(":");
}

export function decryptValue(encryptedValue: string) {
  const parts = encryptedValue.split(":");

  if (parts.length !== 5 || parts[0] !== ENCRYPTION_PREFIX) {
    throw new Error("The provided value is not a supported encrypted payload.");
  }

  const [, version, ivEncoded, ciphertextEncoded, authTagEncoded] = parts;
  const { key } = getEncryptionKeyByVersion(version);
  const iv = decodeBuffer(ivEncoded);
  const ciphertext = decodeBuffer(ciphertextEncoded);
  const authTag = decodeBuffer(authTagEncoded);
  const decipher = createDecipheriv(ENCRYPTION_ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH_BYTES,
  });

  decipher.setAuthTag(authTag);

  return Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]).toString("utf8");
}
