import "server-only";

/**
 * Server-side usage accounting for the Requo pricing system.
 *
 * Derives monthly counts from existing inquiry/quote timestamps.
 * No dedicated usage table is needed.
 */

import { and, count, eq, gte, lt } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { inquiries, quotes } from "@/lib/db/schema";
import type { BusinessPlan } from "@/lib/plans/plans";
import {
  getUsageLimit,
  type UsageLimitKey,
} from "@/lib/plans/usage-limits";

function getCurrentMonthBounds() {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1),
  );

  return { start, end };
}

/**
 * Counts inquiries created in the current UTC month for a business.
 */
export async function getMonthlyInquiryCount(
  businessId: string,
): Promise<number> {
  const { start, end } = getCurrentMonthBounds();

  const [row] = await db
    .select({ value: count() })
    .from(inquiries)
    .where(
      and(
        eq(inquiries.businessId, businessId),
        gte(inquiries.createdAt, start),
        lt(inquiries.createdAt, end),
      ),
    );

  return Number(row?.value ?? 0);
}

/**
 * Counts quotes created in the current UTC month for a business.
 */
export async function getMonthlyQuoteCount(
  businessId: string,
): Promise<number> {
  const { start, end } = getCurrentMonthBounds();

  const [row] = await db
    .select({ value: count() })
    .from(quotes)
    .where(
      and(
        eq(quotes.businessId, businessId),
        gte(quotes.createdAt, start),
        lt(quotes.createdAt, end),
      ),
    );

  return Number(row?.value ?? 0);
}

export type UsageAllowance = {
  allowed: boolean;
  current: number;
  limit: number | null;
};

/**
 * Checks whether a business is allowed to create another item of the given
 * type. Returns current usage, limit, and whether the action is allowed.
 */
export async function checkUsageAllowance(
  businessId: string,
  plan: BusinessPlan,
  key: UsageLimitKey,
): Promise<UsageAllowance> {
  const limit = getUsageLimit(plan, key);

  if (limit === null) {
    return { allowed: true, current: 0, limit: null };
  }

  const current =
    key === "inquiriesPerMonth"
      ? await getMonthlyInquiryCount(businessId)
      : await getMonthlyQuoteCount(businessId);

  return {
    allowed: current < limit,
    current,
    limit,
  };
}
