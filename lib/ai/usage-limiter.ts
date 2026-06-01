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

  // --- Quota check (single batched DB query) ---
  const monthStart = getStartOfCurrentMonthUTC();
  const limit = PLAN_LIMITS[plan];

  // Retrieve both user-level and business-level monthly usage in one query
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

  if (userUsage >= limit || businessUsage >= limit) {
    return buildQuotaExceededResult(plan);
  }

  return { allowed: true };
}

/**
 * Records a usage event in the database. Call this after a successful AI
 * invocation (not on cache hits or cooldown rejections).
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
