import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

// Redirect db to the test database before any feature imports.
vi.mock("@/lib/db/client", async () => {
  const { testDb: mockedDb } = await import("../support/db");

  return { db: mockedDb };
});

// `assertPublicActionRateLimit` reads request headers to build a fingerprint
// (IP + user-agent).  In the test environment there is no real HTTP request,
// so we stub `next/headers` to return a deterministic, constant header set.
// Each test uses a unique `scope` value so fingerprints never collide across
// test runs within the same window.
vi.mock("next/headers", () => ({
  headers: vi.fn(async () => ({
    get: (name: string) => {
      if (name === "x-forwarded-for") return "192.0.2.1";
      if (name === "user-agent") return "requo-test-agent/1.0";
      return null;
    },
  })),
}));

// `usage-limiter` uses `cacheLayer` (Redis + in-memory) for cooldown and
// cached usage counters. We mock it so tests never need a real Redis instance
// and always fall through to the DB aggregate, which runs against `testDb`.
vi.mock("@/lib/ai/cache-layer", () => ({
  cacheLayer: {
    get: vi.fn(async () => null),
    set: vi.fn(async () => {}),
    delete: vi.fn(async () => {}),
    incrementBy: vi.fn(async () => {}),
  },
}));

// next/cache is referenced transitively through some feature imports.
vi.mock("next/cache", () => ({
  cacheLife: vi.fn(),
  cacheTag: vi.fn(),
  revalidateTag: vi.fn(),
}));

import { like } from "drizzle-orm";

import { assertPublicActionRateLimit } from "@/lib/public-action-rate-limit";
import {
  checkUsageLimit,
  recordUsage,
  PLAN_LIMITS,
  TASK_WEIGHTS,
} from "@/lib/ai/usage-limiter";
import { aiUsageEvents, publicActionEvents } from "@/lib/db/schema";

import { closeTestDb, testDb } from "@/tests/support/db";
import {
  cleanupWorkflowFixture,
  createWorkflowFixture,
  type WorkflowFixtureIds,
} from "@/tests/support/fixtures/workflow";

const prefix = "test_ai_agent_rate_limit";
let ids: WorkflowFixtureIds;

describe("ai-agent rate limiting and usage quotas", () => {
  beforeAll(async () => {
    ids = await createWorkflowFixture(prefix);
  }, 30_000);

  afterAll(async () => {
    // Remove public_action_events rows written by this test run.
    await testDb
      .delete(publicActionEvents)
      .where(like(publicActionEvents.key, `%${prefix}%`));

    // Remove ai_usage_events rows written by this test run.
    await testDb
      .delete(aiUsageEvents)
      .where(like(aiUsageEvents.businessId, `${prefix}%`));

    await cleanupWorkflowFixture(prefix);
    await closeTestDb();
  }, 30_000);

  // ---------------------------------------------------------------------------
  // Test 1 — IP rate limiting
  // ---------------------------------------------------------------------------

  describe("IP rate limiting", () => {
    it("allows requests up to the limit then blocks the next one", async () => {
      // Use a small limit (5) so the test stays fast.  The scope is unique
      // per run so residual rows from prior runs never interfere.
      const scope = `ai-agent-ip:${prefix}-${Date.now()}`;
      const opts = {
        action: "public-inquiry-submit" as const,
        scope,
        limit: 5,
        windowMs: 60_000,
      };

      for (let i = 0; i < 5; i++) {
        const allowed = await assertPublicActionRateLimit(opts);
        expect(allowed).toBe(true);
      }

      // The 6th request must be blocked.
      const blocked = await assertPublicActionRateLimit(opts);
      expect(blocked).toBe(false);
    });

    it("resets after the window expires (simulated via a past windowStart)", async () => {
      // Use a 0 ms window so all prior rows are outside the window when a new
      // request arrives.
      const scope = `ai-agent-ip:${prefix}-window-reset-${Date.now()}`;
      const opts = {
        action: "public-inquiry-submit" as const,
        scope,
        limit: 1,
        windowMs: 0, // effectively: only rows inserted _right now_ count
      };

      // First request lands inside the empty window → allowed.
      const first = await assertPublicActionRateLimit(opts);
      expect(first).toBe(true);

      // Second request with a fresh 0 ms window will not see the first row
      // (it was inserted at least 1 ms ago), so it is also allowed.
      const second = await assertPublicActionRateLimit(opts);
      expect(second).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // Test 2 — Session-scoped rate limiting
  // ---------------------------------------------------------------------------

  describe("session rate limiting", () => {
    it("allows requests up to the limit then blocks the next one", async () => {
      // Use limit:3 to keep the test fast.
      const fakeToken = `${prefix}-session-token-abc123`;
      const scope = `ai-agent-session:${fakeToken}`;
      const opts = {
        action: "public-inquiry-submit" as const,
        scope,
        limit: 3,
        windowMs: 60_000,
      };

      for (let i = 0; i < 3; i++) {
        const allowed = await assertPublicActionRateLimit(opts);
        expect(allowed).toBe(true);
      }

      const blocked = await assertPublicActionRateLimit(opts);
      expect(blocked).toBe(false);
    });

    it("tracks different session tokens independently", async () => {
      const tokenA = `${prefix}-session-a-${Date.now()}`;
      const tokenB = `${prefix}-session-b-${Date.now()}`;

      const optsA = {
        action: "public-inquiry-submit" as const,
        scope: `ai-agent-session:${tokenA}`,
        limit: 1,
        windowMs: 60_000,
      };
      const optsB = {
        action: "public-inquiry-submit" as const,
        scope: `ai-agent-session:${tokenB}`,
        limit: 1,
        windowMs: 60_000,
      };

      // Exhaust token A's limit.
      expect(await assertPublicActionRateLimit(optsA)).toBe(true);
      expect(await assertPublicActionRateLimit(optsA)).toBe(false);

      // Token B is still within its own independent limit.
      expect(await assertPublicActionRateLimit(optsB)).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // Test 3 — Monthly usage quota
  // ---------------------------------------------------------------------------

  describe("monthly AI usage quota", () => {
    it("PLAN_LIMITS are non-zero for all plans", () => {
      // Sanity-check that the plan limits are configured.
      expect(PLAN_LIMITS.free).toBeGreaterThan(0);
      expect(PLAN_LIMITS.pro).toBeGreaterThan(0);
      expect(PLAN_LIMITS.business).toBeGreaterThan(0);

      // Plan limits should be ordered free < pro ≤ business.
      expect(PLAN_LIMITS.free).toBeLessThan(PLAN_LIMITS.pro);
      expect(PLAN_LIMITS.pro).toBeLessThanOrEqual(PLAN_LIMITS.business);
    });

    it("TASK_WEIGHTS are positive integers for all task types", () => {
      for (const [taskType, weight] of Object.entries(TASK_WEIGHTS)) {
        expect(weight, `weight for ${taskType}`).toBeGreaterThan(0);
        expect(Number.isInteger(weight), `weight for ${taskType} must be an integer`).toBe(true);
      }
    });

    it("allows requests when usage is below the plan limit", async () => {
      const result = await checkUsageLimit({
        userId: `${prefix}_owner`,
        businessId: ids.businessId,
        taskType: "agent_conversation",
        plan: "pro",
      });

      expect(result.allowed).toBe(true);
    });

    it("blocks requests when recorded usage meets the free plan limit", async () => {
      // Use a dedicated business ID so we don't interfere with other tests.
      const testBusinessId = `${prefix}_quota_business`;
      const testUserId = `${prefix}_quota_user`;

      // Record usage equal to the free plan limit so the next check is blocked.
      const freeLimit = PLAN_LIMITS.free;
      const weight = TASK_WEIGHTS.agent_conversation; // 1 credit per turn

      // Insert usage events directly so we control the exact total without
      // needing the cache layer (which is mocked to always return null,
      // causing the limiter to fall through to the DB aggregate).
      for (let i = 0; i < freeLimit; i++) {
        await testDb.insert(aiUsageEvents).values({
          id: `aue_${prefix}_quota_${i}`,
          userId: testUserId,
          businessId: testBusinessId,
          taskType: "agent_conversation",
          weight,
        });
      }

      const result = await checkUsageLimit({
        userId: testUserId,
        businessId: testBusinessId,
        taskType: "agent_conversation",
        plan: "free",
      });

      expect(result.allowed).toBe(false);
      expect(result).toMatchObject({
        allowed: false,
        reason: "quota_exceeded",
      });
      expect((result as { message: string }).message).toContain("allowance");
    });

    it("recordUsage inserts a row with the correct weight and task type", async () => {
      const businessId = ids.businessId;
      const userId = `${prefix}_owner`;

      // Count existing rows before we insert.
      const before = await testDb
        .select()
        .from(aiUsageEvents)
        .where(like(aiUsageEvents.businessId, businessId));

      await recordUsage(userId, businessId, "agent_conversation", TASK_WEIGHTS.agent_conversation);

      const after = await testDb
        .select()
        .from(aiUsageEvents)
        .where(like(aiUsageEvents.businessId, businessId));

      expect(after.length).toBe(before.length + 1);

      const inserted = after.find((row) => !before.some((b) => b.id === row.id));
      expect(inserted).toMatchObject({
        userId,
        businessId,
        taskType: "agent_conversation",
        weight: TASK_WEIGHTS.agent_conversation,
      });
    });
  });
});
