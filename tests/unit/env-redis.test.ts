import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

/**
 * `isRedisConfigured` is the single source of truth for whether the
 * distributed cache layer is usable, so it is worth pinning. It gates a
 * health-check message and documents the one consequence that is easy to
 * miss: without Redis the 24h embedding cache becomes per-instance, so on
 * serverless identical text re-embeds on every cold start.
 *
 * `emptyToUndefined` in `lib/env.ts` normalises whitespace-only strings to
 * `undefined`, so " " counts as unset.
 */

afterEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.unstubAllEnvs();
});

async function loadIsRedisConfigured(url: string, token: string) {
  vi.stubEnv("UPSTASH_REDIS_REST_URL", url);
  vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", token);

  const env = await import("@/lib/env");

  return env.isRedisConfigured;
}

describe("redis configuration detection", () => {
  it("is false when neither variable is set", async () => {
    expect(await loadIsRedisConfigured("", "")).toBe(false);
  });

  it("is false when only the URL is set", async () => {
    expect(await loadIsRedisConfigured("https://example.upstash.io", "")).toBe(
      false,
    );
  });

  it("is false when only the token is set", async () => {
    expect(await loadIsRedisConfigured("", "some-token")).toBe(false);
  });

  it("is true only when both are set", async () => {
    expect(
      await loadIsRedisConfigured("https://example.upstash.io", "some-token"),
    ).toBe(true);
  });

  it("treats whitespace-only values as unset", async () => {
    expect(await loadIsRedisConfigured("   ", "   ")).toBe(false);
  });

  it("is false when the token is whitespace but the URL is real", async () => {
    expect(await loadIsRedisConfigured("https://example.upstash.io", "  ")).toBe(
      false,
    );
  });
});
