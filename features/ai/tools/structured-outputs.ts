import "server-only";

import { and, count, desc, eq, isNull } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { inquiries, quotes, quoteItems } from "@/lib/db/schema";
import type { InquiryStatus } from "@/features/inquiries/types";
import type { QuoteStatus } from "@/features/quotes/types";
import { formatQuoteMoney } from "@/features/quotes/utils";
import {
  getBusinessInquiryPath,
  getBusinessQuotePath,
} from "@/features/businesses/routes";
import type { AiToolExecutionContext } from "./types";
import type {
  InquiryListItem,
  QuoteListItem,
  InquiryDetail,
  QuoteDetail,
  StructuredToolOutput,
} from "@/features/ai/chat-ui/chat-data-cards";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(date: Date | string | null): string {
  if (!date) return "N/A";
  const d = date instanceof Date ? date : new Date(date);
  return d.toISOString().split("T")[0];
}

function clampLimit(val: unknown, max = 25, defaultVal = 10): number {
  const n = typeof val === "number" ? val : defaultVal;
  return Math.min(Math.max(n, 1), max);
}

function clampOffset(val: unknown): number {
  const n = typeof val === "number" ? val : 0;
  return Math.max(n, 0);
}

// ---------------------------------------------------------------------------
// Structured tool output type (text for model + structured data for client)
// ---------------------------------------------------------------------------

export type StructuredToolResult = {
  /** Text summary for the model to reason about */
  text: string;
  /** Structured data for client-side rendering */
  structured: StructuredToolOutput;
};

// ---------------------------------------------------------------------------
// list_inquiries
// ---------------------------------------------------------------------------

export async function listInquiriesStructured(
  ctx: AiToolExecutionContext,
  args: { status?: string | null; limit?: number | null; offset?: number | null },
): Promise<StructuredToolResult | string> {
  const statusFilter = typeof args.status === "string" ? args.status : null;
  const limit = clampLimit(args.limit);
  const offset = clampOffset(args.offset);

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
      status: inquiries.status,
      submittedAt: inquiries.submittedAt,
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

  const items: InquiryListItem[] = rows.map((r) => ({
    id: r.id,
    customerName: r.customerName,
    serviceCategory: r.serviceCategory,
    status: r.status,
    submittedAt: formatDate(r.submittedAt),
    url: getBusinessInquiryPath(ctx.businessSlug, r.id),
  }));

  const text = `Found ${totalCount} inquiries (showing ${offset + 1}–${offset + rows.length}):\n` +
    items.map((i) => `- ${i.customerName} — ${i.serviceCategory} [${i.status}] — ${i.submittedAt} — url: ${i.url}`).join("\n");

  return {
    text,
    structured: { _type: "inquiry_list", items },
  };
}

// ---------------------------------------------------------------------------
// list_quotes
// ---------------------------------------------------------------------------

export async function listQuotesStructured(
  ctx: AiToolExecutionContext,
  args: { status?: string | null; limit?: number | null; offset?: number | null },
): Promise<StructuredToolResult | string> {
  const statusFilter = typeof args.status === "string" ? args.status : null;
  const limit = clampLimit(args.limit);
  const offset = clampOffset(args.offset);

  // Get the business currency
  const [biz] = await db
    .select({ defaultCurrency: (await import("@/lib/db/schema")).businesses.defaultCurrency })
    .from((await import("@/lib/db/schema")).businesses)
    .where(eq((await import("@/lib/db/schema")).businesses.id, ctx.businessId))
    .limit(1);
  const currency = biz?.defaultCurrency ?? "USD";

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
      totalInCents: quotes.totalInCents,
      status: quotes.status,
      createdAt: quotes.createdAt,
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

  const items: QuoteListItem[] = rows.map((r) => ({
    id: r.id,
    quoteNumber: r.quoteNumber,
    title: r.title,
    customerName: r.customerName,
    total: formatQuoteMoney(r.totalInCents, currency),
    status: r.status,
    url: getBusinessQuotePath(ctx.businessSlug, r.id),
  }));

  const text = `Found ${totalCount} quotes (showing ${offset + 1}–${offset + rows.length}):\n` +
    items.map((i) => `- ${i.quoteNumber} "${i.title}" for ${i.customerName} — ${i.total} [${i.status}] — url: ${i.url}`).join("\n");

  return {
    text,
    structured: { _type: "quote_list", items },
  };
}

// ---------------------------------------------------------------------------
// get_inquiry_details
// ---------------------------------------------------------------------------

export async function getInquiryDetailsStructured(
  ctx: AiToolExecutionContext,
  args: { inquiry_id: string },
): Promise<StructuredToolResult | string> {
  const inquiryId = args.inquiry_id?.trim();
  if (!inquiryId) return "Error: inquiry_id is required.";

  const [inq] = await db
    .select({
      id: inquiries.id,
      customerName: inquiries.customerName,
      customerEmail: inquiries.customerEmail,
      customerContactMethod: inquiries.customerContactMethod,
      customerContactHandle: inquiries.customerContactHandle,
      serviceCategory: inquiries.serviceCategory,
      status: inquiries.status,
      submittedAt: inquiries.submittedAt,
      budgetText: inquiries.budgetText,
      subject: inquiries.subject,
      details: inquiries.details,
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

  if (!inq) return `Inquiry "${inquiryId}" not found.`;

  const data: InquiryDetail = {
    id: inq.id,
    customerName: inq.customerName,
    customerEmail: inq.customerEmail,
    customerContact: `${inq.customerContactMethod} ${inq.customerContactHandle}`,
    serviceCategory: inq.serviceCategory,
    status: inq.status,
    submittedAt: formatDate(inq.submittedAt),
    budget: inq.budgetText,
    subject: inq.subject,
    url: getBusinessInquiryPath(ctx.businessSlug, inq.id),
  };

  const text = [
    `Inquiry: ${inq.customerName}`,
    `- Status: ${inq.status}`,
    `- Service: ${inq.serviceCategory}`,
    `- Email: ${inq.customerEmail ?? "N/A"}`,
    `- Contact: ${inq.customerContactMethod} ${inq.customerContactHandle}`,
    `- Submitted: ${formatDate(inq.submittedAt)}`,
    inq.budgetText ? `- Budget: ${inq.budgetText}` : null,
    inq.subject ? `- Subject: ${inq.subject}` : null,
    `- URL: ${data.url}`,
  ].filter(Boolean).join("\n");

  return {
    text,
    structured: { _type: "inquiry_detail", data },
  };
}

// ---------------------------------------------------------------------------
// get_quote_details
// ---------------------------------------------------------------------------

export async function getQuoteDetailsStructured(
  ctx: AiToolExecutionContext,
  args: { quote_id: string },
): Promise<StructuredToolResult | string> {
  const quoteId = args.quote_id?.trim();
  if (!quoteId) return "Error: quote_id is required.";

  // Support lookup by quote number (Q-XXXX) or ID
  const isQuoteNumber = quoteId.match(/^Q-\d+$/i);
  const whereCondition = isQuoteNumber
    ? eq(quotes.quoteNumber, quoteId.toUpperCase())
    : eq(quotes.id, quoteId);

  const [q] = await db
    .select({
      id: quotes.id,
      quoteNumber: quotes.quoteNumber,
      title: quotes.title,
      customerName: quotes.customerName,
      customerEmail: quotes.customerEmail,
      totalInCents: quotes.totalInCents,
      currency: quotes.currency,
      status: quotes.status,
      validUntil: quotes.validUntil,
      sentAt: quotes.sentAt,
    })
    .from(quotes)
    .where(
      and(
        whereCondition,
        eq(quotes.businessId, ctx.businessId),
        isNull(quotes.deletedAt),
      ),
    )
    .limit(1);

  if (!q) return `Quote "${quoteId}" not found.`;

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

  const data: QuoteDetail = {
    id: q.id,
    quoteNumber: q.quoteNumber,
    title: q.title,
    customerName: q.customerName,
    customerEmail: q.customerEmail,
    total: formatQuoteMoney(q.totalInCents, q.currency),
    status: q.status,
    validUntil: q.validUntil,
    sentAt: q.sentAt ? formatDate(q.sentAt) : null,
    url: getBusinessQuotePath(ctx.businessSlug, q.id),
    items: items.map((i) => ({
      description: i.description,
      quantity: i.quantity,
      unitPrice: formatQuoteMoney(i.unitPriceInCents, q.currency),
      lineTotal: formatQuoteMoney(i.lineTotalInCents, q.currency),
    })),
  };

  const text = [
    `Quote: ${q.quoteNumber} — "${q.title}"`,
    `- Customer: ${q.customerName}`,
    `- Total: ${data.total}`,
    `- Status: ${q.status}`,
    `- Valid until: ${q.validUntil}`,
    `- Sent: ${data.sentAt ?? "Not sent"}`,
    `- URL: ${data.url}`,
    `- Items: ${items.length}`,
  ].join("\n");

  return {
    text,
    structured: { _type: "quote_detail", data },
  };
}


// ---------------------------------------------------------------------------
// list_jobs
// ---------------------------------------------------------------------------

export async function listJobsStructured(
  ctx: AiToolExecutionContext,
  args: { status?: string | null; limit?: number | null; offset?: number | null },
): Promise<StructuredToolResult | string> {
  const { jobs, jobItems } = await import("@/lib/db/schema");
  const { getBusinessJobPath } = await import("@/features/businesses/routes");
  type JobStatus = "todo" | "in_progress" | "done";

  const statusFilter = typeof args.status === "string" ? args.status : null;
  const limit = clampLimit(args.limit);
  const offset = clampOffset(args.offset);

  const [biz] = await db
    .select({ defaultCurrency: (await import("@/lib/db/schema")).businesses.defaultCurrency })
    .from((await import("@/lib/db/schema")).businesses)
    .where(eq((await import("@/lib/db/schema")).businesses.id, ctx.businessId))
    .limit(1);
  const currency = biz?.defaultCurrency ?? "USD";

  const countRows = await db
    .select({ count: count() })
    .from(jobs)
    .where(
      and(
        eq(jobs.businessId, ctx.businessId),
        isNull(jobs.deletedAt),
        statusFilter ? eq(jobs.status, statusFilter as JobStatus) : undefined,
      ),
    );
  const totalCount = countRows[0]?.count ?? 0;

  const rows = await db
    .select({
      id: jobs.id,
      title: jobs.title,
      customerName: jobs.customerName,
      status: jobs.status,
      totalInCents: jobs.totalInCents,
      createdAt: jobs.createdAt,
    })
    .from(jobs)
    .where(
      and(
        eq(jobs.businessId, ctx.businessId),
        isNull(jobs.deletedAt),
        statusFilter ? eq(jobs.status, statusFilter as JobStatus) : undefined,
      ),
    )
    .orderBy(desc(jobs.createdAt))
    .limit(limit)
    .offset(offset);

  if (!rows.length) return `No jobs found${statusFilter ? ` with status "${statusFilter}"` : ""}.`;

  // Get item counts per job
  const jobIds = rows.map((r) => r.id);
  const itemCounts = await db
    .select({
      jobId: jobItems.jobId,
      total: count(),
    })
    .from(jobItems)
    .where(
      and(
        eq(jobItems.businessId, ctx.businessId),
        ...jobIds.map((id) => eq(jobItems.jobId, id)),
      ),
    )
    .groupBy(jobItems.jobId);

  const itemCountMap = new Map(itemCounts.map((ic) => [ic.jobId, ic.total]));

  const items: import("@/features/ai/chat-ui/chat-data-cards").JobListItem[] = rows.map((r) => ({
    id: r.id,
    title: r.title,
    customerName: r.customerName,
    status: r.status,
    total: formatQuoteMoney(r.totalInCents, currency),
    progress: `${itemCountMap.get(r.id) ?? 0} items`,
    createdAt: formatDate(r.createdAt),
    url: getBusinessJobPath(ctx.businessSlug, r.id),
  }));

  const text = `Found ${totalCount} jobs (showing ${offset + 1}–${offset + rows.length}):\n` +
    items.map((i) => `- ${i.title} for ${i.customerName} — ${i.total} [${i.status}] — url: ${i.url}`).join("\n");

  return {
    text,
    structured: { _type: "job_list", items },
  };
}

// ---------------------------------------------------------------------------
// get_job_details
// ---------------------------------------------------------------------------

export async function getJobDetailsStructured(
  ctx: AiToolExecutionContext,
  args: { job_id: string },
): Promise<StructuredToolResult | string> {
  const { jobs, jobItems, quotes: quotesTable } = await import("@/lib/db/schema");
  const { getBusinessJobPath } = await import("@/features/businesses/routes");

  const jobId = args.job_id?.trim();
  if (!jobId) return "Error: job_id is required.";

  const [job] = await db
    .select({
      id: jobs.id,
      title: jobs.title,
      customerName: jobs.customerName,
      customerEmail: jobs.customerEmail,
      status: jobs.status,
      currency: jobs.currency,
      totalInCents: jobs.totalInCents,
      quoteId: jobs.quoteId,
      startedAt: jobs.startedAt,
      completedAt: jobs.completedAt,
    })
    .from(jobs)
    .where(
      and(
        eq(jobs.id, jobId),
        eq(jobs.businessId, ctx.businessId),
        isNull(jobs.deletedAt),
      ),
    )
    .limit(1);

  if (!job) return `Job "${jobId}" not found.`;

  // Get quote number
  const [quote] = await db
    .select({ quoteNumber: quotesTable.quoteNumber })
    .from(quotesTable)
    .where(eq(quotesTable.id, job.quoteId))
    .limit(1);

  const items = await db
    .select({
      description: jobItems.description,
      quantity: jobItems.quantity,
      unitPriceInCents: jobItems.unitPriceInCents,
      lineTotalInCents: jobItems.lineTotalInCents,
      completedAt: jobItems.completedAt,
    })
    .from(jobItems)
    .where(eq(jobItems.jobId, job.id))
    .orderBy(jobItems.position);

  const data: import("@/features/ai/chat-ui/chat-data-cards").JobDetail = {
    id: job.id,
    title: job.title,
    customerName: job.customerName,
    customerEmail: job.customerEmail,
    status: job.status,
    total: formatQuoteMoney(job.totalInCents, job.currency),
    quoteNumber: quote?.quoteNumber ?? "N/A",
    startedAt: job.startedAt ? formatDate(job.startedAt) : null,
    completedAt: job.completedAt ? formatDate(job.completedAt) : null,
    url: getBusinessJobPath(ctx.businessSlug, job.id),
    items: items.map((i) => ({
      description: i.description,
      quantity: i.quantity,
      unitPrice: formatQuoteMoney(i.unitPriceInCents, job.currency),
      lineTotal: formatQuoteMoney(i.lineTotalInCents, job.currency),
      completed: !!i.completedAt,
    })),
  };

  const text = [
    `Job: ${job.title}`,
    `- Customer: ${job.customerName}`,
    `- Status: ${job.status}`,
    `- Total: ${data.total}`,
    `- Quote: ${data.quoteNumber}`,
    `- Started: ${data.startedAt ?? "Not started"}`,
    `- Completed: ${data.completedAt ?? "In progress"}`,
    `- URL: ${data.url}`,
    `- Items: ${items.length}`,
  ].join("\n");

  return { text, structured: { _type: "job_detail", data } };
}

// ---------------------------------------------------------------------------
// list_invoices
// ---------------------------------------------------------------------------

export async function listInvoicesStructured(
  ctx: AiToolExecutionContext,
  args: { status?: string | null; limit?: number | null; offset?: number | null },
): Promise<StructuredToolResult | string> {
  const { invoices } = await import("@/lib/db/schema");
  const { getBusinessInvoicePath } = await import("@/features/businesses/routes");
  type InvoiceStatus = "draft" | "sent" | "viewed" | "paid" | "overdue" | "voided";

  const statusFilter = typeof args.status === "string" ? args.status : null;
  const limit = clampLimit(args.limit);
  const offset = clampOffset(args.offset);

  const [biz] = await db
    .select({ defaultCurrency: (await import("@/lib/db/schema")).businesses.defaultCurrency })
    .from((await import("@/lib/db/schema")).businesses)
    .where(eq((await import("@/lib/db/schema")).businesses.id, ctx.businessId))
    .limit(1);
  const currency = biz?.defaultCurrency ?? "USD";

  const countRows = await db
    .select({ count: count() })
    .from(invoices)
    .where(
      and(
        eq(invoices.businessId, ctx.businessId),
        isNull(invoices.deletedAt),
        statusFilter ? eq(invoices.status, statusFilter as InvoiceStatus) : undefined,
      ),
    );
  const totalCount = countRows[0]?.count ?? 0;

  const rows = await db
    .select({
      id: invoices.id,
      invoiceNumber: invoices.invoiceNumber,
      title: invoices.title,
      customerName: invoices.customerName,
      totalInCents: invoices.totalInCents,
      status: invoices.status,
      dueAt: invoices.dueAt,
    })
    .from(invoices)
    .where(
      and(
        eq(invoices.businessId, ctx.businessId),
        isNull(invoices.deletedAt),
        statusFilter ? eq(invoices.status, statusFilter as InvoiceStatus) : undefined,
      ),
    )
    .orderBy(desc(invoices.createdAt))
    .limit(limit)
    .offset(offset);

  if (!rows.length) return `No invoices found${statusFilter ? ` with status "${statusFilter}"` : ""}.`;

  const items: import("@/features/ai/chat-ui/chat-data-cards").InvoiceListItem[] = rows.map((r) => ({
    id: r.id,
    invoiceNumber: r.invoiceNumber,
    title: r.title,
    customerName: r.customerName,
    total: formatQuoteMoney(r.totalInCents, currency),
    status: r.status,
    dueAt: r.dueAt ? formatDate(r.dueAt) : null,
    url: getBusinessInvoicePath(ctx.businessSlug, r.id),
  }));

  const text = `Found ${totalCount} invoices (showing ${offset + 1}–${offset + rows.length}):\n` +
    items.map((i) => `- ${i.invoiceNumber} "${i.title}" for ${i.customerName} — ${i.total} [${i.status}] — url: ${i.url}`).join("\n");

  return { text, structured: { _type: "invoice_list", items } };
}

// ---------------------------------------------------------------------------
// get_invoice_details
// ---------------------------------------------------------------------------

export async function getInvoiceDetailsStructured(
  ctx: AiToolExecutionContext,
  args: { invoice_id: string },
): Promise<StructuredToolResult | string> {
  const { invoices, invoiceItems } = await import("@/lib/db/schema");
  const { getBusinessInvoicePath } = await import("@/features/businesses/routes");

  const invoiceId = args.invoice_id?.trim();
  if (!invoiceId) return "Error: invoice_id is required.";

  // Support lookup by invoice number (INV-XXXX) or ID
  const isInvoiceNumber = invoiceId.match(/^INV-\d+$/i);
  const whereCondition = isInvoiceNumber
    ? eq(invoices.invoiceNumber, invoiceId.toUpperCase())
    : eq(invoices.id, invoiceId);

  const [inv] = await db
    .select({
      id: invoices.id,
      invoiceNumber: invoices.invoiceNumber,
      title: invoices.title,
      customerName: invoices.customerName,
      customerEmail: invoices.customerEmail,
      status: invoices.status,
      currency: invoices.currency,
      totalInCents: invoices.totalInCents,
      issuedAt: invoices.issuedAt,
      dueAt: invoices.dueAt,
      sentAt: invoices.sentAt,
      paidAt: invoices.paidAt,
    })
    .from(invoices)
    .where(
      and(
        whereCondition,
        eq(invoices.businessId, ctx.businessId),
        isNull(invoices.deletedAt),
      ),
    )
    .limit(1);

  if (!inv) return `Invoice "${invoiceId}" not found.`;

  const items = await db
    .select({
      description: invoiceItems.description,
      quantity: invoiceItems.quantity,
      unitPriceInCents: invoiceItems.unitPriceInCents,
      lineTotalInCents: invoiceItems.lineTotalInCents,
    })
    .from(invoiceItems)
    .where(eq(invoiceItems.invoiceId, inv.id))
    .orderBy(invoiceItems.position);

  const data: import("@/features/ai/chat-ui/chat-data-cards").InvoiceDetail = {
    id: inv.id,
    invoiceNumber: inv.invoiceNumber,
    title: inv.title,
    customerName: inv.customerName,
    customerEmail: inv.customerEmail,
    status: inv.status,
    total: formatQuoteMoney(inv.totalInCents, inv.currency),
    issuedAt: inv.issuedAt ? formatDate(inv.issuedAt) : null,
    dueAt: inv.dueAt ? formatDate(inv.dueAt) : null,
    sentAt: inv.sentAt ? formatDate(inv.sentAt) : null,
    paidAt: inv.paidAt ? formatDate(inv.paidAt) : null,
    url: getBusinessInvoicePath(ctx.businessSlug, inv.id),
    items: items.map((i) => ({
      description: i.description,
      quantity: i.quantity,
      unitPrice: formatQuoteMoney(i.unitPriceInCents, inv.currency),
      lineTotal: formatQuoteMoney(i.lineTotalInCents, inv.currency),
    })),
  };

  const text = [
    `Invoice: ${inv.invoiceNumber} — "${inv.title}"`,
    `- Customer: ${inv.customerName}`,
    `- Total: ${data.total}`,
    `- Status: ${inv.status}`,
    `- Due: ${data.dueAt ?? "Not set"}`,
    `- Paid: ${data.paidAt ?? "Unpaid"}`,
    `- URL: ${data.url}`,
    `- Items: ${items.length}`,
  ].join("\n");

  return { text, structured: { _type: "invoice_detail", data } };
}
