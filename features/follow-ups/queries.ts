import "server-only";

import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  ilike,
  isNull,
  lt,
  or,
  sql,
} from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";

import type {
  FollowUpListQueryFilters,
  FollowUpOverviewData,
  FollowUpView,
} from "@/features/follow-ups/types";
import {
  buildFollowUpSuggestedMessage,
  getDateInputValue,
  getFollowUpDueBucket,
  getTodayUtcDateString,
} from "@/features/follow-ups/utils";
import { getPublicQuoteUrl } from "@/features/quotes/utils";
import {
  getBusinessFollowUpListCacheTags,
  getBusinessInquiryDetailCacheTags,
  getBusinessQuoteDetailCacheTags,
  hotBusinessCacheLife,
} from "@/lib/cache/business-tags";
import { db } from "@/lib/db/client";
import {
  businesses,
  followUps,
  inquiries,
  quotes,
} from "@/lib/db/schema";
import { env } from "@/lib/env";

const followUpOverviewLimit = 4;

type FollowUpRow = {
  id: string;
  businessId: string;
  businessName: string;
  businessTimezone: string;
  inquiryId: string | null;
  quoteId: string | null;
  assignedToUserId: string | null;
  createdByUserId: string | null;
  title: string;
  reason: string;
  channel: FollowUpView["channel"];
  category: string;
  recurrence: string;
  recurrenceCount: number;
  recurrenceLimit: number | null;
  dueAt: Date;
  completedAt: Date | null;
  skippedAt: Date | null;
  status: FollowUpView["status"];
  createdAt: Date;
  updatedAt: Date;
  inquiryCustomerName: string | null;
  inquiryCustomerEmail: string | null;
  inquiryCustomerContactMethod: string | null;
  inquiryCustomerContactHandle: string | null;
  inquiryServiceCategory: string | null;
  quoteCustomerName: string | null;
  quoteCustomerEmail: string | null;
  quoteCustomerContactMethod: string | null;
  quoteCustomerContactHandle: string | null;
  quoteNumber: string | null;
  quoteTitle: string | null;
  quotePublicToken: string | null;
  quoteViewedAt: Date | null;
};

function getUtcDayStart(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

function getTomorrowUtcDateString(now = new Date()) {
  return new Date(now.getTime() + 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
}

function getQuotePublicUrl(publicToken: string | null) {
  if (!publicToken) {
    return null;
  }

  return new URL(getPublicQuoteUrl(publicToken), env.BETTER_AUTH_URL).toString();
}

function mapFollowUpRow(row: FollowUpRow): FollowUpView {
  const quotePublicUrl = getQuotePublicUrl(row.quotePublicToken);
  const isQuoteFollowUp = Boolean(row.quoteId);
  const customerName =
    row.quoteCustomerName ?? row.inquiryCustomerName ?? "Customer";
  const customerEmail = row.quoteCustomerEmail ?? row.inquiryCustomerEmail;
  const customerContactMethod =
    row.quoteCustomerContactMethod ?? row.inquiryCustomerContactMethod;
  const customerContactHandle =
    row.quoteCustomerContactHandle ?? row.inquiryCustomerContactHandle;

  return {
    id: row.id,
    businessId: row.businessId,
    inquiryId: row.inquiryId,
    quoteId: row.quoteId,
    assignedToUserId: row.assignedToUserId,
    createdByUserId: row.createdByUserId,
    title: row.title,
    reason: row.reason,
    category: (row.category === "post_win" ? "post_win" : "sales") as FollowUpView["category"],
    channel: row.channel,
    recurrence: (row.recurrence ?? "none") as FollowUpView["recurrence"],
    recurrenceCount: row.recurrenceCount ?? 0,
    recurrenceLimit: row.recurrenceLimit ?? null,
    dueAt: row.dueAt,
    completedAt: row.completedAt,
    skippedAt: row.skippedAt,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    dueBucket: getFollowUpDueBucket({
      status: row.status,
      dueAt: row.dueAt,
    }, undefined, row.businessTimezone),
    customerName,
    customerEmail,
    customerContactMethod,
    customerContactHandle,
    related: isQuoteFollowUp
      ? {
          kind: "quote",
          id: row.quoteId!,
          label: row.quoteNumber
            ? `Quote ${row.quoteNumber}`
            : row.quoteTitle
              ? `Quote: ${row.quoteTitle}`
              : "Quote",
        }
      : {
          kind: "inquiry",
          id: row.inquiryId!,
          label: row.inquiryServiceCategory
            ? `Inquiry: ${row.inquiryServiceCategory}`
            : "Inquiry",
        },
    quoteNumber: row.quoteNumber,
    quoteTitle: row.quoteTitle,
    quotePublicUrl,
    quoteViewedAt: row.quoteViewedAt,
    suggestedMessage: buildFollowUpSuggestedMessage({
      kind: isQuoteFollowUp ? "quote" : "inquiry",
      businessName: row.businessName,
      customerName,
      quoteUrl: quotePublicUrl,
      quoteViewedAt: row.quoteViewedAt,
    }),
  };
}

function getFollowUpSelection() {
  return {
    id: followUps.id,
    businessId: followUps.businessId,
    businessName: businesses.name,
    businessTimezone: businesses.timezone,
    inquiryId: followUps.inquiryId,
    quoteId: followUps.quoteId,
    assignedToUserId: followUps.assignedToUserId,
    createdByUserId: followUps.createdByUserId,
    title: followUps.title,
    reason: followUps.reason,
    category: followUps.category,
    channel: followUps.channel,
    recurrence: followUps.recurrence,
    recurrenceCount: followUps.recurrenceCount,
    recurrenceLimit: followUps.recurrenceLimit,
    dueAt: followUps.dueAt,
    completedAt: followUps.completedAt,
    skippedAt: followUps.skippedAt,
    status: followUps.status,
    createdAt: followUps.createdAt,
    updatedAt: followUps.updatedAt,
    inquiryCustomerName: inquiries.customerName,
    inquiryCustomerEmail: inquiries.customerEmail,
    inquiryCustomerContactMethod: inquiries.customerContactMethod,
    inquiryCustomerContactHandle: inquiries.customerContactHandle,
    inquiryServiceCategory: inquiries.serviceCategory,
    quoteCustomerName: quotes.customerName,
    quoteCustomerEmail: quotes.customerEmail,
    quoteCustomerContactMethod: quotes.customerContactMethod,
    quoteCustomerContactHandle: quotes.customerContactHandle,
    quoteNumber: quotes.quoteNumber,
    quoteTitle: quotes.title,
    quotePublicToken: quotes.publicToken,
    quoteViewedAt: quotes.publicViewedAt,
  };
}

function getFollowUpBaseQuery() {
  return db
    .select(getFollowUpSelection())
    .from(followUps)
    .innerJoin(businesses, eq(followUps.businessId, businesses.id))
    .leftJoin(inquiries, eq(followUps.inquiryId, inquiries.id))
    .leftJoin(quotes, eq(followUps.quoteId, quotes.id));
}

function getFollowUpListConditions({
  businessId,
  filters,
}: {
  businessId: string;
  filters: FollowUpListQueryFilters;
}) {
  const today = getTodayUtcDateString();
  const tomorrow = getTomorrowUtcDateString();
  const todayStart = getUtcDayStart(today);
  const tomorrowStart = getUtcDayStart(tomorrow);
  const conditions = [eq(followUps.businessId, businessId), isNull(followUps.deletedAt)];

  if (filters.status !== "all") {
    conditions.push(eq(followUps.status, filters.status));
  }

  if (filters.due !== "all") {
    conditions.push(eq(followUps.status, "pending"));
  }

  if (filters.due === "overdue") {
    conditions.push(lt(followUps.dueAt, todayStart));
  }

  if (filters.due === "today") {
    conditions.push(gte(followUps.dueAt, todayStart));
    conditions.push(lt(followUps.dueAt, tomorrowStart));
  }

  if (filters.due === "upcoming") {
    conditions.push(gte(followUps.dueAt, tomorrowStart));
  }

  if (filters.q) {
    const pattern = `%${filters.q}%`;

    conditions.push(
      or(
        ilike(followUps.title, pattern),
        ilike(followUps.reason, pattern),
        ilike(inquiries.customerName, pattern),
        ilike(inquiries.customerEmail, pattern),
        ilike(inquiries.serviceCategory, pattern),
        ilike(quotes.customerName, pattern),
        ilike(quotes.customerEmail, pattern),
        ilike(quotes.quoteNumber, pattern),
        ilike(quotes.title, pattern),
      )!,
    );
  }

  return conditions;
}

function getFollowUpOrderBy(sort: FollowUpListQueryFilters["sort"]) {
  const pendingFirst = sql`case when ${followUps.status} = 'pending' then 0 else 1 end`;

  switch (sort) {
    case "due_desc":
      return [pendingFirst, desc(followUps.dueAt), desc(followUps.createdAt)];
    case "newest":
      return [desc(followUps.createdAt)];
    case "due_asc":
    default:
      return [pendingFirst, asc(followUps.dueAt), desc(followUps.createdAt)];
  }
}

export async function getFollowUpsForInquiry({
  businessId,
  inquiryId,
}: {
  businessId: string;
  inquiryId: string;
}): Promise<FollowUpView[]> {
  "use cache";

  cacheLife(hotBusinessCacheLife);
  cacheTag(
    ...getBusinessFollowUpListCacheTags(businessId),
    ...getBusinessInquiryDetailCacheTags(businessId, inquiryId),
  );

  const rows = await getFollowUpBaseQuery()
    .where(
      and(eq(followUps.businessId, businessId), eq(followUps.inquiryId, inquiryId), isNull(followUps.deletedAt)),
    )
    .orderBy(
      sql`case when ${followUps.status} = 'pending' then 0 else 1 end`,
      asc(followUps.dueAt),
      desc(followUps.createdAt),
    );

  return rows.map(mapFollowUpRow);
}

export async function getFollowUpsForQuote({
  businessId,
  quoteId,
}: {
  businessId: string;
  quoteId: string;
}): Promise<FollowUpView[]> {
  "use cache";

  cacheLife(hotBusinessCacheLife);
  cacheTag(
    ...getBusinessFollowUpListCacheTags(businessId),
    ...getBusinessQuoteDetailCacheTags(businessId, quoteId),
  );

  const rows = await getFollowUpBaseQuery()
    .where(
      and(eq(followUps.businessId, businessId), eq(followUps.quoteId, quoteId), isNull(followUps.deletedAt)),
    )
    .orderBy(
      sql`case when ${followUps.status} = 'pending' then 0 else 1 end`,
      asc(followUps.dueAt),
      desc(followUps.createdAt),
    );

  return rows.map(mapFollowUpRow);
}

export async function getFollowUpOverviewForBusiness(
  businessId: string,
): Promise<FollowUpOverviewData> {
  "use cache";

  cacheLife(hotBusinessCacheLife);
  cacheTag(...getBusinessFollowUpListCacheTags(businessId));

  return queryFollowUpOverviewForBusiness(businessId);
}

export async function getFollowUpOverviewForBusinessUncached(
  businessId: string,
): Promise<FollowUpOverviewData> {
  return queryFollowUpOverviewForBusiness(businessId);
}

async function queryFollowUpOverviewForBusiness(
  businessId: string,
): Promise<FollowUpOverviewData> {
  const today = getTodayUtcDateString();
  const tomorrow = getTomorrowUtcDateString();
  const todayStart = getUtcDayStart(today);
  const tomorrowStart = getUtcDayStart(tomorrow);
  const totalCount = sql<number>`count(*) over ()`;

  const [overdueRows, todayRows, upcomingRows] = await Promise.all([
    db
      .select({
        ...getFollowUpSelection(),
        totalCount,
      })
      .from(followUps)
      .innerJoin(businesses, eq(followUps.businessId, businesses.id))
      .leftJoin(inquiries, eq(followUps.inquiryId, inquiries.id))
      .leftJoin(quotes, eq(followUps.quoteId, quotes.id))
      .where(
        and(
          eq(followUps.businessId, businessId),
          eq(followUps.status, "pending"),
          isNull(followUps.deletedAt),
          lt(followUps.dueAt, todayStart),
        ),
      )
      .orderBy(asc(followUps.dueAt), desc(followUps.createdAt))
      .limit(followUpOverviewLimit),
    db
      .select({
        ...getFollowUpSelection(),
        totalCount,
      })
      .from(followUps)
      .innerJoin(businesses, eq(followUps.businessId, businesses.id))
      .leftJoin(inquiries, eq(followUps.inquiryId, inquiries.id))
      .leftJoin(quotes, eq(followUps.quoteId, quotes.id))
      .where(
        and(
          eq(followUps.businessId, businessId),
          eq(followUps.status, "pending"),
          isNull(followUps.deletedAt),
          gte(followUps.dueAt, todayStart),
          lt(followUps.dueAt, tomorrowStart),
        ),
      )
      .orderBy(asc(followUps.dueAt), desc(followUps.createdAt))
      .limit(followUpOverviewLimit),
    db
      .select({
        ...getFollowUpSelection(),
        totalCount,
      })
      .from(followUps)
      .innerJoin(businesses, eq(followUps.businessId, businesses.id))
      .leftJoin(inquiries, eq(followUps.inquiryId, inquiries.id))
      .leftJoin(quotes, eq(followUps.quoteId, quotes.id))
      .where(
        and(
          eq(followUps.businessId, businessId),
          eq(followUps.status, "pending"),
          isNull(followUps.deletedAt),
          gte(followUps.dueAt, tomorrowStart),
        ),
      )
      .orderBy(asc(followUps.dueAt), desc(followUps.createdAt))
      .limit(followUpOverviewLimit),
  ]);

  return {
    overdue: overdueRows.map(mapFollowUpRow),
    dueToday: todayRows.map(mapFollowUpRow),
    upcoming: upcomingRows.map(mapFollowUpRow),
    counts: {
      overdue: Number(overdueRows[0]?.totalCount ?? 0),
      dueToday: Number(todayRows[0]?.totalCount ?? 0),
      upcoming: Number(upcomingRows[0]?.totalCount ?? 0),
    },
  };
}

export async function getFollowUpListCountForBusiness({
  businessId,
  filters,
}: {
  businessId: string;
  filters: FollowUpListQueryFilters;
}): Promise<number> {
  "use cache";

  cacheLife(hotBusinessCacheLife);
  cacheTag(...getBusinessFollowUpListCacheTags(businessId));

  const conditions = getFollowUpListConditions({ businessId, filters });
  const rows = await db
    .select({ count: count() })
    .from(followUps)
    .leftJoin(inquiries, eq(followUps.inquiryId, inquiries.id))
    .leftJoin(quotes, eq(followUps.quoteId, quotes.id))
    .where(and(...conditions));

  return Number(rows[0]?.count ?? 0);
}

export async function getFollowUpListPageForBusiness({
  businessId,
  filters,
  page,
  pageSize,
}: {
  businessId: string;
  filters: FollowUpListQueryFilters;
  page: number;
  pageSize: number;
}): Promise<FollowUpView[]> {
  "use cache";

  cacheLife(hotBusinessCacheLife);
  cacheTag(...getBusinessFollowUpListCacheTags(businessId));

  const conditions = getFollowUpListConditions({ businessId, filters });
  const offset = Math.max(0, (page - 1) * pageSize);

  const rows = await getFollowUpBaseQuery()
    .where(and(...conditions))
    .orderBy(...getFollowUpOrderBy(filters.sort))
    .limit(pageSize)
    .offset(offset);

  return rows.map(mapFollowUpRow);
}

export function getPendingFollowUpCount(items: FollowUpView[]) {
  return items.filter((item) => item.status === "pending").length;
}

export function getNextPendingFollowUp(items: FollowUpView[]) {
  return items
    .filter((item) => item.status === "pending")
    .sort((left, right) =>
      getDateInputValue(left.dueAt).localeCompare(getDateInputValue(right.dueAt)),
    )[0] ?? null;
}


/**
 * Returns recent inquiries and quotes for the quick-create follow-up picker.
 * Limited to 20 most recent open records.
 */
export async function getRecentRecordsForFollowUpCreate(
  businessId: string,
): Promise<{ kind: "inquiry" | "quote"; id: string; label: string }[]> {
  const [recentInquiries, recentQuotes] = await Promise.all([
    db
      .select({
        id: inquiries.id,
        customerName: inquiries.customerName,
        serviceCategory: inquiries.serviceCategory,
        createdAt: inquiries.createdAt,
      })
      .from(inquiries)
      .where(eq(inquiries.businessId, businessId))
      .orderBy(desc(inquiries.createdAt))
      .limit(10),
    db
      .select({
        id: quotes.id,
        customerName: quotes.customerName,
        quoteNumber: quotes.quoteNumber,
        title: quotes.title,
        createdAt: quotes.createdAt,
      })
      .from(quotes)
      .where(and(eq(quotes.businessId, businessId), isNull(quotes.deletedAt)))
      .orderBy(desc(quotes.createdAt))
      .limit(10),
  ]);

  const results: { kind: "inquiry" | "quote"; id: string; label: string; createdAt: Date }[] = [];

  for (const inquiry of recentInquiries) {
    const label = inquiry.customerName
      ? `Inquiry: ${inquiry.customerName}${inquiry.serviceCategory ? ` — ${inquiry.serviceCategory}` : ""}`
      : `Inquiry${inquiry.serviceCategory ? `: ${inquiry.serviceCategory}` : ""}`;
    results.push({ kind: "inquiry", id: inquiry.id, label, createdAt: inquiry.createdAt });
  }

  for (const quote of recentQuotes) {
    const label = quote.quoteNumber
      ? `Quote ${quote.quoteNumber}${quote.customerName ? ` — ${quote.customerName}` : ""}`
      : quote.title
        ? `Quote: ${quote.title}`
        : `Quote${quote.customerName ? `: ${quote.customerName}` : ""}`;
    results.push({ kind: "quote", id: quote.id, label, createdAt: quote.createdAt });
  }

  return results
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 20)
    .map(({ kind, id, label }) => ({ kind, id, label }));
}


/**
 * Returns business members (userId, name, email) for the reassign picker.
 */
export async function getBusinessMembersForReassign(
  businessId: string,
): Promise<{ userId: string; name: string; email: string }[]> {
  const { businessMembers, user } = await import("@/lib/db/schema");

  const rows = await db
    .select({
      userId: businessMembers.userId,
      name: user.name,
      email: user.email,
    })
    .from(businessMembers)
    .innerJoin(user, eq(businessMembers.userId, user.id))
    .where(eq(businessMembers.businessId, businessId))
    .orderBy(asc(user.name));

  return rows.map((row) => ({
    userId: row.userId,
    name: row.name,
    email: row.email,
  }));
}
