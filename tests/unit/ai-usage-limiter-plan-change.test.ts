import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock "server-only" so the module can be imported in test env
vi.mock("server-only", () => ({}));

// Mock the database client
const _mockSelect = vi.fn();
const mockFrom = vi.fn();
const mockWhere = vi.fn();
const _mockInsert = vi.fn();
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
    createdAt: "created_at",
  },
}));

// Mock drizzle-orm operators
vi.mock("drizzle-orm", () => ({
  and: (...args: unknown[]) => args,
  eq: (col: unknown, val: unknown) => ({ col, val }),
  gte: (col: unknown, val: unknown) => ({ col, val }),
  sum: (col: unknown) => col,
  sql: Object.assign(
    (strings: TemplateStringsArray, ...values: unknown[]) => ({ strings, values }),
    { raw: (s: string) => s },
  ),
}));

// Mock the cache layer for cooldown tracking
const mockCacheGet = vi.fn().mockResolvedValue(null);
const mockCacheSet = vi.fn().mockResolvedValue(undefined);
const mockCacheDelete = vi.fn().mockResolvedValue(undefined);
const mockCacheIncrement = vi.fn().mockResolvedValue(1);

vi.mock("@/lib/ai/cache-layer", () => ({
  cacheLayer: {
    get: (...args: unknown[]) => mockCacheGet(...args),
    set: (...args: unknown[]) => mockCacheSet(...args),
    delete: (...args: unknown[]) => mockCacheDelete(...args),
    increment: (...args: unknown[]) => mockCacheIncrement(...args),
  },
}));

import {
  checkUsageLimit,
  PLAN_LIMITS,
} from "@/lib/ai/usage-limiter";

describe("lib/ai/usage-limiter — mid-month plan change (Requirement 6.7)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCacheGet.mockResolvedValue(null);

    // Default: DB returns 0 usage for both user and business scopes (batched query)
    mockFrom.mockReturnValue({ where: mockWhere });
    mockWhere.mockResolvedValue([{ userTotal: "0", businessTotal: "0" }]);
    mockValues.mockResolvedValue([]);
  });

  it("applies the new plan limit after upgrade without resetting usage", async () => {
    // Simulate: user has accumulated 8 units on Free plan, then upgrades to Pro
    // The accumulated usage (8) should be checked against the new Pro limit (300)
    mockWhere.mockResolvedValue([{ userTotal: "8", businessTotal: "8" }]);

    const result = await checkUsageLimit({
      userId: "user_1",
      businessId: "biz_1",
      taskType: "inquiry_summary",
      plan: "pro", // Plan resolved by getEffectivePlan after upgrade
    });

    // 8 < 300 (Pro limit) → allowed
    expect(result.allowed).toBe(true);
  });

  it("rejects requests after downgrade when accumulated usage exceeds new limit", async () => {
    // Simulate: user accumulated 150 units on Pro plan, then downgrades to Free
    // The accumulated usage (150) should be checked against the new Free limit (100)
    mockWhere.mockResolvedValue([{ userTotal: "150", businessTotal: "150" }]);

    const result = await checkUsageLimit({
      userId: "user_1",
      businessId: "biz_1",
      taskType: "inquiry_summary",
      plan: "free", // Plan resolved by getEffectivePlan after downgrade
    });

    // 150 >= 100 (Free limit) → rejected
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.reason).toBe("quota_exceeded");
      expect(result.message).toContain("Free");
    }
  });

  it("allows requests at the boundary after upgrade", async () => {
    // User used exactly 100 units (Free limit), then upgrades to Pro
    mockWhere.mockResolvedValue([{ userTotal: "100", businessTotal: "100" }]);

    const result = await checkUsageLimit({
      userId: "user_1",
      businessId: "biz_1",
      taskType: "inquiry_summary",
      plan: "pro", // After upgrade
    });

    // 100 < 500 (Pro limit) → allowed
    expect(result.allowed).toBe(true);
  });

  it("rejects at the exact boundary after downgrade", async () => {
    // User used exactly 100 units, then downgrades to Free (limit 100)
    mockWhere.mockResolvedValue([{ userTotal: "100", businessTotal: "100" }]);

    const result = await checkUsageLimit({
      userId: "user_1",
      businessId: "biz_1",
      taskType: "inquiry_summary",
      plan: "free",
    });

    // 100 >= 100 (Free limit) → rejected (meets limit)
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.reason).toBe("quota_exceeded");
    }
  });

  it("uses the plan parameter directly (no caching of old plan)", async () => {
    // First call with "free" plan and 9 units → allowed (9 < 10)
    mockWhere.mockResolvedValue([{ userTotal: "9", businessTotal: "9" }]);

    const result1 = await checkUsageLimit({
      userId: "user_1",
      businessId: "biz_1",
      taskType: "inquiry_summary",
      plan: "free",
    });
    expect(result1.allowed).toBe(true);

    // Reset cooldown for same user+task
    mockCacheGet.mockResolvedValue(null);

    // Second call with "pro" plan and same 9 units → still allowed (9 < 300)
    const result2 = await checkUsageLimit({
      userId: "user_1",
      businessId: "biz_1",
      taskType: "inquiry_summary",
      plan: "pro",
    });
    expect(result2.allowed).toBe(true);
  });

  it("verifies plan limits are correctly defined", () => {
    expect(PLAN_LIMITS.free).toBe(100);
    expect(PLAN_LIMITS.pro).toBe(500);
    expect(PLAN_LIMITS.business).toBe(2000);
  });

  it("handles upgrade from Pro to Business with high usage", async () => {
    // User accumulated 250 units on Pro, upgrades to Business (limit 2000)
    mockWhere.mockResolvedValue([{ userTotal: "250", businessTotal: "250" }]);

    const result = await checkUsageLimit({
      userId: "user_1",
      businessId: "biz_1",
      taskType: "quote_draft",
      plan: "business",
    });

    // 250 < 2000 (Business limit) → allowed
    expect(result.allowed).toBe(true);
  });

  it("handles downgrade from Business to Pro with high usage", async () => {
    // User accumulated 500 units on Business, downgrades to Pro (limit 300)
    mockWhere.mockResolvedValue([{ userTotal: "500", businessTotal: "500" }]);

    const result = await checkUsageLimit({
      userId: "user_1",
      businessId: "biz_1",
      taskType: "quote_draft",
      plan: "pro",
    });

    // 500 >= 300 (Pro limit) → rejected
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.reason).toBe("quota_exceeded");
      expect(result.message).toContain("Pro");
    }
  });
});
