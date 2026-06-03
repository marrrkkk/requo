import "server-only";

import { and, eq, gte, sql, sum } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { aiUsageEvents } from "@/lib/db/schema";
import type { AiTaskType } from "@/features/ai/task-registry";
import type { BusinessPlan } from "@/lib/plans/plans";
import { getUpgradePlan, planMeta } from "@/lib/plans/plans";
import { cacheLayer } from "@/lib/ai/cache-layer";

// ---------------------------------------------------------------------------
// Usage Limiter — enforces monthly weighted usage limits and per-request cooldown
//
// Dual-scope tracking:
// - User-level: sum of weighted usage across all businesses owned by the user
// - Business-level: sum of weighted usage for the specific business
// - Request rejected if either scope meets or exceeds the plan limit
//
// Cooldown:
// - 3-second minimum between consecutive requests (same user + task type)
// - Cooldown tracked via Cache Layer (Redis with in-memory fallback)
// - Cooldown starts when a request is accepted for processing (not on cache hits)
// - Cooldown rejections do not deduct usage
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Plan limits
// ---------------------------------------------------------------------------

export const PLAN_LIMITS: Record<BusinessPlan, number> = {
  free: 100,
  pro: 500,
  business: 2000,
};

// ---------------------------------------------------------------------------
// Task weights
// ---------------------------------------------------------------------------

export const TASK_WEIGHTS: Record<AiTaskType, number> = {
  inquiry_summary: 1,
  followup_message: 1,
  form_suggestion: 1,
  business_memory_summary: 1,
  quote_improvement: 2,
  quote_draft: 3,
  intent_classification: 1,
  assistant_message: 1,
  assistant_tool_call: 1,
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

export function getUserUsageCacheKey(userId: string): string {
  return `ai_usage:user:${userId}:${getCurrentMonthKey()}`;
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
 * 2. Monthly weighted usage quota (user-level and business-level)
 *
 * Uses a cache-first strategy:
 * - Reads cached usage counts from Cache_Layer (Redis + in-memory)
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

  const { userUsage, businessUsage } = await getCachedOrDbUsage(
    userId,
    businessId,
  );

  if (userUsage >= limit || businessUsage >= limit) {
    return buildQuotaExceededResult(plan);
  }

  return { allowed: true };
}

/**
 * Retrieves user-level and business-level monthly usage, using cache-first
 * strategy with DB fallback.
 *
 * On cache hit: returns cached values immediately.
 * On cache miss: executes DB SUM aggregate and stores results with 60s TTL.
 * On complete cache unavailability: falls through to DB aggregate directly.
 */
async function getCachedOrDbUsage(
  userId: string,
  businessId: string,
): Promise<{ userUsage: number; businessUsage: number }> {
  const userCacheKey = getUserUsageCacheKey(userId);
  const businessCacheKey = getBusinessUsageCacheKey(businessId);

  // Try cache-first reads for both keys
  let cachedUserUsage: number | null = null;
  let cachedBusinessUsage: number | null = null;

  try {
    [cachedUserUsage, cachedBusinessUsage] = await Promise.all([
      cacheLayer.get<number>(userCacheKey),
      cacheLayer.get<number>(businessCacheKey),
    ]);
  } catch {
    // Complete cache unavailability — fall through to DB
    console.warn(
      "[usage-limiter] Cache read failed entirely, falling through to DB aggregate",
    );
  }

  // If both cache hits, return cached values
  if (cachedUserUsage !== null && cachedBusinessUsage !== null) {
    return { userUsage: cachedUserUsage, businessUsage: cachedBusinessUsage };
  }

  // At least one cache miss — query DB for the missing values
  const monthStart = getStartOfCurrentMonthUTC();

  const [usageRow] = await db
    .select({
      userTotal: sql<string>`coalesce(sum(case when ${aiUsageEvents.userId} = ${userId} then ${aiUsageEvents.weight} else 0 end), 0)`,
      businessTotal: sql<string>`coalesce(sum(case when ${aiUsageEvents.businessId} = ${businessId} then ${aiUsageEvents.weight} else 0 end), 0)`,
    })
    .from(aiUsageEvents)
    .where(
      and(
        sql`(${aiUsageEvents.userId} = ${userId} or ${aiUsageEvents.businessId} = ${businessId})`,
        gte(aiUsageEvents.createdAt, monthStart),
      ),
    );

  const userUsage = Number(usageRow?.userTotal ?? 0);
  const businessUsage = Number(usageRow?.businessTotal ?? 0);

  // Cache the values we fetched from DB (non-blocking, ignore failures)
  try {
    const cacheWrites: Promise<void>[] = [];
    if (cachedUserUsage === null) {
      cacheWrites.push(
        cacheLayer.set<number>(userCacheKey, userUsage, USAGE_CACHE_TTL_SECONDS),
      );
    }
    if (cachedBusinessUsage === null) {
      cacheWrites.push(
        cacheLayer.set<number>(
          businessCacheKey,
          businessUsage,
          USAGE_CACHE_TTL_SECONDS,
        ),
      );
    }
    await Promise.all(cacheWrites);
  } catch {
    // Cache write failure is non-critical — next request will re-query DB
    console.warn(
      "[usage-limiter] Failed to cache usage values after DB fetch",
    );
  }

  return { userUsage, businessUsage };
}

/**
 * Records a usage event in the database. Call this after a successful AI
 * invocation (not on cache hits or cooldown rejections).
 *
 * After the DB insert, atomically increments both the user-level and
 * business-level cached counters by the invocation weight. On increment
 * failure: deletes the cache key and logs a warning without interrupting
 * the caller.
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

  // Atomically increment cached counters (non-blocking, never interrupts caller)
  const userCacheKey = getUserUsageCacheKey(userId);
  const businessCacheKey = getBusinessUsageCacheKey(businessId);

  await Promise.all([
    safeIncrementCache(userCacheKey, weight),
    safeIncrementCache(businessCacheKey, weight),
  ]);
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
 * Returns the current month's usage for a user (across all businesses)
 * and the plan limit. Used for displaying credit status in the UI.
 */
export async function getMonthlyUsageSummary(
  userId: string,
  plan: BusinessPlan,
): Promise<{ used: number; limit: number }> {
  const monthStart = getStartOfCurrentMonthUTC();
  const limit = PLAN_LIMITS[plan];

  const [row] = await db
    .select({ total: sum(aiUsageEvents.weight) })
    .from(aiUsageEvents)
    .where(
      and(
        eq(aiUsageEvents.userId, userId),
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
  const currentLabel = planMeta[plan].label;

  const upgradeMessage = upgradePlan
    ? ` Upgrade to ${planMeta[upgradePlan].label} for more AI generations.`
    : "";

  return {
    allowed: false,
    reason: "quota_exceeded",
    message: `Monthly AI usage limit reached for the ${currentLabel} plan.${upgradeMessage}`,
  };
}
