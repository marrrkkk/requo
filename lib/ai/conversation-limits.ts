/**
 * Conversation volume limits — separate metering buckets per surface.
 *
 * The Assistant (owner-facing) is limited by user messages per business per
 * day; the Agent (customer-facing) is limited by sessions per business per
 * month, sessions per business per day (abuse ceiling), and user messages per
 * session. Customer traffic never consumes the owner's allowance and vice
 * versa. The shared weighted monthly credit pool (`checkUsageLimit`) remains
 * as a hard token-spend ceiling behind both buckets.
 *
 * Plan allowances live in `lib/plans/usage-limits.ts`:
 *   assistantMessagesPerDay: free 25 / pro 250 / business 1000
 *   agentSessionsPerMonth:   free 0 (not available) / pro 100 / business 500
 */

import "server-only";

import { and, eq, gte, sql } from "drizzle-orm";

import { db } from "@/lib/db/client";
import {
  aiAgentMessages,
  aiAgentSessions,
  ownerAssistantMessages,
  ownerAssistantSessions,
} from "@/lib/db/schema";
import { getUsageLimit } from "@/lib/plans/usage-limits";
import type { BusinessPlan } from "@/lib/plans/plans";

/** Lifetime user-message cap per Agent session. */
export const AGENT_MESSAGES_PER_SESSION = 50;

/** Per-business daily session ceiling (abuse protection, distinct from plan allowance). */
const AGENT_SESSIONS_PER_BUSINESS_PER_DAY: Record<BusinessPlan, number> = {
  free: 0,
  pro: 10,
  business: 50,
};

export type ConversationLimitResult =
  | { allowed: true }
  | {
      allowed: false;
      reason: "daily_limit" | "monthly_limit" | "session_limit";
      message: string;
      requiredPlan: BusinessPlan | null;
    };

function startOfDayUtc(now = new Date()): Date {
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
}

function startOfMonthUtc(now = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

/**
 * Assistant bucket: user messages per business per day.
 * Available on every plan (including free) with plan-varying volume.
 */
export async function checkAssistantMessageLimit({
  businessId,
  plan,
}: {
  businessId: string;
  plan: BusinessPlan;
}): Promise<ConversationLimitResult> {
  const limit = getUsageLimit(plan, "assistantMessagesPerDay") ?? 25;
  const since = startOfDayUtc();

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(ownerAssistantMessages)
    .innerJoin(
      ownerAssistantSessions,
      eq(ownerAssistantMessages.sessionId, ownerAssistantSessions.id),
    )
    .where(
      and(
        eq(ownerAssistantSessions.businessId, businessId),
        eq(ownerAssistantMessages.role, "user"),
        gte(ownerAssistantMessages.createdAt, since),
      ),
    );

  if (Number(count) >= limit) {
    return {
      allowed: false,
      reason: "daily_limit",
      message: `You've reached your daily Assistant message limit (${limit}). It resets tomorrow.`,
      requiredPlan: plan === "free" ? "pro" : plan === "pro" ? "business" : null,
    };
  }

  return { allowed: true };
}

/**
 * Agent bucket: sessions per business per month (plan allowance) plus a
 * per-business daily ceiling (abuse protection).
 */
export async function checkAgentSessionLimit({
  businessId,
  plan,
}: {
  businessId: string;
  plan: BusinessPlan;
}): Promise<ConversationLimitResult> {
  const monthlyLimit = getUsageLimit(plan, "agentSessionsPerMonth") ?? 0;
  if (monthlyLimit <= 0) {
    return {
      allowed: false,
      reason: "monthly_limit",
      message: "Public chat is available on Pro and above.",
      requiredPlan: "pro",
    };
  }

  const monthStart = startOfMonthUtc();
  const [{ monthCount }] = await db
    .select({ monthCount: sql<number>`count(*)` })
    .from(aiAgentSessions)
    .where(
      and(
        eq(aiAgentSessions.businessId, businessId),
        gte(aiAgentSessions.createdAt, monthStart),
      ),
    );

  if (Number(monthCount) >= monthlyLimit) {
    return {
      allowed: false,
      reason: "monthly_limit",
      message: `This business has reached its monthly public-chat session limit (${monthlyLimit}).`,
      requiredPlan: plan === "pro" ? "business" : null,
    };
  }

  const dailyCeiling = AGENT_SESSIONS_PER_BUSINESS_PER_DAY[plan];
  const [{ dayCount }] = await db
    .select({ dayCount: sql<number>`count(*)` })
    .from(aiAgentSessions)
    .where(
      and(
        eq(aiAgentSessions.businessId, businessId),
        gte(aiAgentSessions.createdAt, startOfDayUtc()),
      ),
    );

  if (Number(dayCount) >= dailyCeiling) {
    return {
      allowed: false,
      reason: "daily_limit",
      message: "This business has reached its daily public-chat session ceiling. Please try again tomorrow.",
      requiredPlan: null,
    };
  }

  return { allowed: true };
}

/** Agent bucket: lifetime user messages per session. */
export async function checkAgentMessageLimit({
  sessionId,
}: {
  sessionId: string;
}): Promise<ConversationLimitResult> {
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(aiAgentMessages)
    .where(
      and(
        eq(aiAgentMessages.sessionId, sessionId),
        eq(aiAgentMessages.role, "user"),
      ),
    );

  if (Number(count) >= AGENT_MESSAGES_PER_SESSION) {
    return {
      allowed: false,
      reason: "session_limit",
      message: `This conversation has reached its message limit (${AGENT_MESSAGES_PER_SESSION}). Please start a new chat or use the inquiry form.`,
      requiredPlan: null,
    };
  }

  return { allowed: true };
}
