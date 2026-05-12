import "server-only";

/**
 * Server-side usage accounting for the Requo pricing system.
 *
 * Usage is counted at the business level. Derives monthly counts from
 * existing inquiry/quote timestamps. Business creation quota is enforced
 * globally by `features/businesses/quota.ts`.
 */

import { and, count, eq, gte, isNull, lt, sql } from "drizzle-orm";

import { db } from "@/lib/db/client";
import {
  activityLogs,
  businesses,
  businessInquiryForms,
  businessMembers,
  inquiries,
  quotes,
} from "@/lib/db/schema";
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

function getCurrentDayBounds() {
  const now = new Date();
  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const end = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1),
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
        isNull(inquiries.deletedAt),
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
        isNull(quotes.deletedAt),
        gte(quotes.createdAt, start),
        lt(quotes.createdAt, end),
      ),
    );

  return Number(row?.value ?? 0);
}

async function getBusinessQuoteSendCountByMethod(
  businessId: string,
  {
    end,
    method,
    start,
  }: {
    start: Date;
    end: Date;
    method: "requo";
  },
): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(activityLogs)
    .where(
      and(
        eq(activityLogs.businessId, businessId),
        eq(activityLogs.type, "quote.sent"),
        gte(activityLogs.createdAt, start),
        lt(activityLogs.createdAt, end),
        sql`${activityLogs.metadata} ->> 'sendMethod' = ${method}`,
      ),
    );

  return Number(row?.value ?? 0);
}

export async function getDailyRequoQuoteSendCount(
  businessId: string,
): Promise<number> {
  return getBusinessQuoteSendCountByMethod(businessId, {
    ...getCurrentDayBounds(),
    method: "requo",
  });
}

export async function getMonthlyRequoQuoteSendCount(
  businessId: string,
): Promise<number> {
  return getBusinessQuoteSendCountByMethod(businessId, {
    ...getCurrentMonthBounds(),
    method: "requo",
  });
}

/**
 * Counts the number of businesses owned by a user.
 */
export async function getUserBusinessCount(
  ownerUserId: string,
): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(businesses)
    .where(
      and(
        eq(businesses.ownerUserId, ownerUserId),
        isNull(businesses.deletedAt),
      ),
    );

  return Number(row?.value ?? 0);
}

/**
 * Counts the number of members in a business.
 */
export async function getBusinessMemberCount(
  businessId: string,
): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(businessMembers)
    .where(eq(businessMembers.businessId, businessId));

  return Number(row?.value ?? 0);
}

/**
 * Counts the number of live (non-archived, public-enabled) inquiry forms
 * for a business.
 */
export async function getBusinessLiveFormsCount(
  businessId: string,
): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(businessInquiryForms)
    .where(
      and(
        eq(businessInquiryForms.businessId, businessId),
        eq(businessInquiryForms.publicInquiryEnabled, true),
        isNull(businessInquiryForms.archivedAt),
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

  let current: number;

  switch (key) {
    case "inquiriesPerMonth":
      current = await getMonthlyInquiryCount(businessId);
      break;
    case "quotesPerMonth":
      current = await getMonthlyQuoteCount(businessId);
      break;
    case "requoQuoteEmailsPerDay":
      current = await getDailyRequoQuoteSendCount(businessId);
      break;
    case "requoQuoteEmailsPerMonth":
      current = await getMonthlyRequoQuoteSendCount(businessId);
      break;
    case "businessesPerWorkspace":
      // This is now per-user, but we still count at the business level
      // The actual user-level check is in features/businesses/quota.ts
      current = 0;
      break;
    case "membersPerWorkspace":
      current = await getBusinessMemberCount(businessId);
      break;
    case "liveFormsPerWorkspace":
      current = await getBusinessLiveFormsCount(businessId);
      break;
    default:
      current = 0;
  }

  return {
    allowed: current < limit,
    current,
    limit,
  };
}
