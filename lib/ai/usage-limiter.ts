import "server-only";

import { and, eq, gte, sum } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { aiUsageEvents } from "@/lib/db/schema";
import type { AiTaskType } from "@/features/ai/task-registry";
import type { BusinessPlan } from "@/lib/plans/plans";
import { getUpgradePlan, planMeta } from "@/lib/plans/plans";

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
// Cooldown tracking (in-memory)
// ---------------------------------------------------------------------------

const COOLDOWN_SECONDS = 3;

/**
 * In-memory cooldown map: `userId:taskType` → last accepted timestamp (ms).
 * Acceptable for short-lived cooldowns on single-server / serverless deployments.
 */
const cooldownMap = new Map<string, number>();

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

function getCooldownKey(userId: string, taskType: AiTaskType): string {
  return `${userId}:${taskType}`;
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

  // --- Cooldown check (fast, no DB) ---
  const cooldownKey = getCooldownKey(userId, taskType);
  const lastAccepted = cooldownMap.get(cooldownKey);

  if (lastAccepted !== undefined) {
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

  // --- Quota check (DB) ---
  const monthStart = getStartOfCurrentMonthUTC();
  const limit = PLAN_LIMITS[plan];

  // Query user-level usage (across all businesses)
  const [userUsageRow] = await db
    .select({ total: sum(aiUsageEvents.weight) })
    .from(aiUsageEvents)
    .where(
      and(
        eq(aiUsageEvents.userId, userId),
        gte(aiUsageEvents.createdAt, monthStart),
      ),
    );

  const userUsage = Number(userUsageRow?.total ?? 0);

  if (userUsage >= limit) {
    return buildQuotaExceededResult(plan);
  }

  // Query business-level usage
  const [businessUsageRow] = await db
    .select({ total: sum(aiUsageEvents.weight) })
    .from(aiUsageEvents)
    .where(
      and(
        eq(aiUsageEvents.businessId, businessId),
        gte(aiUsageEvents.createdAt, monthStart),
      ),
    );

  const businessUsage = Number(businessUsageRow?.total ?? 0);

  if (businessUsage >= limit) {
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
export function startCooldown(userId: string, taskType: AiTaskType): void {
  const key = getCooldownKey(userId, taskType);
  cooldownMap.set(key, Date.now());
}

/**
 * Resets the cooldown map. Primarily useful for testing.
 */
export function resetCooldowns(): void {
  cooldownMap.clear();
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
