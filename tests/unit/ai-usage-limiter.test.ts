import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock "server-only" so the module can be imported in test env
vi.mock("server-only", () => ({}));

// Mock the database client
const mockFrom = vi.fn();
const mockWhere = vi.fn();
const mockValues = vi.fn();

vi.mock("@/lib/db/client", () => ({
  db: {
    select: () => ({ from: mockFrom }),
    insert: () => ({ values: mockValues }),
  },
}));

vi.mock("@/lib/db/schema", () => ({
  aiUsageEvents: {
    userId: "user_id",
    businessId: "business_id",
    taskType: "task_type",
    weight: "weight",
    plan: "plan",
    createdAt: "created_at",
  },
}));

// Mock drizzle-orm operators
vi.mock("drizzle-orm", () => ({
  and: (...args: unknown[]) => args,
  eq: (col: unknown, val: unknown) => ({ col, val }),
  gte: (col: unknown, val: unknown) => ({ col, val }),
  isNull: (col: unknown) => ({ isNull: col }),
  or: (...args: unknown[]) => args,
  sum: (col: unknown) => col,
  sql: Object.assign(
    (strings: TemplateStringsArray, ...values: unknown[]) => ({ strings, values }),
    { raw: (s: string) => s },
  ),
}));

// Mock the cache layer for cooldown + usage caching
const mockCacheGet = vi.fn().mockResolvedValue(null);
const mockCacheSet = vi.fn().mockResolvedValue(undefined);
const mockCacheDelete = vi.fn().mockResolvedValue(undefined);
const mockCacheIncrementBy = vi.fn().mockResolvedValue(1);

vi.mock("@/lib/ai/cache-layer", () => ({
  cacheLayer: {
    get: (...args: unknown[]) => mockCacheGet(...args),
    set: (...args: unknown[]) => mockCacheSet(...args),
    delete: (...args: unknown[]) => mockCacheDelete(...args),
    increment: (...args: unknown[]) => mockCacheIncrementBy(...args),
    incrementBy: (...args: unknown[]) => mockCacheIncrementBy(...args),
  },
}));

import {
  checkUsageLimit,
  computeCreditsForTokens,
  computeUsageWeight,
  recordUsage,
  PLAN_LIMITS,
  TASK_WEIGHTS,
  CREDIT_TOKEN_DIVISOR,
  MIN_CREDITS_PER_INVOCATION,
} from "@/lib/ai/usage-limiter";

/** Reads the conditions array handed to the mocked `.where(...)` call. */
function lastWhereConditions(): unknown {
  const calls = mockWhere.mock.calls;
  return calls[calls.length - 1]?.[0];
}

describe("lib/ai/usage-limiter — plan-scoped limits", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCacheGet.mockResolvedValue(null);

    // Default: DB returns 0 usage for the business scope
    mockFrom.mockReturnValue({ where: mockWhere });
    mockWhere.mockResolvedValue([{ businessTotal: "0" }]);
    mockValues.mockResolvedValue([]);
  });

  it("starts a fresh allowance on upgrade instead of carrying the old plan's usage", async () => {
    // Business burned all 30 Free credits, then upgraded to Pro mid-month.
    // Usage is plan-scoped, so the Pro bucket is empty → the full Pro
    // allowance is available immediately.
    mockWhere.mockResolvedValue([{ businessTotal: "0" }]);

    const result = await checkUsageLimit({
      userId: "user_1",
      businessId: "biz_1",
      taskType: "quote_improvement",
      plan: "pro",
    });

    expect(result.allowed).toBe(true);
  });

  it("starts a fresh (smaller) allowance on downgrade", async () => {
    // Business used 150 on Pro, then downgraded to Free mid-month. The Free
    // bucket is its own scope, so it is not instantly exhausted by the Pro
    // spend — the downgrade grants the full Free allowance.
    mockWhere.mockResolvedValue([{ businessTotal: "0" }]);

    const result = await checkUsageLimit({
      userId: "user_1",
      businessId: "biz_1",
      taskType: "quote_improvement",
      plan: "free",
    });

    expect(result.allowed).toBe(true);
  });

  it("scopes the usage query to the current plan", async () => {
    mockWhere.mockResolvedValue([{ businessTotal: "0" }]);

    await checkUsageLimit({
      userId: "user_1",
      businessId: "biz_1",
      taskType: "quote_draft",
      plan: "business",
    });

    // The predicate must pin the plan, so another plan's rows can never be
    // summed into this plan's allowance.
    expect(JSON.stringify(lastWhereConditions())).toContain("business");
    expect(JSON.stringify(lastWhereConditions())).toContain("plan");
  });

  it("still counts legacy rows that have no plan attributed", async () => {
    mockWhere.mockResolvedValue([{ businessTotal: "0" }]);

    await checkUsageLimit({
      userId: "user_1",
      businessId: "biz_1",
      taskType: "quote_draft",
      plan: "pro",
    });

    // `plan = current OR plan IS NULL` — pre-attribution rows must keep
    // counting so no business loses accumulated allowance at deploy time.
    expect(JSON.stringify(lastWhereConditions())).toContain("isNull");
  });

  it("rejects once the current plan's own allowance is exhausted", async () => {
    // 30 units already recorded under the Free plan
    mockWhere.mockResolvedValue([{ businessTotal: "30" }]);

    const result = await checkUsageLimit({
      userId: "user_1",
      businessId: "biz_1",
      taskType: "quote_improvement",
      plan: "free",
    });

    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.reason).toBe("quota_exceeded");
      expect(result.message).toContain("AI drafting allowance");
      expect(result.message).toContain("Upgrade for more drafts");
    }
  });

  it("allows the request just below the plan limit", async () => {
    mockWhere.mockResolvedValue([{ businessTotal: "29" }]);

    const result = await checkUsageLimit({
      userId: "user_1",
      businessId: "biz_1",
      taskType: "quote_improvement",
      plan: "free",
    });

    expect(result.allowed).toBe(true);
  });

  it("does not offer an upgrade nudge on the highest plan", async () => {
    mockWhere.mockResolvedValue([{ businessTotal: "500" }]);

    const result = await checkUsageLimit({
      userId: "user_1",
      businessId: "biz_1",
      taskType: "quote_draft",
      plan: "business",
    });

    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.reason).toBe("quota_exceeded");
      expect(result.message).not.toContain("Upgrade");
    }
  });

  it("scopes usage to the business, not the owner", async () => {
    // Owner used 200 units across business A, but business B is untouched.
    // Because allowances are business-scoped, business B gets its own.
    mockWhere.mockResolvedValue([{ businessTotal: "0" }]);

    const result = await checkUsageLimit({
      userId: "user_1",
      businessId: "biz_B",
      taskType: "quote_draft",
      plan: "free",
    });

    expect(result.allowed).toBe(true);
  });

  it("verifies plan limits are correctly derived", () => {
    expect(PLAN_LIMITS.free).toBe(30);
    expect(PLAN_LIMITS.pro).toBe(150);
    expect(PLAN_LIMITS.business).toBe(500);
  });

  it("records the plan alongside the weight", async () => {
    await recordUsage("user_1", "biz_1", "quote_draft", 4, "pro");

    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user_1",
        businessId: "biz_1",
        taskType: "quote_draft",
        weight: 4,
        plan: "pro",
      }),
    );
  });

  it("caches usage under a plan-scoped key so a plan change cannot reuse it", async () => {
    mockWhere.mockResolvedValue([{ businessTotal: "0" }]);

    await checkUsageLimit({
      userId: "user_1",
      businessId: "biz_1",
      taskType: "quote_draft",
      plan: "free",
    });

    const cachedKeys = mockCacheSet.mock.calls.map((call) => call[0]);
    expect(cachedKeys.some((key) => String(key).includes(":free:"))).toBe(true);
    expect(cachedKeys.some((key) => String(key).includes(":pro:"))).toBe(false);
  });
});

describe("lib/ai/usage-limiter — cooldown", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockReturnValue({ where: mockWhere });
    mockWhere.mockResolvedValue([{ businessTotal: "0" }]);
    mockValues.mockResolvedValue([]);
  });

  /**
   * The cooldown key is the only cache entry these tests populate; usage
   * counters must still miss so the limiter falls through to the DB aggregate.
   */
  function stubCooldownAt(timestamp: number) {
    mockCacheGet.mockImplementation(async (key: unknown) =>
      String(key).startsWith("cool:") ? timestamp : null,
    );
  }

  it("rejects a second request inside the cooldown window", async () => {
    stubCooldownAt(Date.now() - 1_000); // 3s window, 1s elapsed

    const result = await checkUsageLimit({
      userId: "user_1",
      businessId: "biz_1",
      taskType: "quote_draft",
      plan: "pro",
    });

    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.reason).toBe("cooldown");
      expect(result.message).toContain("Please wait");
    }
  });

  it("allows the request once the cooldown window has elapsed", async () => {
    stubCooldownAt(Date.now() - 5_000); // 3s window, 5s elapsed

    const result = await checkUsageLimit({
      userId: "user_1",
      businessId: "biz_1",
      taskType: "quote_draft",
      plan: "pro",
    });

    expect(result.allowed).toBe(true);
  });
});

describe("lib/ai/usage-limiter — token-based credit weights", () => {
  it("uses a 5,000 weighted-token divisor", () => {
    expect(CREDIT_TOKEN_DIVISOR).toBe(5_000);
    expect(MIN_CREDITS_PER_INVOCATION).toBe(1);
  });

  it("charges at least one credit even for a zero-token invocation", () => {
    expect(computeCreditsForTokens(0, 0)).toBe(1);
  });

  it("charges one credit at exactly the divisor", () => {
    expect(computeCreditsForTokens(5_000, 0)).toBe(1);
  });

  it("rounds up past the divisor", () => {
    expect(computeCreditsForTokens(5_001, 0)).toBe(2);
  });

  it("weights output tokens 4x", () => {
    // 1,250 output tokens × 4 = 5,000 weighted tokens → exactly 1 credit
    expect(computeCreditsForTokens(0, 1_250)).toBe(1);
    // 1,251 output tokens × 4 = 5,004 weighted tokens → 2 credits
    expect(computeCreditsForTokens(0, 1_251)).toBe(2);
  });

  it("prices a typical quote draft at ~2 credits", () => {
    // 4,000 in + 800 out → 4,000 + 3,200 = 7,200 weighted → ceil(1.44) = 2
    expect(computeCreditsForTokens(4_000, 800)).toBe(2);
  });

  it("prices a typical assistant turn at ~2 credits", () => {
    // 6,000 in + 500 out → 6,000 + 2,000 = 8,000 weighted → ceil(1.6) = 2
    expect(computeCreditsForTokens(6_000, 500)).toBe(2);
  });

  it("prices a light agent turn at 1 credit", () => {
    // 3,000 in + 200 out → 3,000 + 800 = 3,800 weighted → 1 credit
    expect(computeCreditsForTokens(3_000, 200)).toBe(1);
  });

  it("never returns a negative or non-finite weight", () => {
    expect(computeCreditsForTokens(-100, -100)).toBe(1);
    expect(computeCreditsForTokens(Number.NaN, 0)).toBe(1);
    expect(computeCreditsForTokens(Number.POSITIVE_INFINITY, 0)).toBe(1);
  });

  it("scales the weight with token spend, not with the task type", () => {
    const smallDraft = computeUsageWeight("quote_draft", {
      inputTokens: 1_000,
      outputTokens: 100,
    });
    const largeDraft = computeUsageWeight("quote_draft", {
      inputTokens: 40_000,
      outputTokens: 8_000,
    });

    expect(largeDraft).toBeGreaterThan(smallDraft);
    // 1,000 + 400 = 1,400 → 1 credit; 40,000 + 32,000 = 72,000 → 15 credits
    expect(smallDraft).toBe(1);
    expect(largeDraft).toBe(15);
  });

  it("falls back to the fixed task weight when no usage was reported", () => {
    expect(computeUsageWeight("quote_draft", undefined)).toBe(
      TASK_WEIGHTS.quote_draft,
    );
    expect(computeUsageWeight("quote_improvement", null)).toBe(
      TASK_WEIGHTS.quote_improvement,
    );
    expect(computeUsageWeight("agent_conversation", undefined)).toBe(
      TASK_WEIGHTS.agent_conversation,
    );
  });

  it("meters a reported-but-empty usage instead of falling back", () => {
    // Usage present with zero tokens is a real (empty) invocation, not a
    // missing-accounting case — it still costs the minimum.
    expect(computeUsageWeight("quote_draft", { inputTokens: 0, outputTokens: 0 })).toBe(1);
  });

  it("treats a missing token field as zero rather than as absent usage", () => {
    // inputTokens reported, outputTokens omitted → 10,000 + 0 = 2 credits
    expect(computeUsageWeight("quote_draft", { inputTokens: 10_000 })).toBe(2);
  });
});
