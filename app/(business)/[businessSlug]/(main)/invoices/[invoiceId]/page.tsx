import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Mail, Pencil, Printer, ReceiptText } from "lucide-react";

import {
  DashboardDetailFeed,
  DashboardDetailFeedItem,
  DashboardDetailHeader,
  DashboardEmptyState,
  DashboardPage,
  DashboardSection,
  DashboardTableContainer,
} from "@/components/shared/dashboard-layout";
import {
  DetailPageHeaderFallback,
  DetailSectionFallback,
} from "@/components/shared/detail-section-fallback";
import { RegionErrorBoundary } from "@/components/shared/region-error-boundary";
import { InfoTile } from "@/components/shared/info-tile";
import { Button } from "@/components/ui/button";
import {
  MobileHeaderSlot,
  mobileNavbarIconButtonClassName,
} from "@/components/shell/mobile-header-slot";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  getBusinessInvoiceEditPath,
  getBusinessInvoiceExportPath,
  getBusinessInvoicePrintPath,
  getBusinessQuotePath,
} from "@/features/businesses/routes";
import { formatQuoteDate, formatQuoteDateTime } from "@/features/quotes/utils";
import { hasFeatureAccess } from "@/lib/plans/entitlements";
import {
  recordPaymentAction,
  sendInvoiceAction,
  voidInvoiceAction,
} from "@/features/invoices/actions";
import { InvoiceManageDropdown } from "@/features/invoices/components/invoice-manage-dropdown";
import { InvoicePaymentPanel } from "@/features/invoices/components/invoice-payment-panel";
import { InvoiceStatusBadge } from "@/features/invoices/components/invoice-status-badge";
import { RecordPaymentDialog } from "@/features/invoices/components/record-payment-dialog";
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
  InvoiceDetailCore,
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
 * Single-column flow: line items (full width) → payments → details
 * (source quote, notes, terms) → activity. Money has a single home per
 * concern: the line-items summary owns Subtotal/Discount/Tax/Total, the
 * payments section owns Total/Paid/Balance.
 *
 * All dynamic reads (params, getAppShellContext, invoice queries) are pushed
 * into `<Suspense>`-wrapped child server components so the shell paints
 * instantly on client navigation.
 */
export default function InvoiceDetailPage({ params }: InvoiceDetailPageProps) {
  return (
    <DashboardPage className="pb-24">
      <RegionErrorBoundary fallback={<DetailPageHeaderFallback />}>
        <Suspense fallback={<DetailPageHeaderFallback />}>
          <InvoiceHeaderRegion params={params} />
        </Suspense>
      </RegionErrorBoundary>

      <div className="flex flex-col gap-6">
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

        <RegionErrorBoundary fallback={<DetailSectionFallback rows={2} />}>
          <Suspense fallback={<DetailSectionFallback rows={2} />}>
            <InvoiceDetailsRegion params={params} />
          </Suspense>
        </RegionErrorBoundary>

        <RegionErrorBoundary fallback={<DetailSectionFallback rows={2} />}>
          <Suspense fallback={<DetailSectionFallback rows={2} />}>
            <InvoiceActivityRegion params={params} />
          </Suspense>
        </RegionErrorBoundary>
      </div>
    </DashboardPage>
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
  const canRecordPayment =
    canManageFinancials && !isDraft && !isVoided && invoice.balanceInCents > 0;
  const printHref = getBusinessInvoicePrintPath(businessSlug, invoice.id);
  const editHref = canEditDraft
    ? getBusinessInvoiceEditPath(businessSlug, invoice.id)
    : null;
  // One primary per state: Record payment > Send > Print. Edit draft and
  // Print serve as the secondary; everything else lives in More actions.
  const showPrimaryPrint = !canRecordPayment && !canMarkSent;
  const showSecondaryEdit = canMarkSent && editHref !== null;
  const showSecondaryPrint = canRecordPayment;

  return (
    <DashboardDetailHeader
      className="[&_.dashboard-actions]:max-lg:hidden"
      eyebrow={`Invoice ${invoice.invoiceNumber}`}
      title={invoice.title}
      description={`${invoice.customerName} · Issued ${formatQuoteDate(invoice.issueDate)} · Due ${formatQuoteDate(invoice.dueDate)}`}
      meta={<InvoiceStatusBadge status={invoice.status} />}
      actions={
          <MobileHeaderSlot desktopClassName="grid w-full gap-2.5 sm:flex sm:w-auto sm:flex-wrap sm:items-center sm:justify-end [&_[data-slot=button]]:w-full sm:[&_[data-slot=button]]:w-auto">
          {canRecordPayment ? (
            <RecordPaymentDialog
              action={recordPaymentAction.bind(null, invoice.id)}
              balanceInCents={invoice.balanceInCents}
              currency={invoice.currency}
              invoiceNumber={invoice.invoiceNumber}
              customerName={invoice.customerName}
              compactOnMobile
            />
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
          {showPrimaryPrint ? (
            <Button
              asChild
              aria-label="Print invoice"
              title="Print invoice"
              size="sm"
              className={mobileNavbarIconButtonClassName}
            >
              <Link href={printHref}>
                <Printer data-icon="inline-start" />
                <span className="hidden lg:inline">Print</span>
              </Link>
            </Button>
          ) : null}
          {showSecondaryEdit && editHref ? (
            <Button
              asChild
              variant="outline"
              aria-label="Edit draft"
              title="Edit draft"
              size="sm"
              className={mobileNavbarIconButtonClassName}
            >
              <Link href={editHref}>
                <Pencil data-icon="inline-start" />
                <span className="hidden lg:inline">Edit draft</span>
              </Link>
            </Button>
          ) : null}
          {showSecondaryPrint ? (
            <Button
              asChild
              variant="outline"
              aria-label="Print invoice"
              title="Print invoice"
              size="sm"
              className={mobileNavbarIconButtonClassName}
            >
              <Link href={printHref}>
                <Printer data-icon="inline-start" />
                <span className="hidden lg:inline">Print</span>
              </Link>
            </Button>
          ) : null}
          <InvoiceManageDropdown
            editHref={showSecondaryEdit ? null : editHref}
            printHref={showPrimaryPrint || showSecondaryPrint ? null : printHref}
            canVoid={canVoidInvoice}
            voidAction={voidInvoiceAction.bind(null, invoice.id)}
            canExport={canExportData}
            pdfHref={getBusinessInvoiceExportPath(businessSlug, invoice.id, "pdf")}
            pngHref={getBusinessInvoiceExportPath(businessSlug, invoice.id, "png")}
          />
        </MobileHeaderSlot>
      }
    />
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

  if (!items.length) {
    return (
      <DashboardSection title="No line items">
        <div className="flex flex-col gap-2">
          <ReceiptText className="size-5 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">This invoice has no line items.</p>
        </div>
      </DashboardSection>
    );
  }

  return (
    <InvoiceLineItemsSection
      currency={invoice.currency}
      items={items}
      subtotalInCents={invoice.subtotalInCents}
      discountInCents={invoice.discountInCents}
      taxInCents={invoice.taxInCents}
      taxLabel={invoice.taxLabel}
      totalInCents={invoice.totalInCents}
    />
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

async function InvoiceDetailsRegion({ params }: InvoiceDetailPageProps) {
  const { businessSlug, invoiceId } = await params;
  const { businessContext } = await getAppShellContext(businessSlug);
  const invoice = await getInvoiceDetailCoreForBusiness({
    businessId: businessContext.business.id,
    invoiceId,
  });

  if (!invoice) {
    notFound();
  }

  return <InvoiceDetailsSection businessSlug={businessSlug} invoice={invoice} />;
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
  subtotalInCents,
  discountInCents,
  taxInCents,
  taxLabel,
  totalInCents,
}: {
  currency: string;
  items: InvoiceLineItemView[];
  subtotalInCents: number;
  discountInCents: number;
  taxInCents: number;
  taxLabel: string | null;
  totalInCents: number;
}) {
  return (
    <DashboardSection
      contentClassName="flex flex-col gap-4"
      description="What the customer is being billed for."
      title={`Line items (${items.length})`}
    >
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
      <div className="soft-panel flex w-full flex-col gap-3 shadow-none">
        <p className="meta-label">Summary</p>
        <InvoiceSummaryRow label="Subtotal" value={money(subtotalInCents, currency)} />
        <InvoiceSummaryRow label="Discount" value={`-${money(discountInCents, currency)}`} />
        <InvoiceSummaryRow
          label={taxLabel ? `Tax (${taxLabel})` : "Tax"}
          value={money(taxInCents, currency)}
        />
        <div className="border-t pt-3">
          <InvoiceSummaryRow label="Total" value={money(totalInCents, currency)} strong />
        </div>
      </div>
    </DashboardSection>
  );
}

function InvoiceSummaryRow({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span
        className={
          strong
            ? "text-base font-semibold text-foreground tabular-nums"
            : "text-sm font-medium text-foreground tabular-nums"
        }
      >
        {value}
      </span>
    </div>
  );
}

function InvoiceDetailsSection({
  businessSlug,
  invoice,
}: {
  businessSlug: string;
  invoice: InvoiceDetailCore;
}) {
  return (
    <DashboardSection
      contentClassName="flex flex-col gap-4"
      description="Source quote, notes, and payment terms."
      title="Details"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <InfoTile
          icon={ReceiptText}
          label="Linked quote"
          value={
            invoice.quoteId ? (
              <Link
                className="hover:underline"
                href={getBusinessQuotePath(businessSlug, invoice.quoteId)}
              >
                View quote
              </Link>
            ) : (
              "Created manually"
            )
          }
        />
        <InfoTile
          icon={Mail}
          label="Customer email"
          valueClassName="break-all"
          value={
            invoice.customerEmail ? (
              <a
                className="underline-offset-4 hover:underline"
                href={`mailto:${invoice.customerEmail}`}
              >
                {invoice.customerEmail}
              </a>
            ) : (
              "Not provided"
            )
          }
        />
      </div>
      {invoice.notes ? (
        <div className="soft-panel shadow-none">
          <p className="meta-label">Notes</p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-foreground">
            {invoice.notes}
          </p>
        </div>
      ) : null}
      {invoice.paymentTerms ? (
        <div className="soft-panel shadow-none">
          <p className="meta-label">Payment terms</p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-foreground">
            {invoice.paymentTerms}
          </p>
        </div>
      ) : null}
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
  const latestActivity = paymentEvents[0];

  return (
    <DashboardSection
      contentClassName="flex flex-col gap-4"
      description="Submission, payment, and owner actions."
      title="Activity log"
    >
      {latestActivity ? (
        <>
          <DashboardDetailFeed>
            <DashboardDetailFeedItem
              meta={formatQuoteDateTime(latestActivity.createdAt)}
              title={latestActivity.summary}
            />
          </DashboardDetailFeed>
          {paymentEvents.length > 1 ? (
            <Sheet>
              <SheetTrigger asChild>
                <Button className="w-full" type="button" variant="outline">
                  View all activity
                </Button>
              </SheetTrigger>
              <SheetContent className="w-full sm:max-w-xl">
                <SheetHeader>
                  <SheetTitle>Invoice activity</SheetTitle>
                  <SheetDescription>
                    Full timeline of events and owner actions for this invoice.
                  </SheetDescription>
                </SheetHeader>
                <SheetBody className="min-h-0 flex-1">
                  <ScrollArea className="h-full pr-4">
                    <DashboardDetailFeed>
                      {paymentEvents.map((item) => (
                        <DashboardDetailFeedItem
                          key={item.id}
                          meta={formatQuoteDateTime(item.createdAt)}
                          title={item.summary}
                        />
                      ))}
                    </DashboardDetailFeed>
                  </ScrollArea>
                </SheetBody>
              </SheetContent>
            </Sheet>
          ) : null}
        </>
      ) : (
        <DashboardEmptyState
          description="Send the invoice or record a payment to start the timeline for this invoice."
          title="No invoice activity yet"
          variant="section"
        />
      )}
    </DashboardSection>
  );
}
