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
  voidPaymentAction,
} from "@/features/invoices/actions";
import { InvoiceStatusBadge } from "@/features/invoices/components/invoice-status-badge";
import { RecordPaymentDialog } from "@/features/invoices/components/record-payment-dialog";
import { SendInvoiceDialog } from "@/features/invoices/components/send-invoice-dialog";
import {
  createCheckoutAction,
  refreshProviderPaymentAction,
  refundProviderPaymentAction,
} from "@/features/payment-providers/actions";
import {
  CreatePaymentLinkForm,
  RefreshProviderPaymentButton,
  RefundProviderPaymentForm,
} from "@/features/payment-providers/components/invoice-provider-payments";
import {
  getInvoiceProviderPaymentsForBusiness,
  isOperableConnection,
  listProviderConnectionsForBusiness,
  type InvoiceProviderPaymentView,
} from "@/features/payment-providers/queries";
import { getBusinessSettingsPath } from "@/features/businesses/routes";
import { isEmailConfigured } from "@/lib/env";
import {
  getInvoiceDetailCoreForBusiness,
  getInvoiceItemsForBusiness,
  getInvoicePaymentsForBusiness,
} from "@/features/invoices/queries";
import { calculateOverpaidInCents, formatQuoteMoney } from "@/features/invoices/utils";
import type {
  InvoiceLineItemView,
  PaymentMethod,
  PaymentView,
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
            <InvoiceProviderPaymentsRegion params={params} />
          </Suspense>
        </RegionErrorBoundary>
      </div>
    </DashboardPage>
  );
}

function InvoiceStatusSkeleton() {
  return (
    <DashboardSection title="Status">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton className="h-20 w-full rounded-lg" key={index} />
        ))}
      </div>
    </DashboardSection>
  );
}

const paymentMethodLabels: Record<PaymentMethod, string> = {
  cash: "Cash",
  bank_transfer: "Bank transfer",
  gcash: "GCash",
  maya: "Maya",
  check: "Check",
  other: "Other",
};

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
  const canRecordPayment = canManageFinancials && !isDraft && !isVoided && invoice.balanceInCents > 0;
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
          {canRecordPayment ? (
            <RecordPaymentDialog
              action={recordPaymentAction.bind(null, invoice.id)}
              balanceInCents={invoice.balanceInCents}
              currency={invoice.currency}
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
  const overpaidInCents = calculateOverpaidInCents(invoice.totalInCents, invoice.paidInCents);

  return (
    <DashboardSection title="Status">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <InfoTile label="Status" value={<InvoiceStatusBadge status={invoice.status} />} />
        <InfoTile label="Total" value={<span className="tabular-nums">{amount(invoice.totalInCents)}</span>} />
        <InfoTile label="Paid" value={<span className="tabular-nums">{amount(invoice.paidInCents)}</span>} />
        <InfoTile
          label="Balance due"
          value={<span className="font-semibold tabular-nums">{amount(invoice.balanceInCents)}</span>}
        />
      </div>
      {overpaidInCents > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <InfoTile
            label="Overpaid"
            value={<span className="tabular-nums">{amount(overpaidInCents)}</span>}
            description="Paid above the invoice total."
          />
        </div>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <InfoTile label="Subtotal" value={<span className="tabular-nums">{amount(invoice.subtotalInCents)}</span>} />
        <InfoTile label="Discount" value={<span className="tabular-nums">{amount(invoice.discountInCents)}</span>} />
        <InfoTile
          label={invoice.taxLabel ? `Tax (${invoice.taxLabel})` : "Tax"}
          value={<span className="tabular-nums">{amount(invoice.taxInCents)}</span>}
        />
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

  return (
    <InvoicePaymentsSection
      canManageFinancials={hasOperationalBusinessAccess(businessContext.role)}
      currency={invoice.currency}
      invoiceId={invoice.id}
      payments={payments}
    />
  );
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

function InvoicePaymentsSection({
  canManageFinancials,
  currency,
  invoiceId,
  payments,
}: {
  canManageFinancials: boolean;
  currency: string;
  invoiceId: string;
  payments: PaymentView[];
}) {
  const activePayments = payments.filter((payment) => !payment.voidedAt);
  const voidedPayments = payments.filter((payment) => payment.voidedAt);
  const amount = (cents: number) => money(cents, currency);

  return (
    <DashboardSection
      description={
        activePayments.length
          ? "Receipts against this invoice."
          : "No payments recorded yet."
      }
      title="Payments"
    >
      {activePayments.length ? (
        <DashboardTableContainer>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Method</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Reference</TableHead>
                {canManageFinancials ? <TableHead className="text-right">Actions</TableHead> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {activePayments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell>{payment.paymentDate}</TableCell>
                  <TableCell>
                    {paymentMethodLabels[payment.method]}
                    {payment.source === "provider" ? (
                      <span className="text-muted-foreground"> · Online</span>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {amount(payment.amountInCents)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{payment.reference ?? "—"}</TableCell>
                  {canManageFinancials ? (
                    <TableCell className="text-right">
                      {payment.source === "manual" ? (
                        <ServerActionConfirmDialog
                          action={voidPaymentAction.bind(null, payment.id, invoiceId)}
                          confirmLabel="Void payment"
                          confirmPendingLabel="Voiding..."
                          description="Voiding keeps the payment record for audit history but excludes it from the balance."
                          title="Void this payment?"
                          triggerLabel="Void"
                          triggerVariant="ghost"
                        />
                      ) : null}
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DashboardTableContainer>
      ) : null}
      {voidedPayments.length ? (
        <div className="flex flex-col gap-2">
          <p className="meta-label">Voided payments</p>
          {voidedPayments.map((payment) => (
            <p className="text-sm text-muted-foreground" key={payment.id}>
              {amount(payment.amountInCents)} · {paymentMethodLabels[payment.method]} · {payment.paymentDate} · voided
            </p>
          ))}
        </div>
      ) : null}
    </DashboardSection>
  );
}

const providerLabels: Record<string, string> = {
  paymongo: "PayMongo",
  stripe: "Stripe",
  paypal: "PayPal",
};

const providerStatusLabels: Record<string, string> = {
  pending: "Pending",
  processing: "Processing",
  succeeded: "Paid",
  failed: "Failed",
  canceled: "Canceled",
  partially_refunded: "Partially refunded",
  refunded: "Refunded",
};

async function InvoiceProviderPaymentsRegion({ params }: InvoiceDetailPageProps) {
  const { businessSlug, invoiceId } = await params;
  const { businessContext } = await getAppShellContext(businessSlug);
  const businessId = businessContext.business.id;
  const [invoice, providerPayments, connections] = await Promise.all([
    getInvoiceDetailCoreForBusiness({ businessId, invoiceId }),
    getInvoiceProviderPaymentsForBusiness({ businessId, invoiceId }),
    listProviderConnectionsForBusiness(businessId),
  ]);

  if (!invoice) {
    notFound();
  }

  const canManageFinancials = hasOperationalBusinessAccess(businessContext.role);
  const isPayable = invoice.status !== "draft" && invoice.status !== "voided";
  const checkoutConnections = connections.filter(isOperableConnection);
  const showCreate = canManageFinancials && isPayable && invoice.balanceInCents > 0;

  return (
    <DashboardSection
      description={
        providerPayments.length
          ? "Online payments processed through a connected provider."
          : "No online payments yet."
      }
      title="Online payments"
    >
      {showCreate ? (
        checkoutConnections.length ? (
          <CreatePaymentLinkForm
            action={createCheckoutAction.bind(null, invoice.id)}
            balanceInCents={invoice.balanceInCents}
            connections={checkoutConnections}
            currency={invoice.currency}
          />
        ) : (
          <p className="text-sm text-muted-foreground">
            <Link
              className="font-medium underline underline-offset-4"
              href={getBusinessSettingsPath(businessSlug, "integrations")}
            >
              Connect a payment provider
            </Link>{" "}
            to accept online payments for this invoice.
          </p>
        )
      ) : null}
      {providerPayments.length ? (
        <DashboardTableContainer>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Provider</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Refunded</TableHead>
                <TableHead className="text-right">Net</TableHead>
                {canManageFinancials ? <TableHead className="text-right">Actions</TableHead> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {providerPayments.map((payment) => (
                <ProviderPaymentRow
                  key={payment.id}
                  canManageFinancials={canManageFinancials}
                  currency={invoice.currency}
                  invoiceId={invoice.id}
                  payment={payment}
                />
              ))}
            </TableBody>
          </Table>
        </DashboardTableContainer>
      ) : null}
    </DashboardSection>
  );
}

function ProviderPaymentRow({
  canManageFinancials,
  currency,
  invoiceId,
  payment,
}: {
  canManageFinancials: boolean;
  currency: string;
  invoiceId: string;
  payment: InvoiceProviderPaymentView;
}) {
  const net = payment.amountInCents - payment.refundedAmountInCents;
  const canRefresh =
    canManageFinancials && (payment.providerPaymentId ?? payment.providerCheckoutId);
  const canRefund =
    canManageFinancials &&
    payment.providerPaymentId &&
    (payment.status === "succeeded" || payment.status === "partially_refunded") &&
    net > 0;
  return (
    <TableRow>
      <TableCell>
        {providerLabels[payment.provider ?? ""] ?? payment.provider ?? "—"}
        <span className="text-muted-foreground">
          {" "}
          · {payment.environment ?? "—"}
          {payment.connectionHint ? ` · ${payment.connectionHint}` : ""}
        </span>
        <span className="block text-xs text-muted-foreground">
          {payment.paymentDate}
          {payment.checkoutUrl && (payment.status === "pending" || payment.status === "processing") ? (
            <>
              {" · "}
              <a className="underline underline-offset-4" href={payment.checkoutUrl} target="_blank" rel="noreferrer">
                Open checkout
              </a>
            </>
          ) : null}
        </span>
      </TableCell>
      <TableCell>{providerStatusLabels[payment.status ?? ""] ?? payment.status ?? "—"}</TableCell>
      <TableCell className="text-right font-medium tabular-nums">
        {money(payment.amountInCents, currency)}
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {payment.refundedAmountInCents > 0 ? money(payment.refundedAmountInCents, currency) : "—"}
      </TableCell>
      <TableCell className="text-right tabular-nums">{money(net, currency)}</TableCell>
      {canManageFinancials ? (
        <TableCell className="text-right">
          <div className="flex flex-col items-end gap-2">
            {canRefresh ? (
              <RefreshProviderPaymentButton
                action={refreshProviderPaymentAction.bind(null, payment.id, invoiceId)}
              />
            ) : null}
            {canRefund ? (
              <RefundProviderPaymentForm
                action={refundProviderPaymentAction.bind(null, payment.id, invoiceId)}
                currency={currency}
                maxInCents={net}
              />
            ) : null}
          </div>
        </TableCell>
      ) : null}
    </TableRow>
  );
}
