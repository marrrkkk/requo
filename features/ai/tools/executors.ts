import "server-only";

import {
  and,
  count,
  desc,
  eq,
  gte,
  ilike,
  isNotNull,
  isNull,
  lt,
  lte,
  or,
  sql,
} from "drizzle-orm";

import { db } from "@/lib/db/client";
import {
  activityLogs,
  analyticsEvents,
  businesses,
  businessInquiryForms,
  followUps,
  inquiries,
  inquiryNotes,
  quoteItems,
  quoteLibraryEntries,
  quoteLibraryEntryItems,
  quotes,
  user,
} from "@/lib/db/schema";
import type { InquiryStatus } from "@/features/inquiries/types";
import type { QuoteStatus } from "@/features/quotes/types";
import type { FollowUpStatus } from "@/features/follow-ups/types";
import { formatQuoteMoney } from "@/features/quotes/utils";
import type { AiToolCall, AiToolExecutionContext, AiToolResult } from "./types";

/**
 * AI Tool Executors
 *
 * Each tool executes a read-only database query scoped to the
 * authorized business. Results are returned as formatted strings
 * that can be injected into the AI context.
 */

const MAX_LIMIT = 25;
const DEFAULT_LIMIT = 10;

function clampLimit(value: unknown, defaultVal = DEFAULT_LIMIT): number {
  const num = typeof value === "number" ? value : defaultVal;
  return Math.min(Math.max(1, num), MAX_LIMIT);
}

function clampOffset(value: unknown): number {
  const num = typeof value === "number" ? value : 0;
  return Math.max(0, num);
}

function truncate(value: string | null | undefined, limit: number): string {
  const normalized = value?.replace(/\r\n?/g, "\n").trim() ?? "";
  if (!normalized) return "";
  if (normalized.length <= limit) return normalized;
  return `${normalized.slice(0, limit).trimEnd()}...`;
}

function formatDate(value: Date | string | null | undefined): string {
  if (!value) return "N/A";
  if (typeof value === "string") return value;
  return value.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Tool: count_inquiries
// ---------------------------------------------------------------------------

async function executeCountInquiries(
  ctx: AiToolExecutionContext,
  args: Record<string, unknown>,
): Promise<string> {
  const statusFilter = typeof args.status === "string" ? args.status : null;

  const rows = await db
    .select({
      status: inquiries.status,
      count: count(),
    })
    .from(inquiries)
    .where(
      and(
        eq(inquiries.businessId, ctx.businessId),
        isNull(inquiries.deletedAt),
        statusFilter ? eq(inquiries.status, statusFilter as InquiryStatus) : undefined,
      ),
    )
    .groupBy(inquiries.status);

  const total = rows.reduce((sum, r) => sum + r.count, 0);
  const breakdown = rows.map((r) => `${r.status}: ${r.count}`).join(", ");

  return `Total inquiries: ${total}${breakdown ? ` (${breakdown})` : ""}`;
}

// ---------------------------------------------------------------------------
// Tool: count_quotes
// ---------------------------------------------------------------------------

async function executeCountQuotes(
  ctx: AiToolExecutionContext,
  args: Record<string, unknown>,
): Promise<string> {
  const statusFilter = typeof args.status === "string" ? args.status : null;

  const rows = await db
    .select({
      status: quotes.status,
      count: count(),
      totalValueCents: sql<string>`COALESCE(SUM(${quotes.totalInCents}), 0)`,
    })
    .from(quotes)
    .where(
      and(
        eq(quotes.businessId, ctx.businessId),
        isNull(quotes.deletedAt),
        statusFilter ? eq(quotes.status, statusFilter as QuoteStatus) : undefined,
      ),
    )
    .groupBy(quotes.status);

  const total = rows.reduce((sum, r) => sum + r.count, 0);
  const totalValue = rows.reduce((sum, r) => sum + Number(r.totalValueCents), 0);
  const breakdown = rows.map((r) => `${r.status}: ${r.count}`).join(", ");

  // Get default currency
  const businessRow = await db
    .select({ defaultCurrency: businesses.defaultCurrency })
    .from(businesses)
    .where(eq(businesses.id, ctx.businessId))
    .limit(1);
  const currency = businessRow[0]?.defaultCurrency ?? "USD";

  return `Total quotes: ${total}${breakdown ? ` (${breakdown})` : ""}. Total quoted value: ${formatQuoteMoney(totalValue, currency)}`;
}

// ---------------------------------------------------------------------------
// Tool: search_inquiries
// ---------------------------------------------------------------------------

async function executeSearchInquiries(
  ctx: AiToolExecutionContext,
  args: Record<string, unknown>,
): Promise<string> {
  const query = typeof args.query === "string" ? args.query.trim() : "";
  if (!query) return "Error: query parameter is required.";

  const statusFilter = typeof args.status === "string" ? args.status : null;
  const limit = clampLimit(args.limit);
  const pattern = `%${query}%`;

  const rows = await db
    .select({
      id: inquiries.id,
      customerName: inquiries.customerName,
      customerEmail: inquiries.customerEmail,
      serviceCategory: inquiries.serviceCategory,
      subject: inquiries.subject,
      status: inquiries.status,
      details: inquiries.details,
      submittedAt: inquiries.submittedAt,
      budgetText: inquiries.budgetText,
    })
    .from(inquiries)
    .where(
      and(
        eq(inquiries.businessId, ctx.businessId),
        isNull(inquiries.deletedAt),
        statusFilter ? eq(inquiries.status, statusFilter as InquiryStatus) : undefined,
        or(
          ilike(inquiries.customerName, pattern),
          ilike(inquiries.customerEmail, pattern),
          ilike(inquiries.subject, pattern),
          ilike(inquiries.serviceCategory, pattern),
          ilike(inquiries.details, pattern),
        ),
      ),
    )
    .orderBy(desc(inquiries.submittedAt))
    .limit(limit);

  if (!rows.length) return `No inquiries found matching "${query}".`;

  const lines = rows.map(
    (r) =>
      `- [id:${r.id}] ${r.customerName} (${r.customerEmail ?? "no email"}) — ${r.serviceCategory} [${r.status}] — subject: ${r.subject ?? "N/A"} — submitted: ${formatDate(r.submittedAt)}${r.budgetText ? ` — budget: ${r.budgetText}` : ""} — ${truncate(r.details, 120)}`,
  );

  return `Found ${rows.length} inquiries matching "${query}":\n${lines.join("\n")}`;
}

// ---------------------------------------------------------------------------
// Tool: search_quotes
// ---------------------------------------------------------------------------

async function executeSearchQuotes(
  ctx: AiToolExecutionContext,
  args: Record<string, unknown>,
): Promise<string> {
  const query = typeof args.query === "string" ? args.query.trim() : "";
  if (!query) return "Error: query parameter is required.";

  const statusFilter = typeof args.status === "string" ? args.status : null;
  const limit = clampLimit(args.limit);
  const pattern = `%${query}%`;

  const rows = await db
    .select({
      id: quotes.id,
      quoteNumber: quotes.quoteNumber,
      title: quotes.title,
      customerName: quotes.customerName,
      customerEmail: quotes.customerEmail,
      status: quotes.status,
      totalInCents: quotes.totalInCents,
      currency: quotes.currency,
      createdAt: quotes.createdAt,
      sentAt: quotes.sentAt,
    })
    .from(quotes)
    .where(
      and(
        eq(quotes.businessId, ctx.businessId),
        isNull(quotes.deletedAt),
        statusFilter ? eq(quotes.status, statusFilter as QuoteStatus) : undefined,
        or(
          ilike(quotes.customerName, pattern),
          ilike(quotes.customerEmail, pattern),
          ilike(quotes.quoteNumber, pattern),
          ilike(quotes.title, pattern),
          ilike(quotes.notes, pattern),
        ),
      ),
    )
    .orderBy(desc(quotes.createdAt))
    .limit(limit);

  if (!rows.length) return `No quotes found matching "${query}".`;

  const lines = rows.map(
    (r) =>
      `- [id:${r.id}] ${r.quoteNumber} "${r.title}" for ${r.customerName} (${r.customerEmail ?? "no email"}) [${r.status}] — total: ${formatQuoteMoney(r.totalInCents, r.currency)} — created: ${formatDate(r.createdAt)}${r.sentAt ? ` — sent: ${formatDate(r.sentAt)}` : ""}`,
  );

  return `Found ${rows.length} quotes matching "${query}":\n${lines.join("\n")}`;
}

// ---------------------------------------------------------------------------
// Tool: get_inquiry_details
// ---------------------------------------------------------------------------

async function executeGetInquiryDetails(
  ctx: AiToolExecutionContext,
  args: Record<string, unknown>,
): Promise<string> {
  const inquiryId = typeof args.inquiry_id === "string" ? args.inquiry_id.trim() : "";
  if (!inquiryId) return "Error: inquiry_id parameter is required.";

  const rows = await db
    .select({
      id: inquiries.id,
      customerName: inquiries.customerName,
      customerEmail: inquiries.customerEmail,
      customerContactMethod: inquiries.customerContactMethod,
      customerContactHandle: inquiries.customerContactHandle,
      serviceCategory: inquiries.serviceCategory,
      subject: inquiries.subject,
      status: inquiries.status,
      details: inquiries.details,
      budgetText: inquiries.budgetText,
      requestedDeadline: inquiries.requestedDeadline,
      source: inquiries.source,
      submittedAt: inquiries.submittedAt,
      createdAt: inquiries.createdAt,
    })
    .from(inquiries)
    .where(
      and(
        eq(inquiries.id, inquiryId),
        eq(inquiries.businessId, ctx.businessId),
        isNull(inquiries.deletedAt),
      ),
    )
    .limit(1);

  if (!rows.length) return `Inquiry "${inquiryId}" not found.`;

  const inq = rows[0];

  // Get related quotes
  const relatedQuotes = await db
    .select({
      id: quotes.id,
      quoteNumber: quotes.quoteNumber,
      title: quotes.title,
      status: quotes.status,
      totalInCents: quotes.totalInCents,
      currency: quotes.currency,
    })
    .from(quotes)
    .where(
      and(
        eq(quotes.inquiryId, inquiryId),
        eq(quotes.businessId, ctx.businessId),
        isNull(quotes.deletedAt),
      ),
    )
    .orderBy(desc(quotes.createdAt));

  const quotesSection = relatedQuotes.length
    ? relatedQuotes
        .map((q) => `  - ${q.quoteNumber} "${q.title}" [${q.status}] ${formatQuoteMoney(q.totalInCents, q.currency)}`)
        .join("\n")
    : "  None";

  return [
    `Inquiry: ${inq.customerName}`,
    `- ID: ${inq.id}`,
    `- Email: ${inq.customerEmail ?? "Not provided"}`,
    `- Contact: ${inq.customerContactMethod} ${inq.customerContactHandle}`,
    `- Category: ${inq.serviceCategory}`,
    `- Subject: ${inq.subject ?? "Not provided"}`,
    `- Status: ${inq.status}`,
    `- Budget: ${inq.budgetText ?? "Not provided"}`,
    `- Deadline: ${inq.requestedDeadline ?? "Not provided"}`,
    `- Source: ${inq.source ?? "Not specified"}`,
    `- Submitted: ${formatDate(inq.submittedAt)}`,
    `- Details: ${truncate(inq.details, 800)}`,
    `- Related quotes:\n${quotesSection}`,
  ].join("\n");
}

// ---------------------------------------------------------------------------
// Tool: get_quote_details
// ---------------------------------------------------------------------------

async function executeGetQuoteDetails(
  ctx: AiToolExecutionContext,
  args: Record<string, unknown>,
): Promise<string> {
  const quoteId = typeof args.quote_id === "string" ? args.quote_id.trim() : "";
  if (!quoteId) return "Error: quote_id parameter is required.";

  // Support lookup by ID or quote number
  const rows = await db
    .select({
      id: quotes.id,
      quoteNumber: quotes.quoteNumber,
      title: quotes.title,
      customerName: quotes.customerName,
      customerEmail: quotes.customerEmail,
      customerContactMethod: quotes.customerContactMethod,
      customerContactHandle: quotes.customerContactHandle,
      status: quotes.status,
      subtotalInCents: quotes.subtotalInCents,
      discountInCents: quotes.discountInCents,
      totalInCents: quotes.totalInCents,
      currency: quotes.currency,
      validUntil: quotes.validUntil,
      notes: quotes.notes,
      sentAt: quotes.sentAt,
      acceptedAt: quotes.acceptedAt,
      publicViewedAt: quotes.publicViewedAt,
      createdAt: quotes.createdAt,
      inquiryId: quotes.inquiryId,
    })
    .from(quotes)
    .where(
      and(
        eq(quotes.businessId, ctx.businessId),
        isNull(quotes.deletedAt),
        or(
          eq(quotes.id, quoteId),
          ilike(quotes.quoteNumber, quoteId),
        ),
      ),
    )
    .limit(1);

  if (!rows.length) return `Quote "${quoteId}" not found.`;

  const q = rows[0];

  // Get line items
  const items = await db
    .select({
      description: quoteItems.description,
      quantity: quoteItems.quantity,
      unitPriceInCents: quoteItems.unitPriceInCents,
      lineTotalInCents: quoteItems.lineTotalInCents,
    })
    .from(quoteItems)
    .where(eq(quoteItems.quoteId, q.id))
    .orderBy(quoteItems.position);

  const itemsSection = items.length
    ? items
        .map(
          (item) =>
            `  - ${item.description} x${item.quantity} @ ${formatQuoteMoney(item.unitPriceInCents, q.currency)} = ${formatQuoteMoney(item.lineTotalInCents, q.currency)}`,
        )
        .join("\n")
    : "  No line items";

  return [
    `Quote: ${q.quoteNumber} — "${q.title}"`,
    `- ID: ${q.id}`,
    `- Customer: ${q.customerName} (${q.customerEmail ?? "no email"})`,
    `- Contact: ${q.customerContactMethod} ${q.customerContactHandle}`,
    `- Status: ${q.status}`,
    `- Subtotal: ${formatQuoteMoney(q.subtotalInCents, q.currency)}`,
    `- Discount: ${formatQuoteMoney(q.discountInCents, q.currency)}`,
    `- Total: ${formatQuoteMoney(q.totalInCents, q.currency)}`,
    `- Valid until: ${q.validUntil}`,
    `- Created: ${formatDate(q.createdAt)}`,
    `- Sent: ${formatDate(q.sentAt)}`,
    `- Viewed: ${formatDate(q.publicViewedAt)}`,
    `- Accepted: ${formatDate(q.acceptedAt)}`,
    q.notes ? `- Notes: ${truncate(q.notes, 400)}` : null,
    q.inquiryId ? `- Linked inquiry: ${q.inquiryId}` : null,
    `- Line items:\n${itemsSection}`,
  ]
    .filter((line): line is string => line !== null)
    .join("\n");
}

// ---------------------------------------------------------------------------
// Tool: get_business_stats
// ---------------------------------------------------------------------------

async function executeGetBusinessStats(
  ctx: AiToolExecutionContext,
): Promise<string> {
  const [businessRow, inquiryRows, quoteRows, followUpRows] = await Promise.all([
    db
      .select({
        name: businesses.name,
        defaultCurrency: businesses.defaultCurrency,
        createdAt: businesses.createdAt,
      })
      .from(businesses)
      .where(eq(businesses.id, ctx.businessId))
      .limit(1),
    db
      .select({
        status: inquiries.status,
        count: count(),
      })
      .from(inquiries)
      .where(
        and(
          eq(inquiries.businessId, ctx.businessId),
          isNull(inquiries.deletedAt),
        ),
      )
      .groupBy(inquiries.status),
    db
      .select({
        status: quotes.status,
        count: count(),
        totalValueCents: sql<string>`COALESCE(SUM(${quotes.totalInCents}), 0)`,
      })
      .from(quotes)
      .where(
        and(
          eq(quotes.businessId, ctx.businessId),
          isNull(quotes.deletedAt),
        ),
      )
      .groupBy(quotes.status),
    db
      .select({
        status: followUps.status,
        count: count(),
      })
      .from(followUps)
      .where(eq(followUps.businessId, ctx.businessId))
      .groupBy(followUps.status),
  ]);

  const business = businessRow[0];
  if (!business) return "Business not found.";

  const currency = business.defaultCurrency;
  const totalInquiries = inquiryRows.reduce((s, r) => s + r.count, 0);
  const totalQuotes = quoteRows.reduce((s, r) => s + r.count, 0);
  const totalQuoteValue = quoteRows.reduce((s, r) => s + Number(r.totalValueCents), 0);
  const acceptedQuotes = quoteRows.find((r) => r.status === "accepted");
  const conversionRate =
    totalInquiries > 0 && acceptedQuotes
      ? ((acceptedQuotes.count / totalInquiries) * 100).toFixed(1)
      : "0";

  return [
    `Business: ${business.name} (created ${formatDate(business.createdAt)})`,
    "",
    `Inquiries: ${totalInquiries} total`,
    ...inquiryRows.map((r) => `  - ${r.status}: ${r.count}`),
    "",
    `Quotes: ${totalQuotes} total (value: ${formatQuoteMoney(totalQuoteValue, currency)})`,
    ...quoteRows.map((r) => `  - ${r.status}: ${r.count} (${formatQuoteMoney(Number(r.totalValueCents), currency)})`),
    "",
    `Follow-ups: ${followUpRows.reduce((s, r) => s + r.count, 0)} total`,
    ...followUpRows.map((r) => `  - ${r.status}: ${r.count}`),
    "",
    `Conversion rate (inquiries → accepted quotes): ${conversionRate}%`,
  ].join("\n");
}

// ---------------------------------------------------------------------------
// Tool: get_recent_activity
// ---------------------------------------------------------------------------

async function executeGetRecentActivity(
  ctx: AiToolExecutionContext,
  args: Record<string, unknown>,
): Promise<string> {
  const limit = clampLimit(args.limit);
  const typeFilter = typeof args.type === "string" ? args.type : null;

  const rows = await db
    .select({
      type: activityLogs.type,
      summary: activityLogs.summary,
      createdAt: activityLogs.createdAt,
      actorName: user.name,
      inquiryId: activityLogs.inquiryId,
      quoteId: activityLogs.quoteId,
    })
    .from(activityLogs)
    .leftJoin(user, eq(activityLogs.actorUserId, user.id))
    .where(
      and(
        eq(activityLogs.businessId, ctx.businessId),
        typeFilter ? eq(activityLogs.type, typeFilter) : undefined,
      ),
    )
    .orderBy(desc(activityLogs.createdAt))
    .limit(limit);

  if (!rows.length) return "No recent activity found.";

  const lines = rows.map(
    (r) =>
      `- ${formatDate(r.createdAt)} [${r.type}] ${r.summary}${r.actorName ? ` (by ${r.actorName})` : ""}${r.inquiryId ? ` [inquiry:${r.inquiryId}]` : ""}${r.quoteId ? ` [quote:${r.quoteId}]` : ""}`,
  );

  return `Recent activity (${rows.length} entries):\n${lines.join("\n")}`;
}

// ---------------------------------------------------------------------------
// Tool: get_follow_ups
// ---------------------------------------------------------------------------

async function executeGetFollowUps(
  ctx: AiToolExecutionContext,
  args: Record<string, unknown>,
): Promise<string> {
  const statusFilter = typeof args.status === "string" ? args.status : null;
  const bucketFilter = typeof args.bucket === "string" ? args.bucket : null;
  const limit = clampLimit(args.limit);

  let bucketCondition: ReturnType<typeof sql> | undefined;
  if (bucketFilter === "overdue") {
    bucketCondition = sql`${followUps.dueAt} < NOW() AND ${followUps.status} = 'pending'`;
  } else if (bucketFilter === "today") {
    bucketCondition = sql`${followUps.dueAt}::date = CURRENT_DATE AND ${followUps.status} = 'pending'`;
  } else if (bucketFilter === "upcoming") {
    bucketCondition = sql`${followUps.dueAt} > NOW() AND ${followUps.status} = 'pending'`;
  }

  const rows = await db
    .select({
      id: followUps.id,
      title: followUps.title,
      reason: followUps.reason,
      channel: followUps.channel,
      status: followUps.status,
      dueAt: followUps.dueAt,
      completedAt: followUps.completedAt,
      quoteId: followUps.quoteId,
      inquiryId: followUps.inquiryId,
    })
    .from(followUps)
    .where(
      and(
        eq(followUps.businessId, ctx.businessId),
        statusFilter ? eq(followUps.status, statusFilter as FollowUpStatus) : undefined,
        bucketCondition,
      ),
    )
    .orderBy(desc(followUps.dueAt))
    .limit(limit);

  if (!rows.length) return "No follow-ups found matching the criteria.";

  const lines = rows.map(
    (r) =>
      `- ${r.title} [${r.status}] — due: ${formatDate(r.dueAt)} — channel: ${r.channel}${r.reason ? ` — reason: ${truncate(r.reason, 100)}` : ""}${r.quoteId ? ` [quote:${r.quoteId}]` : ""}${r.inquiryId ? ` [inquiry:${r.inquiryId}]` : ""}`,
  );

  return `Follow-ups (${rows.length} results):\n${lines.join("\n")}`;
}

// ---------------------------------------------------------------------------
// Tool: list_inquiries
// ---------------------------------------------------------------------------

async function executeListInquiries(
  ctx: AiToolExecutionContext,
  args: Record<string, unknown>,
): Promise<string> {
  const statusFilter = typeof args.status === "string" ? args.status : null;
  const limit = clampLimit(args.limit);
  const offset = clampOffset(args.offset);

  // Get total count for context
  const countRows = await db
    .select({ count: count() })
    .from(inquiries)
    .where(
      and(
        eq(inquiries.businessId, ctx.businessId),
        isNull(inquiries.deletedAt),
        statusFilter ? eq(inquiries.status, statusFilter as InquiryStatus) : undefined,
      ),
    );
  const totalCount = countRows[0]?.count ?? 0;

  const rows = await db
    .select({
      id: inquiries.id,
      customerName: inquiries.customerName,
      customerEmail: inquiries.customerEmail,
      serviceCategory: inquiries.serviceCategory,
      subject: inquiries.subject,
      status: inquiries.status,
      submittedAt: inquiries.submittedAt,
      budgetText: inquiries.budgetText,
    })
    .from(inquiries)
    .where(
      and(
        eq(inquiries.businessId, ctx.businessId),
        isNull(inquiries.deletedAt),
        statusFilter ? eq(inquiries.status, statusFilter as InquiryStatus) : undefined,
      ),
    )
    .orderBy(desc(inquiries.submittedAt))
    .limit(limit)
    .offset(offset);

  if (!rows.length) return `No inquiries found${statusFilter ? ` with status "${statusFilter}"` : ""}.`;

  const lines = rows.map(
    (r) =>
      `- [id:${r.id}] ${r.customerName} (${r.customerEmail ?? "no email"}) — ${r.serviceCategory} [${r.status}] — subject: ${r.subject ?? "N/A"} — submitted: ${formatDate(r.submittedAt)}${r.budgetText ? ` — budget: ${r.budgetText}` : ""}`,
  );

  const paginationNote =
    totalCount > offset + rows.length
      ? `\n(Showing ${offset + 1}–${offset + rows.length} of ${totalCount} total)`
      : `\n(${totalCount} total)`;

  return `Inquiries${statusFilter ? ` [${statusFilter}]` : ""}:\n${lines.join("\n")}${paginationNote}`;
}

// ---------------------------------------------------------------------------
// Tool: list_quotes
// ---------------------------------------------------------------------------

async function executeListQuotes(
  ctx: AiToolExecutionContext,
  args: Record<string, unknown>,
): Promise<string> {
  const statusFilter = typeof args.status === "string" ? args.status : null;
  const limit = clampLimit(args.limit);
  const offset = clampOffset(args.offset);

  const countRows = await db
    .select({ count: count() })
    .from(quotes)
    .where(
      and(
        eq(quotes.businessId, ctx.businessId),
        isNull(quotes.deletedAt),
        statusFilter ? eq(quotes.status, statusFilter as QuoteStatus) : undefined,
      ),
    );
  const totalCount = countRows[0]?.count ?? 0;

  const rows = await db
    .select({
      id: quotes.id,
      quoteNumber: quotes.quoteNumber,
      title: quotes.title,
      customerName: quotes.customerName,
      customerEmail: quotes.customerEmail,
      status: quotes.status,
      totalInCents: quotes.totalInCents,
      currency: quotes.currency,
      createdAt: quotes.createdAt,
      sentAt: quotes.sentAt,
    })
    .from(quotes)
    .where(
      and(
        eq(quotes.businessId, ctx.businessId),
        isNull(quotes.deletedAt),
        statusFilter ? eq(quotes.status, statusFilter as QuoteStatus) : undefined,
      ),
    )
    .orderBy(desc(quotes.createdAt))
    .limit(limit)
    .offset(offset);

  if (!rows.length) return `No quotes found${statusFilter ? ` with status "${statusFilter}"` : ""}.`;

  const lines = rows.map(
    (r) =>
      `- [id:${r.id}] ${r.quoteNumber} "${r.title}" for ${r.customerName} (${r.customerEmail ?? "no email"}) [${r.status}] — total: ${formatQuoteMoney(r.totalInCents, r.currency)} — created: ${formatDate(r.createdAt)}${r.sentAt ? ` — sent: ${formatDate(r.sentAt)}` : ""}`,
  );

  const paginationNote =
    totalCount > offset + rows.length
      ? `\n(Showing ${offset + 1}–${offset + rows.length} of ${totalCount} total)`
      : `\n(${totalCount} total)`;

  return `Quotes${statusFilter ? ` [${statusFilter}]` : ""}:\n${lines.join("\n")}${paginationNote}`;
}

// ---------------------------------------------------------------------------
// Tool: get_analytics_overview
// ---------------------------------------------------------------------------

async function executeGetAnalyticsOverview(
  ctx: AiToolExecutionContext,
): Promise<string> {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [inquiryRows, quoteRows, formViewRows, followUpRows] = await Promise.all([
    db
      .select({
        total: count(),
        withQuote: sql<number>`count(*) filter (where exists (select 1 from quotes q where q.inquiry_id = inquiries.id and q.deleted_at is null))`,
      })
      .from(inquiries)
      .where(
        and(
          eq(inquiries.businessId, ctx.businessId),
          isNull(inquiries.deletedAt),
          gte(inquiries.submittedAt, thirtyDaysAgo),
        ),
      ),
    db
      .select({
        sent: sql<number>`count(*) filter (where ${quotes.sentAt} is not null)`,
        viewed: sql<number>`count(*) filter (where ${quotes.publicViewedAt} is not null)`,
        accepted: sql<number>`count(*) filter (where ${quotes.status} = 'accepted')`,
        rejected: sql<number>`count(*) filter (where ${quotes.status} = 'rejected')`,
        totalAcceptedValue: sql<number>`coalesce(sum(${quotes.totalInCents}) filter (where ${quotes.status} = 'accepted'), 0)`,
        avgTimeSentToDecisionHours: sql<number | null>`avg(extract(epoch from (${quotes.customerRespondedAt} - ${quotes.sentAt})) / 3600) filter (where ${quotes.customerRespondedAt} is not null and ${quotes.sentAt} is not null)`,
      })
      .from(quotes)
      .where(
        and(
          eq(quotes.businessId, ctx.businessId),
          isNull(quotes.deletedAt),
          gte(quotes.createdAt, thirtyDaysAgo),
        ),
      ),
    db
      .select({
        views: sql<number>`count(distinct ${analyticsEvents.visitorHash})`,
      })
      .from(analyticsEvents)
      .where(
        and(
          eq(analyticsEvents.businessId, ctx.businessId),
          eq(analyticsEvents.eventType, "inquiry_form_viewed"),
          gte(analyticsEvents.occurredAt, thirtyDaysAgo),
        ),
      ),
    db
      .select({
        total: count(),
        completed: sql<number>`count(*) filter (where ${followUps.status} = 'completed')`,
        overdue: sql<number>`count(*) filter (where ${followUps.status} = 'pending' and ${followUps.dueAt} < now())`,
      })
      .from(followUps)
      .where(
        and(
          eq(followUps.businessId, ctx.businessId),
          gte(followUps.createdAt, thirtyDaysAgo),
        ),
      ),
  ]);

  const businessRow = await db
    .select({ defaultCurrency: businesses.defaultCurrency })
    .from(businesses)
    .where(eq(businesses.id, ctx.businessId))
    .limit(1);
  const currency = businessRow[0]?.defaultCurrency ?? "USD";

  const inq = inquiryRows[0];
  const q = quoteRows[0];
  const fv = formViewRows[0];
  const fu = followUpRows[0];
  const inquiryCount = inq?.total ?? 0;
  const withQuote = Number(inq?.withQuote ?? 0);
  const sent = Number(q?.sent ?? 0);
  const viewed = Number(q?.viewed ?? 0);
  const accepted = Number(q?.accepted ?? 0);
  const rejected = Number(q?.rejected ?? 0);
  const acceptedValue = Number(q?.totalAcceptedValue ?? 0);
  const avgDecisionHours = q?.avgTimeSentToDecisionHours != null ? Math.round(Number(q.avgTimeSentToDecisionHours) * 10) / 10 : null;

  return [
    "Analytics overview (last 30 days)",
    "",
    "Funnel:",
    `  Form visitors: ${Number(fv?.views ?? 0)}`,
    `  Inquiries submitted: ${inquiryCount}`,
    `  Inquiries with quote: ${withQuote}`,
    `  Quotes sent: ${sent}`,
    `  Quotes viewed: ${viewed}`,
    `  Quotes accepted: ${accepted}`,
    `  Quotes rejected: ${rejected}`,
    "",
    "Rates:",
    `  Inquiry → Quote rate: ${inquiryCount ? ((withQuote / inquiryCount) * 100).toFixed(1) : "0"}%`,
    `  Quote acceptance rate: ${sent ? ((accepted / sent) * 100).toFixed(1) : "0"}%`,
    `  Quote view rate: ${sent ? ((viewed / sent) * 100).toFixed(1) : "0"}%`,
    "",
    "Revenue:",
    `  Accepted quote value: ${formatQuoteMoney(acceptedValue, currency)}`,
    `  Average accepted quote: ${accepted ? formatQuoteMoney(Math.round(acceptedValue / accepted), currency) : "N/A"}`,
    avgDecisionHours != null ? `  Avg time to decision: ${avgDecisionHours}h` : null,
    "",
    "Follow-ups:",
    `  Created: ${fu?.total ?? 0}`,
    `  Completed: ${Number(fu?.completed ?? 0)}`,
    `  Overdue: ${Number(fu?.overdue ?? 0)}`,
  ].filter((l): l is string => l !== null).join("\n");
}

// ---------------------------------------------------------------------------
// Tool: get_revenue_summary
// ---------------------------------------------------------------------------

async function executeGetRevenueSummary(
  ctx: AiToolExecutionContext,
  args: Record<string, unknown>,
): Promise<string> {
  const days = typeof args.days === "number" ? Math.min(Math.max(7, args.days), 365) : 30;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const businessRow = await db
    .select({ defaultCurrency: businesses.defaultCurrency })
    .from(businesses)
    .where(eq(businesses.id, ctx.businessId))
    .limit(1);
  const currency = businessRow[0]?.defaultCurrency ?? "USD";

  const rows = await db
    .select({
      totalAccepted: sql<number>`coalesce(sum(${quotes.totalInCents}) filter (where ${quotes.status} = 'accepted'), 0)`,
      countAccepted: sql<number>`count(*) filter (where ${quotes.status} = 'accepted')`,
      totalCompleted: sql<number>`coalesce(sum(${quotes.totalInCents}) filter (where ${quotes.status} = 'accepted' and ${quotes.completedAt} is not null), 0)`,
      countCompleted: sql<number>`count(*) filter (where ${quotes.status} = 'accepted' and ${quotes.completedAt} is not null)`,
      totalSent: sql<number>`coalesce(sum(${quotes.totalInCents}) filter (where ${quotes.sentAt} is not null), 0)`,
      countSent: sql<number>`count(*) filter (where ${quotes.sentAt} is not null)`,
    })
    .from(quotes)
    .where(
      and(
        eq(quotes.businessId, ctx.businessId),
        isNull(quotes.deletedAt),
        gte(quotes.createdAt, since),
      ),
    );

  const r = rows[0];
  const totalAccepted = Number(r?.totalAccepted ?? 0);
  const countAccepted = Number(r?.countAccepted ?? 0);
  const totalCompleted = Number(r?.totalCompleted ?? 0);
  const countCompleted = Number(r?.countCompleted ?? 0);
  const totalSent = Number(r?.totalSent ?? 0);
  const countSent = Number(r?.countSent ?? 0);

  return [
    `Revenue summary (last ${days} days)`,
    "",
    `Quotes sent: ${countSent} (total value: ${formatQuoteMoney(totalSent, currency)})`,
    `Quotes accepted: ${countAccepted} (value: ${formatQuoteMoney(totalAccepted, currency)})`,
    `Average accepted deal: ${countAccepted ? formatQuoteMoney(Math.round(totalAccepted / countAccepted), currency) : "N/A"}`,
    `Jobs completed: ${countCompleted} (value: ${formatQuoteMoney(totalCompleted, currency)})`,
    `Win rate: ${countSent ? ((countAccepted / countSent) * 100).toFixed(1) : "0"}%`,
  ].join("\n");
}

// ---------------------------------------------------------------------------
// Tool: get_stale_inquiries
// ---------------------------------------------------------------------------

async function executeGetStaleInquiries(
  ctx: AiToolExecutionContext,
  args: Record<string, unknown>,
): Promise<string> {
  const limit = clampLimit(args.limit, 10);
  const staleDays = typeof args.days === "number" ? Math.min(Math.max(1, args.days), 30) : 2;
  const cutoff = new Date(Date.now() - staleDays * 24 * 60 * 60 * 1000);

  const rows = await db
    .select({
      id: inquiries.id,
      customerName: inquiries.customerName,
      customerEmail: inquiries.customerEmail,
      serviceCategory: inquiries.serviceCategory,
      subject: inquiries.subject,
      status: inquiries.status,
      submittedAt: inquiries.submittedAt,
    })
    .from(inquiries)
    .where(
      and(
        eq(inquiries.businessId, ctx.businessId),
        isNull(inquiries.deletedAt),
        isNull(inquiries.archivedAt),
        sql`${inquiries.status} in ('new', 'waiting')`,
        lt(inquiries.submittedAt, cutoff),
      ),
    )
    .orderBy(inquiries.submittedAt)
    .limit(limit);

  if (!rows.length) return `No stale inquiries found (older than ${staleDays} days without response).`;

  const lines = rows.map(
    (r) => `- [id:${r.id}] ${r.customerName} — ${r.serviceCategory} [${r.status}] — submitted: ${formatDate(r.submittedAt)} — subject: ${r.subject ?? "N/A"}`,
  );

  return `Stale inquiries (no response, ${staleDays}+ days old): ${rows.length} found\n${lines.join("\n")}`;
}

// ---------------------------------------------------------------------------
// Tool: get_expiring_quotes
// ---------------------------------------------------------------------------

async function executeGetExpiringQuotes(
  ctx: AiToolExecutionContext,
  args: Record<string, unknown>,
): Promise<string> {
  const limit = clampLimit(args.limit, 10);
  const withinDays = typeof args.days === "number" ? Math.min(Math.max(1, args.days), 30) : 7;
  const now = new Date();
  const deadline = new Date(now.getTime() + withinDays * 24 * 60 * 60 * 1000);
  const todayStr = now.toISOString().slice(0, 10);
  const deadlineStr = deadline.toISOString().slice(0, 10);

  const businessRow = await db
    .select({ defaultCurrency: businesses.defaultCurrency })
    .from(businesses)
    .where(eq(businesses.id, ctx.businessId))
    .limit(1);
  const currency = businessRow[0]?.defaultCurrency ?? "USD";

  const rows = await db
    .select({
      id: quotes.id,
      quoteNumber: quotes.quoteNumber,
      title: quotes.title,
      customerName: quotes.customerName,
      totalInCents: quotes.totalInCents,
      validUntil: quotes.validUntil,
      sentAt: quotes.sentAt,
    })
    .from(quotes)
    .where(
      and(
        eq(quotes.businessId, ctx.businessId),
        isNull(quotes.deletedAt),
        eq(quotes.status, "sent"),
        lte(quotes.validUntil, deadlineStr),
        gte(quotes.validUntil, todayStr),
      ),
    )
    .orderBy(quotes.validUntil)
    .limit(limit);

  if (!rows.length) return `No quotes expiring within the next ${withinDays} days.`;

  const lines = rows.map(
    (r) => `- [id:${r.id}] ${r.quoteNumber} "${r.title}" for ${r.customerName} — ${formatQuoteMoney(r.totalInCents, currency)} — expires: ${r.validUntil}`,
  );

  return `Quotes expiring within ${withinDays} days: ${rows.length} found\n${lines.join("\n")}`;
}

// ---------------------------------------------------------------------------
// Tool: get_customer_history
// ---------------------------------------------------------------------------

async function executeGetCustomerHistory(
  ctx: AiToolExecutionContext,
  args: Record<string, unknown>,
): Promise<string> {
  const customer = typeof args.customer === "string" ? args.customer.trim() : "";
  if (!customer) return "Error: customer parameter is required.";

  const pattern = `%${customer}%`;

  const [customerInquiries, customerQuotes] = await Promise.all([
    db
      .select({
        id: inquiries.id,
        customerName: inquiries.customerName,
        customerEmail: inquiries.customerEmail,
        serviceCategory: inquiries.serviceCategory,
        status: inquiries.status,
        submittedAt: inquiries.submittedAt,
      })
      .from(inquiries)
      .where(
        and(
          eq(inquiries.businessId, ctx.businessId),
          isNull(inquiries.deletedAt),
          or(
            ilike(inquiries.customerName, pattern),
            ilike(inquiries.customerEmail, pattern),
          ),
        ),
      )
      .orderBy(desc(inquiries.submittedAt))
      .limit(15),
    db
      .select({
        id: quotes.id,
        quoteNumber: quotes.quoteNumber,
        title: quotes.title,
        customerName: quotes.customerName,
        status: quotes.status,
        totalInCents: quotes.totalInCents,
        currency: quotes.currency,
        createdAt: quotes.createdAt,
      })
      .from(quotes)
      .where(
        and(
          eq(quotes.businessId, ctx.businessId),
          isNull(quotes.deletedAt),
          or(
            ilike(quotes.customerName, pattern),
            ilike(quotes.customerEmail, pattern),
          ),
        ),
      )
      .orderBy(desc(quotes.createdAt))
      .limit(15),
  ]);

  if (!customerInquiries.length && !customerQuotes.length) {
    return `No records found for customer matching "${customer}".`;
  }

  const sections: string[] = [`Customer history for "${customer}":`];

  if (customerInquiries.length) {
    sections.push(
      "",
      `Inquiries (${customerInquiries.length}):`,
      ...customerInquiries.map(
        (r) => `- [id:${r.id}] ${r.customerName} — ${r.serviceCategory} [${r.status}] — ${formatDate(r.submittedAt)}`,
      ),
    );
  }

  if (customerQuotes.length) {
    sections.push(
      "",
      `Quotes (${customerQuotes.length}):`,
      ...customerQuotes.map(
        (r) => `- [id:${r.id}] ${r.quoteNumber} "${r.title}" [${r.status}] — ${formatQuoteMoney(r.totalInCents, r.currency)} — ${formatDate(r.createdAt)}`,
      ),
    );
  }

  return sections.join("\n");
}

// ---------------------------------------------------------------------------
// Tool: get_service_categories
// ---------------------------------------------------------------------------

async function executeGetServiceCategories(
  ctx: AiToolExecutionContext,
): Promise<string> {
  const rows = await db
    .select({
      category: inquiries.serviceCategory,
      count: count(),
    })
    .from(inquiries)
    .where(
      and(
        eq(inquiries.businessId, ctx.businessId),
        isNull(inquiries.deletedAt),
      ),
    )
    .groupBy(inquiries.serviceCategory)
    .orderBy(desc(count()));

  if (!rows.length) return "No service categories found.";

  const total = rows.reduce((s, r) => s + r.count, 0);
  const lines = rows.map(
    (r) => `- ${r.category}: ${r.count} inquiries (${((r.count / total) * 100).toFixed(0)}%)`,
  );

  return `Service categories (${rows.length} categories, ${total} total inquiries):\n${lines.join("\n")}`;
}

// ---------------------------------------------------------------------------
// Tool: get_pricing_library
// ---------------------------------------------------------------------------

async function executeGetPricingLibrary(
  ctx: AiToolExecutionContext,
  args: Record<string, unknown>,
): Promise<string> {
  const query = typeof args.query === "string" ? args.query.trim() : "";
  const limit = clampLimit(args.limit, 10);

  const conditions = [eq(quoteLibraryEntries.businessId, ctx.businessId)];
  if (query) {
    const pattern = `%${query}%`;
    conditions.push(
      or(
        ilike(quoteLibraryEntries.name, pattern),
        ilike(quoteLibraryEntries.description, pattern),
      )!,
    );
  }

  const entries = await db
    .select({
      id: quoteLibraryEntries.id,
      kind: quoteLibraryEntries.kind,
      name: quoteLibraryEntries.name,
      description: quoteLibraryEntries.description,
      currency: quoteLibraryEntries.currency,
    })
    .from(quoteLibraryEntries)
    .where(and(...conditions))
    .orderBy(desc(quoteLibraryEntries.updatedAt))
    .limit(limit);

  if (!entries.length) return query ? `No pricing library entries matching "${query}".` : "Pricing library is empty.";

  // Get items for each entry
  const entryIds = entries.map((e) => e.id);
  const items = await db
    .select({
      entryId: quoteLibraryEntryItems.entryId,
      description: quoteLibraryEntryItems.description,
      quantity: quoteLibraryEntryItems.quantity,
      unitPriceInCents: quoteLibraryEntryItems.unitPriceInCents,
    })
    .from(quoteLibraryEntryItems)
    .where(
      sql`${quoteLibraryEntryItems.entryId} IN (${sql.join(entryIds.map((id) => sql`${id}`), sql`, `)})`,
    )
    .orderBy(quoteLibraryEntryItems.position);

  const itemsByEntry = new Map<string, typeof items>();
  for (const item of items) {
    const arr = itemsByEntry.get(item.entryId) ?? [];
    arr.push(item);
    itemsByEntry.set(item.entryId, arr);
  }

  const lines = entries.map((e) => {
    const entryItems = itemsByEntry.get(e.id) ?? [];
    const itemLines = entryItems
      .map((i) => `    - ${i.description} x${i.quantity} @ ${formatQuoteMoney(i.unitPriceInCents, e.currency)}`)
      .join("\n");
    return `- [${e.kind}] ${e.name}${e.description ? ` — ${e.description}` : ""}\n${itemLines}`;
  });

  return `Pricing library (${entries.length} entries):\n${lines.join("\n")}`;
}

// ---------------------------------------------------------------------------
// Tool: get_inquiry_notes
// ---------------------------------------------------------------------------

async function executeGetInquiryNotes(
  ctx: AiToolExecutionContext,
  args: Record<string, unknown>,
): Promise<string> {
  const inquiryId = typeof args.inquiry_id === "string" ? args.inquiry_id.trim() : "";
  if (!inquiryId) return "Error: inquiry_id parameter is required.";

  // Verify the inquiry belongs to the business
  const inqRows = await db
    .select({ id: inquiries.id, customerName: inquiries.customerName })
    .from(inquiries)
    .where(
      and(
        eq(inquiries.id, inquiryId),
        eq(inquiries.businessId, ctx.businessId),
      ),
    )
    .limit(1);

  if (!inqRows.length) return `Inquiry "${inquiryId}" not found.`;

  const notes = await db
    .select({
      id: inquiryNotes.id,
      body: inquiryNotes.body,
      createdAt: inquiryNotes.createdAt,
      authorName: user.name,
    })
    .from(inquiryNotes)
    .leftJoin(user, eq(inquiryNotes.authorUserId, user.id))
    .where(
      and(
        eq(inquiryNotes.inquiryId, inquiryId),
        eq(inquiryNotes.businessId, ctx.businessId),
      ),
    )
    .orderBy(desc(inquiryNotes.createdAt))
    .limit(20);

  if (!notes.length) return `No notes found for inquiry "${inqRows[0].customerName}".`;

  const lines = notes.map(
    (n) => `- ${formatDate(n.createdAt)} [${n.authorName ?? "Owner"}]: ${truncate(n.body, 300)}`,
  );

  return `Notes for ${inqRows[0].customerName} (${notes.length}):\n${lines.join("\n")}`;
}

// ---------------------------------------------------------------------------
// Main executor dispatcher
// ---------------------------------------------------------------------------

const TOOL_EXECUTORS: Record<
  string,
  (ctx: AiToolExecutionContext, args: Record<string, unknown>) => Promise<string>
> = {
  count_inquiries: executeCountInquiries,
  count_quotes: executeCountQuotes,
  search_inquiries: executeSearchInquiries,
  search_quotes: executeSearchQuotes,
  get_inquiry_details: executeGetInquiryDetails,
  get_quote_details: executeGetQuoteDetails,
  get_business_stats: executeGetBusinessStats,
  get_recent_activity: executeGetRecentActivity,
  get_follow_ups: executeGetFollowUps,
  list_inquiries: executeListInquiries,
  list_quotes: executeListQuotes,
  get_analytics_overview: executeGetAnalyticsOverview,
  get_revenue_summary: executeGetRevenueSummary,
  get_stale_inquiries: executeGetStaleInquiries,
  get_expiring_quotes: executeGetExpiringQuotes,
  get_customer_history: executeGetCustomerHistory,
  get_service_categories: executeGetServiceCategories,
  get_pricing_library: executeGetPricingLibrary,
  get_inquiry_notes: executeGetInquiryNotes,
};

/**
 * Execute a single tool call and return the result.
 * All tools are read-only and scoped to the business.
 */
export async function executeToolCall(
  ctx: AiToolExecutionContext,
  toolCall: AiToolCall,
): Promise<AiToolResult> {
  const executor = TOOL_EXECUTORS[toolCall.tool];

  if (!executor) {
    return {
      tool: toolCall.tool,
      result: `Unknown tool: "${toolCall.tool}"`,
      error: true,
    };
  }

  try {
    const result = await executor(ctx, toolCall.args);
    return { tool: toolCall.tool, result };
  } catch (error) {
    console.error(`[ai-tools] Tool "${toolCall.tool}" failed:`, error);
    return {
      tool: toolCall.tool,
      result: "Tool execution failed. Try a different approach.",
      error: true,
    };
  }
}

/**
 * Execute multiple tool calls in parallel.
 */
export async function executeToolCalls(
  ctx: AiToolExecutionContext,
  toolCalls: AiToolCall[],
): Promise<AiToolResult[]> {
  return Promise.all(toolCalls.map((call) => executeToolCall(ctx, call)));
}
