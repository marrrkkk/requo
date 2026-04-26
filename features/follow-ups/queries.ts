import "server-only";

import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  ilike,
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
  workspaceId: string;
  businessId: string;
  businessName: string;
  inquiryId: string | null;
  quoteId: string | null;
  assignedToUserId: string | null;
  createdByUserId: string | null;
  title: string;
  reason: string;
  channel: FollowUpView["channel"];
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
    workspaceId: row.workspaceId,
    businessId: row.businessId,
    inquiryId: row.inquiryId,
    quoteId: row.quoteId,
    assignedToUserId: row.assignedToUserId,
    createdByUserId: row.createdByUserId,
    title: row.title,
    reason: row.reason,
    channel: row.channel,
    dueAt: row.dueAt,
    completedAt: row.completedAt,
    skippedAt: row.skippedAt,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    dueBucket: getFollowUpDueBucket({
      status: row.status,
      dueAt: row.dueAt,
    }),
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
    workspaceId: followUps.workspaceId,
    businessId: followUps.businessId,
    businessName: businesses.name,
    inquiryId: followUps.inquiryId,
    quoteId: followUps.quoteId,
    assignedToUserId: followUps.assignedToUserId,
    createdByUserId: followUps.createdByUserId,
    title: followUps.title,
    reason: followUps.reason,
    channel: followUps.channel,
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
  const conditions = [eq(followUps.businessId, businessId)];

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
      and(eq(followUps.businessId, businessId), eq(followUps.inquiryId, inquiryId)),
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
      and(eq(followUps.businessId, businessId), eq(followUps.quoteId, quoteId)),
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
