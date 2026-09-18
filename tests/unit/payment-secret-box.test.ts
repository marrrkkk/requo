import { randomBytes } from "node:crypto";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { decryptSecret, encryptSecret } from "@/lib/payments/secret-box";

function testKey(): string {
  return randomBytes(32).toString("base64");
}

describe("payment secret box", () => {
  it("round-trips encrypt/decrypt", () => {
    const key = testKey();
    const ciphertext = encryptSecret(JSON.stringify({ secretKey: "sk_test_123" }), key);
    expect(decryptSecret(ciphertext, key)).toBe(JSON.stringify({ secretKey: "sk_test_123" }));
  });

  it("produces different ciphertext for the same plaintext", () => {
    const key = testKey();
    const a = encryptSecret("same", key);
    const b = encryptSecret("same", key);
    expect(a).not.toBe(b);
    expect(decryptSecret(a, key)).toBe("same");
    expect(decryptSecret(b, key)).toBe("same");
  });

  it("rejects tampered ciphertext", () => {
    const key = testKey();
    const ciphertext = encryptSecret("hello", key);
    const parts = ciphertext.split(".");
    parts[3] = `${parts[3].slice(0, -2)}AA`;
    expect(() => decryptSecret(parts.join("."), key)).toThrow();
  });

  it("rejects decryption with the wrong key", () => {
    const ciphertext = encryptSecret("hello", testKey());
    expect(() => decryptSecret(ciphertext, testKey())).toThrow();
  });

  it("rejects malformed ciphertext", () => {
    const key = testKey();
    expect(() => decryptSecret("not-a-payload", key)).toThrow();
    expect(() => decryptSecret("v1.only.two", key)).toThrow();
  });

  it("fails explicitly without a key", () => {
    expect(() => encryptSecret("hello", "")).toThrow(/not configured/);
    expect(() => decryptSecret("v1.a.b.c", "")).toThrow(/not configured/);
  });
});
