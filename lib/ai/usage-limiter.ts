import "server-only";

import { and, eq, gte, sum } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { aiUsageEvents } from "@/lib/db/schema";
import type { AiTaskType } from "./types";
import type { BusinessPlan } from "@/lib/plans/plans";
import { getUpgradePlan, planMeta } from "@/lib/plans/plans";
import { getUsageLimit } from "@/lib/plans/usage-limits";
import { cacheLayer } from "@/lib/ai/cache-layer";

// ---------------------------------------------------------------------------
// Usage Limiter — enforces monthly weighted usage limits and per-request cooldown
//
// Business-scoped tracking:
// - Monthly weighted usage is summed per business (`aiUsageEvents.businessId`)
// - Subscriptions are business-scoped, so each subscribed business receives
//   its own full allowance; an owner's other businesses never consume it
// - Requests are rejected only when the business's own usage meets the limit
//
// Cooldown:
// - 3-second minimum between consecutive requests (same user + task type)
// - Cooldown tracked via Cache Layer (Redis with in-memory fallback)
// - Cooldown starts when a request is accepted for processing (not on cache hits)
// - Cooldown rejections do not deduct usage
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Plan limits
//
// The monthly AI allowance is defined centrally in `lib/plans/usage-limits.ts`
// (`aiWeightedCreditsPerMonth`). This compatibility constant is derived from
// that single source of truth.
// ---------------------------------------------------------------------------

export const PLAN_LIMITS: Record<BusinessPlan, number> = {
  free: getUsageLimit("free", "aiWeightedCreditsPerMonth") ?? 30,
  pro: getUsageLimit("pro", "aiWeightedCreditsPerMonth") ?? 150,
  business: getUsageLimit("business", "aiWeightedCreditsPerMonth") ?? 500,
};

// ---------------------------------------------------------------------------
// Task weights
// ---------------------------------------------------------------------------

export const TASK_WEIGHTS: Record<AiTaskType, number> = {
  quote_improvement: 2,
  quote_draft: 3,
};

// ---------------------------------------------------------------------------
// Cooldown tracking (via Cache Layer)
// ---------------------------------------------------------------------------

const COOLDOWN_SECONDS = 3;
const COOLDOWN_KEY_PREFIX = "cool:";

function getCooldownKey(userId: string, taskType: AiTaskType): string {
  return `${COOLDOWN_KEY_PREFIX}${userId}:${taskType}`;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type UsageLimitCheck = {
  userId: string;
  businessId: string;
  taskType: AiTaskType;
  plan: BusinessPlan;
};

export type UsageLimitResult =
  | { allowed: true }
  | { allowed: false; reason: "quota_exceeded" | "cooldown"; message: string };

// ---------------------------------------------------------------------------
// Cache key helpers
// ---------------------------------------------------------------------------

const USAGE_CACHE_TTL_SECONDS = 60;

function getCurrentMonthKey(): string {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export function getBusinessUsageCacheKey(businessId: string): string {
  return `ai_usage:business:${businessId}:${getCurrentMonthKey()}`;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getStartOfCurrentMonthUTC(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

// ---------------------------------------------------------------------------
// Public functions
// ---------------------------------------------------------------------------

/**
 * Checks whether an AI request is allowed based on:
 * 1. Cooldown (3-second minimum between same user + task type)
 * 2. Monthly weighted usage quota (business-level)
 *
 * Uses a cache-first strategy:
 * - Reads the cached business usage count from Cache Layer (Redis + in-memory)
 * - On cache miss: falls through to DB SUM aggregate and caches the result
 * - On complete cache unavailability: falls through to DB aggregate
 *
 * Returns `{ allowed: true }` or `{ allowed: false, reason, message }`.
 */
export async function checkUsageLimit(
  input: UsageLimitCheck,
): Promise<UsageLimitResult> {
  const { userId, businessId, taskType, plan } = input;

  // --- Cooldown check (via Cache Layer) ---
  const cooldownKey = getCooldownKey(userId, taskType);
  const lastAccepted = await cacheLayer.get<number>(cooldownKey);

  if (lastAccepted !== null) {
    const elapsedMs = Date.now() - lastAccepted;
    const cooldownMs = COOLDOWN_SECONDS * 1000;

    if (elapsedMs < cooldownMs) {
      const remainingSeconds = Math.ceil((cooldownMs - elapsedMs) / 1000);
      return {
        allowed: false,
        reason: "cooldown",
        message: `Please wait ${remainingSeconds} second${remainingSeconds === 1 ? "" : "s"} before making another ${taskType} request.`,
      };
    }
  }

  // --- Quota check (cache-first with DB fallback) ---
  const limit = PLAN_LIMITS[plan];
  const businessUsage = await getCachedOrDbBusinessUsage(businessId);

  if (businessUsage >= limit) {
    return buildQuotaExceededResult(plan);
  }

  return { allowed: true };
}

/**
 * Retrieves business-level monthly usage, using cache-first strategy with
 * DB fallback.
 *
 * On cache hit: returns the cached value immediately.
 * On cache miss: executes DB SUM aggregate and stores the result with 60s TTL.
 * On complete cache unavailability: falls through to DB aggregate directly.
 */
async function getCachedOrDbBusinessUsage(
  businessId: string,
): Promise<number> {
  const businessCacheKey = getBusinessUsageCacheKey(businessId);

  // Try a cache-first read
  let cachedBusinessUsage: number | null = null;

  try {
    cachedBusinessUsage = await cacheLayer.get<number>(businessCacheKey);
  } catch {
    // Complete cache unavailability — fall through to DB
    console.warn(
      "[usage-limiter] Cache read failed entirely, falling through to DB aggregate",
    );
  }

  if (cachedBusinessUsage !== null) {
    return cachedBusinessUsage;
  }

  // Cache miss — query DB for the missing value
  const monthStart = getStartOfCurrentMonthUTC();

  const [usageRow] = await db
    .select({ businessTotal: sum(aiUsageEvents.weight) })
    .from(aiUsageEvents)
    .where(
      and(
        eq(aiUsageEvents.businessId, businessId),
        gte(aiUsageEvents.createdAt, monthStart),
      ),
    );

  const businessUsage = Number(usageRow?.businessTotal ?? 0);

  // Cache the value we fetched from DB (non-blocking, ignore failures)
  try {
    await cacheLayer.set<number>(
      businessCacheKey,
      businessUsage,
      USAGE_CACHE_TTL_SECONDS,
    );
  } catch {
    // Cache write failure is non-critical — next request will re-query DB
    console.warn(
      "[usage-limiter] Failed to cache usage value after DB fetch",
    );
  }

  return businessUsage;
}

/**
 * Records a usage event in the database. Call this after a successful AI
 * invocation (not on cache hits or cooldown rejections).
 *
 * After the DB insert, atomically increments the business-level cached
 * counter by the invocation weight. On increment failure: deletes the cache
 * key and logs a warning without interrupting the caller.
 */
export async function recordUsage(
  userId: string,
  businessId: string,
  taskType: AiTaskType,
  weight: number,
): Promise<void> {
  const id = `aue_${crypto.randomUUID().replace(/-/g, "")}`;

  await db.insert(aiUsageEvents).values({
    id,
    userId,
    businessId,
    taskType,
    weight,
  });

  // Atomically increment the cached counter (non-blocking, never interrupts caller)
  const businessCacheKey = getBusinessUsageCacheKey(businessId);

  await safeIncrementCache(businessCacheKey, weight);
}

/**
 * Starts the cooldown timer for a user + task type combination.
 * Call this when a request is accepted for processing (not on cache hits).
 */
export async function startCooldown(userId: string, taskType: AiTaskType): Promise<void> {
  const key = getCooldownKey(userId, taskType);
  await cacheLayer.set<number>(key, Date.now(), COOLDOWN_SECONDS);
}

/**
 * Resets the cooldown for a specific user + task type. Primarily useful for testing.
 */
export async function resetCooldown(userId: string, taskType: AiTaskType): Promise<void> {
  const key = getCooldownKey(userId, taskType);
  await cacheLayer.delete(key);
}

/**
 * Returns the current month's usage for a business and the plan limit.
 * Used for displaying credit status in the UI.
 */
export async function getMonthlyUsageSummary(
  businessId: string,
  plan: BusinessPlan,
): Promise<{ used: number; limit: number }> {
  const monthStart = getStartOfCurrentMonthUTC();
  const limit = PLAN_LIMITS[plan];

  const [row] = await db
    .select({ total: sum(aiUsageEvents.weight) })
    .from(aiUsageEvents)
    .where(
      and(
        eq(aiUsageEvents.businessId, businessId),
        gte(aiUsageEvents.createdAt, monthStart),
      ),
    );

  return { used: Number(row?.total ?? 0), limit };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Atomically increments a cached usage counter by the given weight.
 * On failure: deletes the cache key and logs a warning.
 * Never throws — failures must not interrupt the caller.
 */
async function safeIncrementCache(
  cacheKey: string,
  weight: number,
): Promise<void> {
  try {
    await cacheLayer.incrementBy(cacheKey, weight, USAGE_CACHE_TTL_SECONDS);
  } catch (error) {
    // On increment failure: delete the cache key so the next check
    // falls through to the DB aggregate for a fresh value.
    console.warn(
      "[usage-limiter] Cache increment failed, invalidating key:",
      cacheKey,
      error instanceof Error ? error.message : error,
    );
    try {
      await cacheLayer.delete(cacheKey);
    } catch {
      // Delete failure is non-critical — key will expire via TTL
      console.warn(
        "[usage-limiter] Failed to delete cache key after increment failure:",
        cacheKey,
      );
    }
  }
}

function buildQuotaExceededResult(plan: BusinessPlan): UsageLimitResult {
  const upgradePlan = getUpgradePlan(plan);
  const upgradeMessage = upgradePlan
    ? " Upgrade for more drafts."
    : "";

  return {
    allowed: false,
    reason: "quota_exceeded",
    message: `You've used this month's AI drafting allowance.${upgradeMessage}`,
  };
}