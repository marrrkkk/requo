/**
 * Unit tests for AI agent session token generation.
 *
 * `generateSessionToken()` is an internal helper in `session-service.ts`.
 * We test it indirectly through `createAgentSession()`, which is the only
 * public surface that calls it.  The DB is fully mocked so no real database
 * connection is needed.
 */
import { describe, expect, it, vi } from "vitest";

// Required so `session-service.ts` (which is "server-only") can be imported.
vi.mock("server-only", () => ({}));

// Stub out Next.js cache helpers used transitively.
vi.mock("next/cache", () => ({
  cacheLife: vi.fn(),
  cacheTag: vi.fn(),
  revalidateTag: vi.fn(),
}));

// Minimal DB mock: `insert().values()` resolves successfully and
// `select()…` chains return an empty array (not needed for this test).
const mockValues = vi.fn(async () => []);

vi.mock("@/lib/db/client", () => ({
  db: {
    insert: vi.fn(() => ({ values: mockValues })),
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        innerJoin: vi.fn(() => ({
          where: vi.fn(() => ({ limit: vi.fn(async () => []) })),
        })),
        where: vi.fn(() => ({ limit: vi.fn(async () => []) })),
      })),
    })),
  },
}));

import { createAgentSession } from "@/features/ai-agent/session-service";

describe("session token generation", () => {
  it("generates a 64-character lowercase hex token", async () => {
    const result = await createAgentSession({ businessId: "biz_test" });

    expect(result.publicToken).toHaveLength(64);
    expect(result.publicToken).toMatch(/^[0-9a-f]{64}$/);
  });

  it("generates tokens that contain only URL-safe characters", async () => {
    // Hex tokens are URL-safe by construction, but verify explicitly so a
    // future implementation change (e.g. base64url) is still caught.
    const result = await createAgentSession({ businessId: "biz_test" });

    // Must not require percent-encoding in a URL.
    expect(result.publicToken).not.toMatch(/[^a-zA-Z0-9_\-.~]/);
  });

  it("generates a prefixed session ID (ags_<hex>)", async () => {
    const result = await createAgentSession({ businessId: "biz_test" });

    expect(result.sessionId).toMatch(/^ags_[0-9a-f]+$/);
  });

  it("generates tokens with sufficient entropy (50 consecutive tokens are unique)", async () => {
    const tokens = new Set<string>();

    for (let i = 0; i < 50; i++) {
      const result = await createAgentSession({ businessId: `biz_test_${i}` });
      tokens.add(result.publicToken);
    }

    // All 50 tokens must be distinct — any collision indicates an RNG problem.
    expect(tokens.size).toBe(50);
  });

  it("generates session IDs with sufficient entropy (50 consecutive IDs are unique)", async () => {
    const sessionIds = new Set<string>();

    for (let i = 0; i < 50; i++) {
      const result = await createAgentSession({ businessId: `biz_test_${i}` });
      sessionIds.add(result.sessionId);
    }

    expect(sessionIds.size).toBe(50);
  });

  it("sets an expiry approximately 24 hours from now", async () => {
    const before = Date.now();
    const result = await createAgentSession({ businessId: "biz_test" });
    const after = Date.now();

    const expectedMin = before + 23 * 60 * 60 * 1000;
    const expectedMax = after + 25 * 60 * 60 * 1000;

    expect(result.expiresAt.getTime()).toBeGreaterThanOrEqual(expectedMin);
    expect(result.expiresAt.getTime()).toBeLessThanOrEqual(expectedMax);
  });
});
