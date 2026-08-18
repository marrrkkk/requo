import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";

// Mock "server-only" so the module can be imported in test env
vi.mock("server-only", () => ({}));

// Mock the cache layer with an in-memory implementation for testing
const mockStore = new Map<string, { value: unknown; expiresAt: number }>();

vi.mock("@/lib/ai/cache-layer", () => ({
  cacheLayer: {
    get: vi.fn(async (key: string) => {
      const entry = mockStore.get(key);
      if (!entry) return null;
      if (Date.now() > entry.expiresAt) {
        mockStore.delete(key);
        return null;
      }
      return entry.value;
    }),
    set: vi.fn(async (key: string, value: unknown, ttlSeconds: number) => {
      mockStore.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
    }),
    delete: vi.fn(async (key: string) => {
      mockStore.delete(key);
    }),
    increment: vi.fn(async (key: string, ttlSeconds: number) => {
      const entry = mockStore.get(key);
      const current = entry ? (entry.value as number) : 0;
      const newValue = current + 1;
      mockStore.set(key, { value: newValue, expiresAt: Date.now() + ttlSeconds * 1000 });
      return newValue;
    }),
  },
}));

import {
  generateCacheKey,
  getCachedOutput,
  setCachedOutput,
  NULL_SENTINEL,
  BUSINESS_SCOPED_TASKS,
} from "@/lib/ai/ai-cache";
import type { CacheKeyComponents, CachedAiOutput } from "@/lib/ai/ai-cache";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeKey(overrides?: Partial<CacheKeyComponents>): CacheKeyComponents {
  return {
    businessId: "biz_123",
    userId: "user_456",
    taskType: "quote_draft",
    promptVersion: "abc123",
    modelTier: "cheap",
    sourceDataVersions: {
      inquiry: "2024-01-15T10:00:00.000Z",
      pricing: null,
    },
    ...overrides,
  };
}

function makeOutput(overrides?: Partial<CachedAiOutput>): CachedAiOutput {
  return {
    text: "This is a draft quote.",
    model: "llama-3.1-8b-instant",
    provider: "groq",
    createdAt: "2024-01-15T10:00:00.000Z",
    usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// generateCacheKey
// ---------------------------------------------------------------------------

describe("generateCacheKey", () => {
  it("produces a 64-character hex string (SHA-256)", () => {
    const key = generateCacheKey(makeKey());
    expect(key).toMatch(/^[a-f0-9]{64}$/);
  });

  it("is deterministic — same components produce the same key", () => {
    const key1 = generateCacheKey(makeKey());
    const key2 = generateCacheKey(makeKey());
    expect(key1).toBe(key2);
  });

  it("produces different keys when businessId differs", () => {
    const key1 = generateCacheKey(makeKey({ businessId: "biz_a" }));
    const key2 = generateCacheKey(makeKey({ businessId: "biz_b" }));
    expect(key1).not.toBe(key2);
  });

  it("produces different keys when userId differs", () => {
    const key1 = generateCacheKey(makeKey({ userId: "user_a" }));
    const key2 = generateCacheKey(makeKey({ userId: "user_b" }));
    expect(key1).not.toBe(key2);
  });

  it("produces different keys when taskType differs", () => {
    const key1 = generateCacheKey(makeKey({ taskType: "quote_draft" }));
    const key2 = generateCacheKey(makeKey({ taskType: "quote_improvement" }));
    expect(key1).not.toBe(key2);
  });

  it("produces different keys when promptVersion differs", () => {
    const key1 = generateCacheKey(makeKey({ promptVersion: "v1" }));
    const key2 = generateCacheKey(makeKey({ promptVersion: "v2" }));
    expect(key1).not.toBe(key2);
  });

  it("produces different keys when modelTier differs", () => {
    const key1 = generateCacheKey(makeKey({ modelTier: "cheap" }));
    const key2 = generateCacheKey(makeKey({ modelTier: "balanced" }));
    expect(key1).not.toBe(key2);
  });

  it("produces different keys when sourceDataVersions differ", () => {
    const key1 = generateCacheKey(
      makeKey({
        sourceDataVersions: { inquiry: "2024-01-15T10:00:00.000Z" },
      }),
    );
    const key2 = generateCacheKey(
      makeKey({
        sourceDataVersions: { inquiry: "2024-01-15T11:00:00.000Z" },
      }),
    );
    expect(key1).not.toBe(key2);
  });

  it("uses NULL_SENTINEL for null sourceDataVersions values", () => {
    const keyWithNull = generateCacheKey(
      makeKey({ sourceDataVersions: { field: null } }),
    );
    const keyWithSentinel = generateCacheKey(
      makeKey({ sourceDataVersions: { field: NULL_SENTINEL } }),
    );
    expect(keyWithNull).toBe(keyWithSentinel);
  });

  it("is order-independent for sourceDataVersions keys", () => {
    const key1 = generateCacheKey(
      makeKey({
        sourceDataVersions: { alpha: "v1", beta: "v2", gamma: "v3" },
      }),
    );
    const key2 = generateCacheKey(
      makeKey({
        sourceDataVersions: { gamma: "v3", alpha: "v1", beta: "v2" },
      }),
    );
    expect(key1).toBe(key2);
  });
});

// ---------------------------------------------------------------------------
// getCachedOutput / setCachedOutput
// ---------------------------------------------------------------------------

describe("getCachedOutput and setCachedOutput", () => {
  beforeEach(() => {
    mockStore.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns null for a cache miss", async () => {
    const result = await getCachedOutput(makeKey());
    expect(result).toBeNull();
  });

  it("returns cached output within TTL", async () => {
    const key = makeKey();
    const output = makeOutput();

    await setCachedOutput(key, output, 3600);
    const result = await getCachedOutput(key);

    expect(result).toEqual(output);
  });

  it("returns null after TTL expires", async () => {
    const key = makeKey();
    const output = makeOutput();

    await setCachedOutput(key, output, 60); // 60 seconds TTL

    // Advance time past TTL
    vi.advanceTimersByTime(61_000);

    const result = await getCachedOutput(key);
    expect(result).toBeNull();
  });

  it("returns output just before TTL expires", async () => {
    const key = makeKey();
    const output = makeOutput();

    await setCachedOutput(key, output, 60);

    // Advance time to just before expiry
    vi.advanceTimersByTime(59_000);

    const result = await getCachedOutput(key);
    expect(result).toEqual(output);
  });

  it("stores multiple entries independently", async () => {
    const key1 = makeKey({ businessId: "biz_1" });
    const key2 = makeKey({ businessId: "biz_2" });
    const output1 = makeOutput({ text: "Output 1" });
    const output2 = makeOutput({ text: "Output 2" });

    await setCachedOutput(key1, output1, 3600);
    await setCachedOutput(key2, output2, 3600);

    expect(await getCachedOutput(key1)).toEqual(output1);
    expect(await getCachedOutput(key2)).toEqual(output2);
  });

  it("overwrites existing entry with same key", async () => {
    const key = makeKey();
    const output1 = makeOutput({ text: "First" });
    const output2 = makeOutput({ text: "Second" });

    await setCachedOutput(key, output1, 3600);
    await setCachedOutput(key, output2, 3600);

    const result = await getCachedOutput(key);
    expect(result?.text).toBe("Second");
  });

  it("handles write without throwing", async () => {
    await expect(
      setCachedOutput(makeKey(), makeOutput(), 3600),
    ).resolves.toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// NULL_SENTINEL
// ---------------------------------------------------------------------------

describe("NULL_SENTINEL", () => {
  it("is the string __null__", () => {
    expect(NULL_SENTINEL).toBe("__null__");
  });
});

// ---------------------------------------------------------------------------
// Cache key scoping
// ---------------------------------------------------------------------------

describe("cache key scoping", () => {
  beforeEach(() => {
    mockStore.clear();
  });

  it("BUSINESS_SCOPED_TASKS is empty (no remaining business-scoped tasks)", () => {
    expect(BUSINESS_SCOPED_TASKS.size).toBe(0);
  });

  it("produces different keys for different userIds on quote_draft", () => {
    const key1 = generateCacheKey(
      makeKey({ userId: "user_a", taskType: "quote_draft" }),
    );
    const key2 = generateCacheKey(
      makeKey({ userId: "user_b", taskType: "quote_draft" }),
    );
    expect(key1).not.toBe(key2);
  });

  it("still differentiates by businessId", () => {
    const key1 = generateCacheKey(makeKey({ businessId: "biz_a" }));
    const key2 = generateCacheKey(makeKey({ businessId: "biz_b" }));
    expect(key1).not.toBe(key2);
  });

  it("uses ai: prefix for quote_draft keys in getCachedOutput/setCachedOutput", async () => {
    const key = makeKey({ taskType: "quote_draft" });
    const output = makeOutput();

    await setCachedOutput(key, output, 3600);

    // Verify the stored key uses the ai: prefix (not ai:biz:)
    const storedKeys = Array.from(mockStore.keys());
    const personalKeys = storedKeys.filter(
      (k) => k.startsWith("ai:") && !k.startsWith("ai:biz:"),
    );
    expect(personalKeys.length).toBe(1);
  });

  it("different users do NOT share cached output for quote_draft", async () => {
    const keyUser1 = makeKey({ userId: "user_1", taskType: "quote_draft" });
    const keyUser2 = makeKey({ userId: "user_2", taskType: "quote_draft" });
    const output = makeOutput({ text: "Personal draft" });

    await setCachedOutput(keyUser1, output, 3600);
    const result = await getCachedOutput(keyUser2);

    expect(result).toBeNull();
  });
});