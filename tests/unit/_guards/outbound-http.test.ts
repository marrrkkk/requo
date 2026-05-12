/**
 * Self-test for the outbound-HTTP guard installed by `tests/setup.ts`.
 *
 * `tests/setup.ts` already installs the guard globally for every Vitest run,
 * so these specs snapshot and restore `globalThis.fetch` per test to install
 * a fresh guard on top of a known base fetch. That keeps the restoration
 * bulletproof: if any assertion fails, `afterEach` still puts the guarded
 * fetch the suite started with back in place before the next test runs.
 *
 * Validates: Requirement 7.4.
 */

import { installFetchGuard } from "@/tests/support/fetch-guard";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("outbound-http guard", () => {
  let previousFetch: typeof globalThis.fetch;

  beforeEach(() => {
    previousFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = previousFetch;
  });

  it("blocks requests to non-local hostnames", async () => {
    globalThis.fetch = (async () => new Response()) as typeof fetch;
    installFetchGuard();

    await expect(fetch("https://example.com")).rejects.toThrow(
      /Blocked request to example\.com/,
    );
  });

  it("passes through requests to local hostnames", async () => {
    const passthroughResponse = new Response("pong", { status: 200 });
    const baseFetch = vi.fn(async () => passthroughResponse) as unknown as typeof fetch;
    globalThis.fetch = baseFetch;

    installFetchGuard();

    const result = await fetch("http://127.0.0.1:3000/ping");

    expect(baseFetch).toHaveBeenCalledTimes(1);
    expect(baseFetch).toHaveBeenCalledWith("http://127.0.0.1:3000/ping", undefined);
    expect(result).toBe(passthroughResponse);
  });
});
