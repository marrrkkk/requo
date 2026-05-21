import "server-only";

import { and, count, desc, eq, ilike, isNull, or, sql, asc } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { invoiceItems, invoices, jobs, quotes, businesses } from "@/lib/db/schema";
import type {
  DashboardInvoiceDetail,
  DashboardInvoiceListItem,
  InvoiceListFilters,
  InvoiceStatus,
} from "@/features/invoices/types";

const PAGE_SIZE = 50;

export async function getInvoicesForBusiness(
  businessId: string,
  filters: InvoiceListFilters,
): Promise<{ items: DashboardInvoiceListItem[]; totalCount: number }> {
  const conditions = [eq(invoices.businessId, businessId)];

  if (filters.view === "archived") {
    conditions.push(sql`${invoices.archivedAt} is not null`);
    conditions.push(isNull(invoices.deletedAt));
  } else {
    conditions.push(isNull(invoices.archivedAt));
    conditions.push(isNull(invoices.deletedAt));
  }

  if (filters.status !== "all") {
    conditions.push(eq(invoices.status, filters.status as InvoiceStatus));
  }

  if (filters.q) {
    const searchTerm = `%${filters.q}%`;
    conditions.push(
      or(
        ilike(invoices.title, searchTerm),
        ilike(invoices.customerName, searchTerm),
        ilike(invoices.invoiceNumber, searchTerm),
      )!,
    );
  }

  const whereClause = and(...conditions);

  const [totalCount, rows] = await Promise.all([
    db
      .select({ count: count() })
      .from(invoices)
      .where(whereClause)
      .then((r) => r[0]?.count ?? 0),
    db
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
        archivedAt: invoices.archivedAt,
        createdAt: invoices.createdAt,
      })
      .from(invoices)
      .where(whereClause)
      .orderBy(
        filters.sort === "oldest"
          ? asc(invoices.createdAt)
          : desc(invoices.createdAt),
      )
      .limit(PAGE_SIZE)
      .offset((filters.page - 1) * PAGE_SIZE),
  ]);

  return { items: rows, totalCount };
}

export async function getInvoiceDetailForBusiness(
  businessId: string,
  invoiceId: string,
): Promise<DashboardInvoiceDetail | null> {
  const [invoice] = await db
    .select({
      id: invoices.id,
      businessId: invoices.businessId,
      jobId: invoices.jobId,
      quoteId: invoices.quoteId,
      invoiceNumber: invoices.invoiceNumber,
      title: invoices.title,
      customerName: invoices.customerName,
      customerEmail: invoices.customerEmail,
      customerContactMethod: invoices.customerContactMethod,
      customerContactHandle: invoices.customerContactHandle,
      status: invoices.status,
      currency: invoices.currency,
      notes: invoices.notes,
      terms: invoices.terms,
      subtotalInCents: invoices.subtotalInCents,
      discountInCents: invoices.discountInCents,
      taxInCents: invoices.taxInCents,
      taxLabel: invoices.taxLabel,
      totalInCents: invoices.totalInCents,
      issuedAt: invoices.issuedAt,
      dueAt: invoices.dueAt,
      sentAt: invoices.sentAt,
      viewedAt: invoices.viewedAt,
      paidAt: invoices.paidAt,
      voidedAt: invoices.voidedAt,
      archivedAt: invoices.archivedAt,
      createdAt: invoices.createdAt,
      updatedAt: invoices.updatedAt,
      businessName: businesses.name,
      businessSlug: businesses.slug,
      businessLogoStoragePath: businesses.logoStoragePath,
      businessContactEmail: businesses.contactEmail,
    })
    .from(invoices)
    .innerJoin(businesses, eq(invoices.businessId, businesses.id))
    .where(
      and(
        eq(invoices.id, invoiceId),
        eq(invoices.businessId, businessId),
        isNull(invoices.deletedAt),
      ),
    )
    .limit(1);

  if (!invoice) return null;

  const items = await db
    .select({
      id: invoiceItems.id,
      description: invoiceItems.description,
      quantity: invoiceItems.quantity,
      unitPriceInCents: invoiceItems.unitPriceInCents,
      lineTotalInCents: invoiceItems.lineTotalInCents,
      position: invoiceItems.position,
    })
    .from(invoiceItems)
    .where(eq(invoiceItems.invoiceId, invoiceId))
    .orderBy(asc(invoiceItems.position));

  // Get linked info
  let linkedQuoteNumber: string | null = null;
  let linkedJobTitle: string | null = null;

  if (invoice.quoteId) {
    const [q] = await db
      .select({ quoteNumber: quotes.quoteNumber })
      .from(quotes)
      .where(eq(quotes.id, invoice.quoteId))
      .limit(1);
    linkedQuoteNumber = q?.quoteNumber ?? null;
  }

  if (invoice.jobId) {
    const [j] = await db
      .select({ title: jobs.title })
      .from(jobs)
      .where(eq(jobs.id, invoice.jobId))
      .limit(1);
    linkedJobTitle = j?.title ?? null;
  }

  return { ...invoice, items, linkedQuoteNumber, linkedJobTitle };
}
