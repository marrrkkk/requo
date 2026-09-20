import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ReceiptText } from "lucide-react";

import { DashboardPage, DashboardSection, DashboardTableContainer } from "@/components/shared/dashboard-layout";
import { PageHeader } from "@/components/shared/page-header";
import {
  DetailPageHeaderFallback,
  DetailSectionFallback,
} from "@/components/shared/detail-section-fallback";
import { RegionErrorBoundary } from "@/components/shared/region-error-boundary";
import { InfoTile } from "@/components/shared/info-tile";
import { ServerActionConfirmDialog } from "@/components/shared/server-action-button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  getBusinessInvoiceEditPath,
  getBusinessInvoiceExportPath,
  getBusinessInvoicePrintPath,
  getBusinessQuotePath,
} from "@/features/businesses/routes";
import { QuoteExportPopover } from "@/features/quotes/components/quote-export-popover";
import { hasFeatureAccess } from "@/lib/plans/entitlements";
import {
  recordPaymentAction,
  sendInvoiceAction,
  voidInvoiceAction,
} from "@/features/invoices/actions";
import { InvoicePaymentPanel } from "@/features/invoices/components/invoice-payment-panel";
import { SendInvoiceDialog } from "@/features/invoices/components/send-invoice-dialog";
import { isEmailConfigured } from "@/lib/env";
import {
  getInvoiceActivityForBusiness,
  getInvoiceDetailCoreForBusiness,
  getInvoiceItemsForBusiness,
  getInvoicePaymentsForBusiness,
} from "@/features/invoices/queries";
import { formatQuoteMoney } from "@/features/invoices/utils";
import type {
  InvoiceLineItemView,
} from "@/features/invoices/types";
import { getAppShellContext } from "@/lib/app-shell/context";
import { hasOperationalBusinessAccess } from "@/lib/db/business-access";
import { createNoIndexMetadata } from "@/lib/seo/site";

type InvoiceDetailPageProps = {
  params: Promise<{ businessSlug: string; invoiceId: string }>;
};

export const metadata: Metadata = createNoIndexMetadata({
  title: "Invoice detail",
  description: "View an invoice, record payments, and track the balance.",
});

export const instant = true;

/**
 * Invoice detail page — returns the structural shell synchronously.
 *
 * All dynamic reads (params, getAppShellContext, invoice queries) are pushed
 * into `<Suspense>`-wrapped child server components so the shell paints
 * instantly on client navigation.
 *
 * Staging: the core row (one indexed lookup plus a scalar payments sum)
 * paints the header and the status/amounts section first; the line items and
 * the recorded payments each stream behind their own region so a slow ledger
 * never holds back the verdict.
 */
export default function InvoiceDetailPage({ params }: InvoiceDetailPageProps) {
  return (
    <DashboardPage>
      <RegionErrorBoundary fallback={<DetailPageHeaderFallback />}>
        <Suspense fallback={<DetailPageHeaderFallback />}>
          <InvoiceHeaderRegion params={params} />
        </Suspense>
      </RegionErrorBoundary>

      <div className="flex flex-col gap-6">
        <RegionErrorBoundary fallback={<InvoiceStatusSkeleton />}>
          <Suspense fallback={<InvoiceStatusSkeleton />}>
            <InvoiceStatusRegion params={params} />
          </Suspense>
        </RegionErrorBoundary>

        <RegionErrorBoundary fallback={<DetailSectionFallback rows={4} />}>
          <Suspense fallback={<DetailSectionFallback rows={4} />}>
            <InvoiceItemsRegion params={params} />
          </Suspense>
        </RegionErrorBoundary>

        <RegionErrorBoundary fallback={<DetailSectionFallback rows={3} />}>
          <Suspense fallback={<DetailSectionFallback rows={3} />}>
            <InvoicePaymentsRegion params={params} />
          </Suspense>
        </RegionErrorBoundary>

        <RegionErrorBoundary fallback={<DetailSectionFallback rows={3} />}>
          <Suspense fallback={<DetailSectionFallback rows={3} />}>
            <InvoiceActivityRegion params={params} />
          </Suspense>
        </RegionErrorBoundary>
      </div>
    </DashboardPage>
  );
}

function InvoiceStatusSkeleton() {
  return (
    <DashboardSection title="Details">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton className="h-20 w-full rounded-lg" key={index} />
        ))}
      </div>
    </DashboardSection>
  );
}

function money(cents: number, currency: string) {
  return formatQuoteMoney(cents, currency);
}

/* -------------------------------------------------------------------------- */
/*  Regions — each resolves params + the slice it renders                     */
/* -------------------------------------------------------------------------- */

async function InvoiceHeaderRegion({ params }: InvoiceDetailPageProps) {
  const { businessSlug, invoiceId } = await params;
  const { businessContext } = await getAppShellContext(businessSlug);
  const invoice = await getInvoiceDetailCoreForBusiness({
    businessId: businessContext.business.id,
    invoiceId,
  });

  if (!invoice) {
    notFound();
  }

  const canManageFinancials = hasOperationalBusinessAccess(businessContext.role);
  const isVoided = invoice.status === "voided";
  const isDraft = invoice.status === "draft";
  const canEditDraft = canManageFinancials && isDraft;
  const canMarkSent = canManageFinancials && isDraft;
  const canExportData = hasFeatureAccess(businessContext.business.plan, "exports");
  const canVoidInvoice = canManageFinancials && !isVoided && invoice.paidInCents === 0;

  return (
    <PageHeader
      eyebrow={`Invoice ${invoice.invoiceNumber}`}
      title={invoice.title}
      description={`${invoice.customerName} · Issued ${invoice.issueDate} · Due ${invoice.dueDate}`}
      actions={
        <div className="flex flex-col gap-2 sm:flex-row">
          <QuoteExportPopover
            canExport={canExportData}
            pdfHref={getBusinessInvoiceExportPath(businessSlug, invoice.id, "pdf")}
            pngHref={getBusinessInvoiceExportPath(businessSlug, invoice.id, "png")}
          />
          <Link
            className="inline-flex h-9 items-center justify-center rounded-md border bg-background px-4 text-sm font-medium shadow-xs transition-colors hover:bg-accent hover:text-accent-foreground"
            href={getBusinessInvoicePrintPath(businessSlug, invoice.id)}
          >
            Print
          </Link>
          {canEditDraft ? (
            <Link
              className="inline-flex h-9 items-center justify-center rounded-md border bg-background px-4 text-sm font-medium shadow-xs transition-colors hover:bg-accent hover:text-accent-foreground"
              href={getBusinessInvoiceEditPath(businessSlug, invoice.id)}
            >
              Edit draft
            </Link>
          ) : null}
          {canMarkSent ? (
            <SendInvoiceDialog
              action={sendInvoiceAction.bind(null, invoice.id)}
              invoiceNumber={invoice.invoiceNumber}
              customerName={invoice.customerName}
              customerEmail={invoice.customerEmail}
              totalInCents={invoice.totalInCents}
              currency={invoice.currency}
              dueDate={invoice.dueDate}
              isRequoEmailAvailable={isEmailConfigured}
            />
          ) : null}
          {canVoidInvoice ? (
            <ServerActionConfirmDialog
              action={voidInvoiceAction.bind(null, invoice.id)}
              confirmLabel="Void invoice"
              confirmPendingLabel="Voiding..."
              description="Voiding keeps the record for audit history but removes it from balances. Void all recorded payments first."
              title="Void this invoice?"
              triggerLabel="Void invoice"
              triggerVariant="outline"
            />
          ) : null}
        </div>
      }
    />
  );
}

async function InvoiceStatusRegion({ params }: InvoiceDetailPageProps) {
  const { businessSlug, invoiceId } = await params;
  const { businessContext } = await getAppShellContext(businessSlug);
  const invoice = await getInvoiceDetailCoreForBusiness({
    businessId: businessContext.business.id,
    invoiceId,
  });

  if (!invoice) {
    notFound();
  }

  const canManageFinancials = hasOperationalBusinessAccess(businessContext.role);
  const amount = (cents: number) => money(cents, invoice.currency);

  return (
    <DashboardSection title="Details">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <InfoTile label="Total" value={<span className="font-semibold tabular-nums">{amount(invoice.totalInCents)}</span>} />
        <InfoTile label="Subtotal" value={<span className="tabular-nums">{amount(invoice.subtotalInCents)}</span>} />
        <InfoTile label="Discount" value={<span className="tabular-nums">{amount(invoice.discountInCents)}</span>} />
        <InfoTile
          label={invoice.taxLabel ? `Tax (${invoice.taxLabel})` : "Tax"}
          value={<span className="tabular-nums">{amount(invoice.taxInCents)}</span>}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <InfoTile
          label="Customer"
          value={invoice.customerName}
          description={invoice.customerEmail ?? undefined}
        />
      </div>
      {invoice.quoteId ? (
        <p className="text-sm text-muted-foreground">
          Converted from accepted quote.{" "}
          <Link className="font-medium underline underline-offset-4" href={getBusinessQuotePath(businessSlug, invoice.quoteId)}>
            View quote
          </Link>
        </p>
      ) : null}
      {invoice.notes ? <p className="whitespace-pre-wrap text-sm leading-6">{invoice.notes}</p> : null}
      {invoice.paymentTerms ? (
        <p className="text-sm text-muted-foreground">
          <span className="meta-label">Payment terms</span>
          <span className="mt-1 block whitespace-pre-wrap">{invoice.paymentTerms}</span>
        </p>
      ) : null}
      {canManageFinancials ? null : (
        <p className="text-sm text-muted-foreground">
          Only owners and managers can mark invoices sent, record payments, or void records.
        </p>
      )}
    </DashboardSection>
  );
}

async function InvoiceItemsRegion({ params }: InvoiceDetailPageProps) {
  const { businessSlug, invoiceId } = await params;
  const { businessContext } = await getAppShellContext(businessSlug);
  const [invoice, items] = await Promise.all([
    getInvoiceDetailCoreForBusiness({ businessId: businessContext.business.id, invoiceId }),
    getInvoiceItemsForBusiness({ businessId: businessContext.business.id, invoiceId }),
  ]);

  if (!invoice) {
    notFound();
  }

  return (
    <>
      <InvoiceLineItemsSection currency={invoice.currency} items={items} />
      {items.length === 0 ? (
        <DashboardSection title="No line items">
          <div className="flex flex-col gap-2">
            <ReceiptText className="size-5 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">This invoice has no line items.</p>
          </div>
        </DashboardSection>
      ) : null}
    </>
  );
}

async function InvoicePaymentsRegion({ params }: InvoiceDetailPageProps) {
  const { businessSlug, invoiceId } = await params;
  const { businessContext } = await getAppShellContext(businessSlug);
  const [invoice, payments] = await Promise.all([
    getInvoiceDetailCoreForBusiness({ businessId: businessContext.business.id, invoiceId }),
    getInvoicePaymentsForBusiness({ businessId: businessContext.business.id, invoiceId }),
  ]);

  if (!invoice) {
    notFound();
  }

  const canManageFinancials = hasOperationalBusinessAccess(businessContext.role);
  const canRecordPayment = canManageFinancials && invoice.status !== "draft" && invoice.status !== "voided" && invoice.balanceInCents > 0;

  return (
    <InvoicePaymentPanel
      businessSlug={businessSlug}
      canManageFinancials={canManageFinancials}
      canRecordPayment={canRecordPayment}
      currency={invoice.currency}
      customerName={invoice.customerName}
      dueDate={invoice.dueDate}
      invoiceId={invoice.id}
      invoiceNumber={invoice.invoiceNumber}
      initialPayments={payments}
      lifecycleStatus={invoice.status}
      recordAction={recordPaymentAction.bind(null, invoice.id)}
      totalInCents={invoice.totalInCents}
    />
  );
}

async function InvoiceActivityRegion({ params }: InvoiceDetailPageProps) {
  const { businessSlug, invoiceId } = await params;
  const { businessContext } = await getAppShellContext(businessSlug);
  const [invoice, activity] = await Promise.all([
    getInvoiceDetailCoreForBusiness({ businessId: businessContext.business.id, invoiceId }),
    getInvoiceActivityForBusiness({ businessId: businessContext.business.id, invoiceId }),
  ]);

  if (!invoice) {
    notFound();
  }

  return <InvoiceActivitySection activity={activity} />;
}

/* -------------------------------------------------------------------------- */
/*  Sections                                                                  */
/* -------------------------------------------------------------------------- */

function InvoiceLineItemsSection({
  currency,
  items,
}: {
  currency: string;
  items: InvoiceLineItemView[];
}) {
  return (
    <DashboardSection title="Line items">
      <DashboardTableContainer>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">Unit price</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.description}</TableCell>
                <TableCell className="text-right tabular-nums">{item.quantity}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {money(item.unitPriceInCents, currency)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {money(item.lineTotalInCents, currency)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DashboardTableContainer>
    </DashboardSection>
  );
}

function InvoiceActivitySection({
  activity,
}: {
  activity: Array<{ id: string; type: string; summary: string; createdAt: Date }>;
}) {
  const paymentEvents = activity.filter((item) =>
    ["invoice.payment_recorded", "payment.voided", "invoice.payment_voided", "invoice.paid", "invoice.sent", "invoice.created", "invoice.voided", "invoice.overdue"].includes(item.type),
  );
  if (!paymentEvents.length) return null;
  return (
    <DashboardSection description="Every payment recorded or voided on this invoice." title="Activity">
      <div className="flex flex-col gap-3">
        {paymentEvents.map((item) => (
          <div className="flex flex-col gap-0.5 border-b border-border/60 pb-3 last:border-0 last:pb-0" key={item.id}>
            <p className="text-sm font-medium">{item.summary}</p>
            <p className="text-xs text-muted-foreground">
              {new Date(item.createdAt).toLocaleString()}
            </p>
          </div>
        ))}
      </div>
    </DashboardSection>
  );
}
