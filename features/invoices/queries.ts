import "server-only";

import { and, asc, desc, eq, ilike, isNull, or, sql } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { cache } from "react";

import { db } from "@/lib/db/client";
import { invoiceLineItems, invoices, payments, user } from "@/lib/db/schema";
import type { InvoiceDetail, InvoiceListFilters, InvoiceListItem, PaymentView } from "@/features/invoices/types";
import type { InvoiceStatus } from "@/lib/db/schema/invoices";
import { calculateInvoicePaymentState } from "@/features/invoices/utils";
import { getBusinessInvoiceDetailCacheTags, getBusinessInvoiceListCacheTags, hotBusinessCacheLife } from "@/lib/cache/business-tags";

const paidAmountSql = (invoiceIdColumn = invoices.id) => sql<number>`coalesce((select sum(${payments.amountInCents}) from ${payments} where ${payments.invoiceId} = ${invoiceIdColumn} and ${payments.businessId} = ${invoices.businessId} and ${payments.voidedAt} is null), 0)`;

export const effectiveInvoiceStatusSql = sql<InvoiceStatus>`case
  when ${invoices.status} = 'draft' then 'draft'::invoice_status
  when ${invoices.status} = 'voided' then 'voided'::invoice_status
  when ${paidAmountSql()} >= ${invoices.totalInCents} then 'paid'::invoice_status
  when ${invoices.dueDate} < current_date then 'overdue'::invoice_status
  when ${paidAmountSql()} > 0 then 'partially_paid'::invoice_status
  else 'unpaid'::invoice_status
end`;

function mapListRow(row: { id: string; invoiceNumber: string; title: string; customerName: string; customerEmail: string | null; currency: string; issueDate: string; dueDate: string; totalInCents: number; paidInCents: number; status: InvoiceStatus }): InvoiceListItem {
  const state = calculateInvoicePaymentState({ totalInCents: row.totalInCents, paidInCents: row.paidInCents, dueDate: row.dueDate, lifecycleStatus: row.status });
  return { ...row, ...state };
}

export async function getInvoiceListForBusiness({ businessId, filters, page = 1, pageSize = 20 }: { businessId: string; filters: InvoiceListFilters; page?: number; pageSize?: number }) {
  return getCachedInvoiceList({ businessId, filters, page, pageSize });
}

export async function getInvoiceListPageForBusiness({ businessId, filters, page = 1, pageSize = 20 }: { businessId: string; filters: Omit<InvoiceListFilters, "page">; page?: number; pageSize?: number }) {
  return getInvoiceListForBusiness({ businessId, filters: { ...filters, page }, page, pageSize });
}

export async function getInvoiceListCountForBusiness({ businessId, filters }: { businessId: string; filters: Omit<InvoiceListFilters, "page"> }) {
  return getInvoiceCountForBusiness({ businessId, filters: { ...filters, page: 1 } });
}

function buildInvoiceListConditions(businessId: string, filters: InvoiceListFilters) {
  const conditions = [eq(invoices.businessId, businessId), isNull(invoices.deletedAt)];
  if (filters.q) {
    const pattern = `%${filters.q}%`;
    conditions.push(or(ilike(invoices.invoiceNumber, pattern), ilike(invoices.title, pattern), ilike(invoices.customerName, pattern), ilike(invoices.customerEmail, pattern))!);
  }
  if (filters.status !== "all") {
    conditions.push(sql`${effectiveInvoiceStatusSql} = ${filters.status}::invoice_status`);
  }
  return conditions;
}

async function getCachedInvoiceList({ businessId, filters, page, pageSize }: { businessId: string; filters: InvoiceListFilters; page: number; pageSize: number }) {
  "use cache";
  cacheLife(hotBusinessCacheLife);
  cacheTag(...getBusinessInvoiceListCacheTags(businessId));
  const paid = paidAmountSql();
  const conditions = buildInvoiceListConditions(businessId, filters);
  const orderBy = filters.sort === "oldest" ? asc(invoices.createdAt) : desc(invoices.createdAt);
  const rows = await db.select({
    id: invoices.id,
    invoiceNumber: invoices.invoiceNumber,
    title: invoices.title,
    customerName: invoices.customerName,
    customerEmail: invoices.customerEmail,
    currency: invoices.currency,
    issueDate: invoices.issueDate,
    dueDate: invoices.dueDate,
    totalInCents: invoices.totalInCents,
    paidInCents: paid,
    status: invoices.status,
  }).from(invoices).where(and(...conditions)).orderBy(orderBy).limit(pageSize).offset(Math.max(0, (page - 1) * pageSize));
  return rows.map((row) => mapListRow({ ...row, paidInCents: Number(row.paidInCents ?? 0) }));
}

export async function getInvoiceForBusiness({ businessId, invoiceId }: { businessId: string; invoiceId: string }): Promise<InvoiceDetail | null> {
  return getCachedInvoice({ businessId, invoiceId });
}

export type LinkedInvoiceSummary = {
  id: string;
  invoiceNumber: string;
  status: InvoiceStatus;
};

export async function getInvoiceIdByQuoteId({
  businessId,
  quoteId,
}: {
  businessId: string;
  quoteId: string;
}): Promise<LinkedInvoiceSummary | null> {
  return getCachedInvoiceByQuote({ businessId, quoteId });
}

const getCachedInvoiceByQuote = cache(
  async ({ businessId, quoteId }: { businessId: string; quoteId: string }) => {
    "use cache";
    cacheLife(hotBusinessCacheLife);
    cacheTag(...getBusinessInvoiceListCacheTags(businessId));
    const [row] = await db
      .select({ id: invoices.id, invoiceNumber: invoices.invoiceNumber, status: invoices.status })
      .from(invoices)
      .where(
        and(
          eq(invoices.businessId, businessId),
          eq(invoices.quoteId, quoteId),
          isNull(invoices.deletedAt),
          sql`${invoices.status} <> 'voided'`,
        ),
      )
      .orderBy(desc(invoices.createdAt))
      .limit(1);
    return (row ?? null) as LinkedInvoiceSummary | null;
  },
);

const getCachedInvoice = cache(async ({ businessId, invoiceId }: { businessId: string; invoiceId: string }) => {
  "use cache";
  cacheLife(hotBusinessCacheLife);
  cacheTag(...getBusinessInvoiceDetailCacheTags(businessId, invoiceId));
  const [row] = await db.select({
    id: invoices.id,
    invoiceNumber: invoices.invoiceNumber,
    title: invoices.title,
    customerName: invoices.customerName,
    customerEmail: invoices.customerEmail,
    customerContactMethod: invoices.customerContactMethod,
    customerContactHandle: invoices.customerContactHandle,
    currency: invoices.currency,
    issueDate: invoices.issueDate,
    dueDate: invoices.dueDate,
    totalInCents: invoices.totalInCents,
    status: invoices.status,
    quoteId: invoices.quoteId,
    notes: invoices.notes,
    paymentTerms: invoices.paymentTerms,
    subtotalInCents: invoices.subtotalInCents,
    discountInCents: invoices.discountInCents,
    taxInCents: invoices.taxInCents,
    taxLabel: invoices.taxLabel,
    sentAt: invoices.sentAt,
    voidedAt: invoices.voidedAt,
    paidInCents: paidAmountSql(),
  }).from(invoices).where(and(eq(invoices.id, invoiceId), eq(invoices.businessId, businessId), isNull(invoices.deletedAt))).limit(1);
  if (!row) return null;
  const [items, paymentRows] = await Promise.all([
    db.select({ id: invoiceLineItems.id, description: invoiceLineItems.description, quantity: invoiceLineItems.quantity, unitPriceInCents: invoiceLineItems.unitPriceInCents, lineTotalInCents: invoiceLineItems.lineTotalInCents, position: invoiceLineItems.position }).from(invoiceLineItems).where(and(eq(invoiceLineItems.invoiceId, invoiceId), eq(invoiceLineItems.businessId, businessId))).orderBy(invoiceLineItems.position),
    db.select({ id: payments.id, amountInCents: payments.amountInCents, paymentDate: payments.paymentDate, method: payments.method, reference: payments.reference, notes: payments.notes, createdAt: payments.createdAt, voidedAt: payments.voidedAt, createdByName: user.name }).from(payments).leftJoin(user, eq(payments.createdBy, user.id)).where(and(eq(payments.invoiceId, invoiceId), eq(payments.businessId, businessId))).orderBy(desc(payments.paymentDate), desc(payments.createdAt)),
  ]);
  const state = calculateInvoicePaymentState({ totalInCents: row.totalInCents, paidInCents: Number(row.paidInCents ?? 0), dueDate: row.dueDate, lifecycleStatus: row.status });
  return { ...row, paidInCents: state.paidInCents, balanceInCents: state.balanceInCents, status: state.status, items, payments: paymentRows as PaymentView[] };
});

export type InvoiceOverviewItem = {
  id: string;
  invoiceNumber: string;
  title: string;
  customerName: string;
  currency: string;
  dueDate: string;
  totalInCents: number;
  paidInCents: number;
  balanceInCents: number;
  status: InvoiceStatus;
};

export type InvoiceOverviewData = {
  overdue: InvoiceOverviewItem[];
  dueSoon: InvoiceOverviewItem[];
  counts: {
    overdue: number;
    dueSoon: number;
    outstanding: number;
    draft: number;
  };
  outstandingInCents: number;
  outstandingCount: number;
  currency: string | null;
};

export async function getInvoiceOverviewForBusiness({
  businessId,
}: {
  businessId: string;
}): Promise<InvoiceOverviewData> {
  return getCachedInvoiceOverview({ businessId });
}

async function getCachedInvoiceOverview({ businessId }: { businessId: string }): Promise<InvoiceOverviewData> {
  "use cache";
  cacheLife(hotBusinessCacheLife);
  cacheTag(...getBusinessInvoiceListCacheTags(businessId));
  const paid = paidAmountSql();
  const baseConditions = [eq(invoices.businessId, businessId), isNull(invoices.deletedAt)];
  const [overdueRows, dueSoonRows, outstandingRows, draftRows, overdueCountRows, dueSoonCountRows] = await Promise.all([
    db
      .select({
        id: invoices.id,
        invoiceNumber: invoices.invoiceNumber,
        title: invoices.title,
        customerName: invoices.customerName,
        currency: invoices.currency,
        dueDate: invoices.dueDate,
        totalInCents: invoices.totalInCents,
        paidInCents: paid,
        status: invoices.status,
      })
      .from(invoices)
      .where(and(...baseConditions, sql`${effectiveInvoiceStatusSql} = 'overdue'::invoice_status`))
      .orderBy(invoices.dueDate)
      .limit(4),
    db
      .select({
        id: invoices.id,
        invoiceNumber: invoices.invoiceNumber,
        title: invoices.title,
        customerName: invoices.customerName,
        currency: invoices.currency,
        dueDate: invoices.dueDate,
        totalInCents: invoices.totalInCents,
        paidInCents: paid,
        status: invoices.status,
      })
      .from(invoices)
      .where(
        and(
          ...baseConditions,
          sql`${effectiveInvoiceStatusSql} in ('unpaid'::invoice_status, 'partially_paid'::invoice_status)`,
          sql`${invoices.dueDate} <= (current_date + 7)`,
        ),
      )
      .orderBy(invoices.dueDate)
      .limit(4),
    db
      .select({
        total: sql<number>`coalesce(sum(${invoices.totalInCents} - ${paid}), 0)`,
        value: sql<number>`count(*)`,
        currency: sql<string | null>`max(${invoices.currency})`,
      })
      .from(invoices)
      .where(
        and(...baseConditions, sql`${effectiveInvoiceStatusSql} in ('unpaid'::invoice_status, 'partially_paid'::invoice_status, 'overdue'::invoice_status)`),
      ),
    db
      .select({ value: sql<number>`count(*)` })
      .from(invoices)
      .where(and(...baseConditions, eq(invoices.status, "draft"))),
    db
      .select({ value: sql<number>`count(*)` })
      .from(invoices)
      .where(and(...baseConditions, sql`${effectiveInvoiceStatusSql} = 'overdue'::invoice_status`)),
    db
      .select({ value: sql<number>`count(*)` })
      .from(invoices)
      .where(
        and(
          ...baseConditions,
          sql`${effectiveInvoiceStatusSql} in ('unpaid'::invoice_status, 'partially_paid'::invoice_status)`,
          sql`${invoices.dueDate} <= (current_date + 7)`,
        ),
      ),
  ]);

  const mapOverviewRow = (row: {
    id: string;
    invoiceNumber: string;
    title: string;
    customerName: string;
    currency: string;
    dueDate: string;
    totalInCents: number;
    paidInCents: number | string;
    status: InvoiceStatus;
  }): InvoiceOverviewItem => {
    const state = calculateInvoicePaymentState({
      totalInCents: row.totalInCents,
      paidInCents: Number(row.paidInCents ?? 0),
      dueDate: row.dueDate,
      lifecycleStatus: row.status,
    });
    return {
      id: row.id,
      invoiceNumber: row.invoiceNumber,
      title: row.title,
      customerName: row.customerName,
      currency: row.currency,
      dueDate: row.dueDate,
      totalInCents: row.totalInCents,
      paidInCents: state.paidInCents,
      balanceInCents: state.balanceInCents,
      status: state.status,
    };
  };

  return {
    overdue: overdueRows.map(mapOverviewRow),
    dueSoon: dueSoonRows.map(mapOverviewRow),
    counts: {
      overdue: Number(overdueCountRows[0]?.value ?? 0),
      dueSoon: Number(dueSoonCountRows[0]?.value ?? 0),
      outstanding: Number(outstandingRows[0]?.value ?? 0),
      draft: Number(draftRows[0]?.value ?? 0),
    },
    outstandingInCents: Number(outstandingRows[0]?.total ?? 0),
    outstandingCount: Number(outstandingRows[0]?.value ?? 0),
    currency: outstandingRows[0]?.currency ?? overdueRows[0]?.currency ?? dueSoonRows[0]?.currency ?? null,
  };
}

export type InvoiceExportRow = {
  invoiceNumber: string;
  title: string;
  customerName: string;
  customerEmail: string | null;
  status: InvoiceStatus;
  quoteId: string | null;
  issueDate: string;
  dueDate: string;
  totalInCents: number;
  paidInCents: number;
  currency: string;
  sentAt: Date | null;
  createdAt: Date;
};

export async function getInvoiceExportRowsForBusiness({
  businessId,
  filters,
}: {
  businessId: string;
  filters: InvoiceListFilters;
}): Promise<InvoiceExportRow[]> {
  const paid = paidAmountSql();
  const conditions = buildInvoiceListConditions(businessId, filters);
  const orderBy = filters.sort === "oldest" ? asc(invoices.createdAt) : desc(invoices.createdAt);
  const rows = await db
    .select({
      invoiceNumber: invoices.invoiceNumber,
      title: invoices.title,
      customerName: invoices.customerName,
      customerEmail: invoices.customerEmail,
      status: invoices.status,
      quoteId: invoices.quoteId,
      issueDate: invoices.issueDate,
      dueDate: invoices.dueDate,
      totalInCents: invoices.totalInCents,
      paidInCents: paid,
      currency: invoices.currency,
      sentAt: invoices.sentAt,
      createdAt: invoices.createdAt,
    })
    .from(invoices)
    .where(and(...conditions))
    .orderBy(orderBy)
    .limit(5000);
  return rows.map((row) => ({ ...row, paidInCents: Number(row.paidInCents ?? 0) }));
}

export async function getInvoiceCountForBusiness({ businessId, filters }: { businessId: string; filters: InvoiceListFilters }) {
  "use cache";
  cacheLife(hotBusinessCacheLife);
  cacheTag(...getBusinessInvoiceListCacheTags(businessId));
  const conditions = buildInvoiceListConditions(businessId, filters);
  const [row] = await db.select({ value: sql<number>`count(*)` }).from(invoices).where(and(...conditions));
  return Number(row?.value ?? 0);
}
