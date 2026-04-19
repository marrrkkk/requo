import "server-only";

/**
 * Server-side usage accounting for the Requo pricing system.
 *
 * Usage is counted at the workspace level — aggregated across all businesses
 * in the workspace. Derives monthly counts from existing inquiry/quote
 * timestamps. No dedicated usage table is needed.
 */

import { and, count, eq, gte, inArray, isNull, lt, sql } from "drizzle-orm";

import { db } from "@/lib/db/client";
import {
  activityLogs,
  businesses,
  businessInquiryForms,
  inquiries,
  quotes,
  workspaceMembers,
  workspaces,
} from "@/lib/db/schema";
import type { WorkspacePlan } from "@/lib/plans/plans";
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
 * Returns all business IDs belonging to a workspace.
 */
async function getWorkspaceBusinessIds(
  workspaceId: string,
): Promise<string[]> {
  const rows = await db
    .select({ id: businesses.id })
    .from(businesses)
    .innerJoin(workspaces, eq(businesses.workspaceId, workspaces.id))
    .where(
      and(
        eq(businesses.workspaceId, workspaceId),
        isNull(workspaces.deletedAt),
        isNull(businesses.deletedAt),
      ),
    );

  return rows.map((r) => r.id);
}

/**
 * Counts inquiries created in the current UTC month across all businesses
 * in a workspace.
 */
export async function getMonthlyInquiryCount(
  workspaceId: string,
): Promise<number> {
  const { start, end } = getCurrentMonthBounds();
  const bizIds = await getWorkspaceBusinessIds(workspaceId);

  if (bizIds.length === 0) {
    return 0;
  }

  const [row] = await db
    .select({ value: count() })
    .from(inquiries)
    .where(
      and(
        inArray(inquiries.businessId, bizIds),
        isNull(inquiries.deletedAt),
        gte(inquiries.createdAt, start),
        lt(inquiries.createdAt, end),
      ),
    );

  return Number(row?.value ?? 0);
}

/**
 * Counts quotes created in the current UTC month across all businesses
 * in a workspace.
 */
export async function getMonthlyQuoteCount(
  workspaceId: string,
): Promise<number> {
  const { start, end } = getCurrentMonthBounds();
  const bizIds = await getWorkspaceBusinessIds(workspaceId);

  if (bizIds.length === 0) {
    return 0;
  }

  const [row] = await db
    .select({ value: count() })
    .from(quotes)
    .where(
      and(
        inArray(quotes.businessId, bizIds),
        isNull(quotes.deletedAt),
        gte(quotes.createdAt, start),
        lt(quotes.createdAt, end),
      ),
    );

  return Number(row?.value ?? 0);
}

async function getWorkspaceQuoteSendCountByMethod(
  workspaceId: string,
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
  const bizIds = await getWorkspaceBusinessIds(workspaceId);

  if (bizIds.length === 0) {
    return 0;
  }

  const [row] = await db
    .select({ value: count() })
    .from(activityLogs)
    .where(
      and(
        inArray(activityLogs.businessId, bizIds),
        eq(activityLogs.type, "quote.sent"),
        gte(activityLogs.createdAt, start),
        lt(activityLogs.createdAt, end),
        sql`${activityLogs.metadata} ->> 'sendMethod' = ${method}`,
      ),
    );

  return Number(row?.value ?? 0);
}

export async function getDailyRequoQuoteSendCount(
  workspaceId: string,
): Promise<number> {
  return getWorkspaceQuoteSendCountByMethod(workspaceId, {
    ...getCurrentDayBounds(),
    method: "requo",
  });
}

export async function getMonthlyRequoQuoteSendCount(
  workspaceId: string,
): Promise<number> {
  return getWorkspaceQuoteSendCountByMethod(workspaceId, {
    ...getCurrentMonthBounds(),
    method: "requo",
  });
}

/**
 * Counts the number of businesses in a workspace.
 */
export async function getWorkspaceBusinessCount(
  workspaceId: string,
): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(businesses)
    .where(
      and(
        eq(businesses.workspaceId, workspaceId),
        isNull(businesses.deletedAt),
      ),
    );

  return Number(row?.value ?? 0);
}

/**
 * Counts the number of members in a workspace.
 */
export async function getWorkspaceMemberCount(
  workspaceId: string,
): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(workspaceMembers)
    .where(eq(workspaceMembers.workspaceId, workspaceId));

  return Number(row?.value ?? 0);
}

/**
 * Counts the number of live (non-archived, public-enabled) inquiry forms
 * across all businesses in a workspace.
 */
export async function getWorkspaceLiveFormsCount(
  workspaceId: string,
): Promise<number> {
  const bizIds = await getWorkspaceBusinessIds(workspaceId);

  if (bizIds.length === 0) {
    return 0;
  }

  const [row] = await db
    .select({ value: count() })
    .from(businessInquiryForms)
    .where(
      and(
        inArray(businessInquiryForms.businessId, bizIds),
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
 * Checks whether a workspace is allowed to create another item of the given
 * type. Returns current usage, limit, and whether the action is allowed.
 */
export async function checkUsageAllowance(
  workspaceId: string,
  plan: WorkspacePlan,
  key: UsageLimitKey,
): Promise<UsageAllowance> {
  const limit = getUsageLimit(plan, key);

  if (limit === null) {
    return { allowed: true, current: 0, limit: null };
  }

  let current: number;

  switch (key) {
    case "inquiriesPerMonth":
      current = await getMonthlyInquiryCount(workspaceId);
      break;
    case "quotesPerMonth":
      current = await getMonthlyQuoteCount(workspaceId);
      break;
    case "requoQuoteEmailsPerDay":
      current = await getDailyRequoQuoteSendCount(workspaceId);
      break;
    case "requoQuoteEmailsPerMonth":
      current = await getMonthlyRequoQuoteSendCount(workspaceId);
      break;
    case "businessesPerWorkspace":
      current = await getWorkspaceBusinessCount(workspaceId);
      break;
    case "membersPerWorkspace":
      current = await getWorkspaceMemberCount(workspaceId);
      break;
    case "liveFormsPerWorkspace":
      current = await getWorkspaceLiveFormsCount(workspaceId);
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
