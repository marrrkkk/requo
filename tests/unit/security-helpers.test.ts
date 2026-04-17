import { afterEach, describe, expect, it, vi } from "vitest";

const primaryKey = Buffer.alloc(32, 7).toString("base64");
const rotatedKey = Buffer.alloc(32, 11).toString("base64");

describe("security helpers", () => {
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it("encrypts and decrypts reversible secrets", async () => {
    vi.stubEnv("APP_ENCRYPTION_KEYS", `v1:${primaryKey}`);

    const { decryptValue, encryptValue, isEncryptedValue } = await import(
      "@/lib/security/encryption"
    );

    const encryptedValue = encryptValue("refresh-token-value");

    expect(isEncryptedValue(encryptedValue)).toBe(true);
    expect(encryptedValue).not.toContain("refresh-token-value");
    expect(decryptValue(encryptedValue)).toBe("refresh-token-value");
  });

  it("supports decrypting values after key rotation", async () => {
    vi.stubEnv("APP_ENCRYPTION_KEYS", `v1:${primaryKey}`);

    const firstModule = await import("@/lib/security/encryption");
    const encryptedValue = firstModule.encryptValue("stable-secret");

    vi.resetModules();
    vi.stubEnv("APP_ENCRYPTION_KEYS", `v2:${rotatedKey},v1:${primaryKey}`);

    const rotatedModule = await import("@/lib/security/encryption");

    expect(rotatedModule.decryptValue(encryptedValue)).toBe("stable-secret");
    expect(rotatedModule.encryptValue("new-secret")).toMatch(/^enc:v2:/);
  });

  it("hashes opaque lookup tokens without exposing the original token", async () => {
    vi.stubEnv(
      "BETTER_AUTH_SECRET",
      "test-secret-at-least-32-characters-long-so-zod-passes",
    );
    vi.stubEnv("APP_TOKEN_HASH_SECRET", "0123456789abcdef0123456789abcdef");

    const { hashOpaqueToken } = await import("@/lib/security/tokens");

    const hash = hashOpaqueToken("quote-public-token");

    expect(hash).toBe(hashOpaqueToken("quote-public-token"));
    expect(hash).not.toContain("quote-public-token");
  });
});
