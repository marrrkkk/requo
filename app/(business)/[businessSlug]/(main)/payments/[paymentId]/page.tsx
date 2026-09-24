import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import {
  CalendarDays,
  Download,
  FileText,
  Hash,
  Mail,
  ReceiptText,
  User,
  Wallet,
} from "lucide-react";

import {
  DashboardDetailHeader,
  DashboardPage,
  DashboardSection,
} from "@/components/shared/dashboard-layout";
import { DetailPageHeaderFallback, DetailSectionFallback } from "@/components/shared/detail-section-fallback";
import { RegionErrorBoundary } from "@/components/shared/region-error-boundary";
import { InfoTile } from "@/components/shared/info-tile";
import { Button } from "@/components/ui/button";
import {
  MobileHeaderSlot,
  mobileNavbarIconButtonClassName,
} from "@/components/shell/mobile-header-slot";
import { getBusinessInvoicePath, getBusinessPaymentReceiptExportPath, getBusinessPaymentReceiptPath } from "@/features/businesses/routes";
import { voidPaymentAction } from "@/features/invoices/actions";
import { InvoiceStatusBadge } from "@/features/invoices/components/invoice-status-badge";
import { PaymentStatusBadge } from "@/features/invoices/components/payment-status-badge";
import { VoidPaymentDialog } from "@/features/invoices/components/void-payment-dialog";
import { getPaymentDetailForBusiness } from "@/features/invoices/queries";
import { getVoidReasonLabel } from "@/features/invoices/void-reasons";
import { formatQuoteMoney, getPaymentMethodLabel } from "@/features/invoices/utils";
import type { PaymentDetailView } from "@/features/invoices/types";
import { formatQuoteDate, formatQuoteDateTime } from "@/features/quotes/utils";
import { getAppShellContext } from "@/lib/app-shell/context";
import { hasOperationalBusinessAccess } from "@/lib/db/business-access";
import { createNoIndexMetadata } from "@/lib/seo/site";

type PaymentDetailPageProps = {
  params: Promise<{ businessSlug: string; paymentId: string }>;
};

export const metadata: Metadata = createNoIndexMetadata({
  title: "Payment detail",
  description: "View a recorded payment and its receipt.",
});

export const instant = true;

/**
 * Payment detail page — mirrors the invoice detail composition.
 *
 * `DashboardDetailHeader` (eyebrow + amount + status badge + mobile-slot
 * actions) → payment details (method, links, notes) → invoice balance.
 * All dynamic reads are pushed into `<Suspense>`-wrapped child server
 * components so the shell paints instantly on client navigation.
 */
export default function PaymentDetailPage({ params }: PaymentDetailPageProps) {
  return (
    <DashboardPage className="pb-24">
      <RegionErrorBoundary fallback={<DetailPageHeaderFallback />}>
        <Suspense fallback={<DetailPageHeaderFallback />}>
          <PaymentHeaderRegion params={params} />
        </Suspense>
      </RegionErrorBoundary>

      <div className="flex flex-col gap-6">
        <RegionErrorBoundary fallback={<DetailSectionFallback rows={4} />}>
          <Suspense fallback={<DetailSectionFallback rows={4} />}>
            <PaymentDetailsRegion params={params} />
          </Suspense>
        </RegionErrorBoundary>

        <RegionErrorBoundary fallback={<DetailSectionFallback rows={2} />}>
          <Suspense fallback={<DetailSectionFallback rows={2} />}>
            <PaymentBalanceRegion params={params} />
          </Suspense>
        </RegionErrorBoundary>
      </div>
    </DashboardPage>
  );
}

/* -------------------------------------------------------------------------- */
/*  Regions — each resolves params + the slice it renders                     */
/* -------------------------------------------------------------------------- */

async function PaymentHeaderRegion({ params }: PaymentDetailPageProps) {
  const { businessSlug, paymentId } = await params;
  const { businessContext } = await getAppShellContext(businessSlug);
  const payment = await getPaymentDetailForBusiness({ businessId: businessContext.business.id, paymentId });
  if (!payment) notFound();
  const canManageFinancials = hasOperationalBusinessAccess(businessContext.role);
  const isVoided = Boolean(payment.voidedAt);

  return (
    <DashboardDetailHeader
      className="[&_.dashboard-actions]:max-lg:hidden"
      eyebrow={`Payment ${payment.paymentNumber}`}
      title={formatQuoteMoney(payment.amountInCents, payment.currency)}
      description={`${payment.customerName} · ${payment.invoiceNumber} · Paid ${formatQuoteDate(payment.paymentDate)}`}
      meta={<PaymentStatusBadge status={isVoided ? "voided" : "recorded"} />}
      actions={
        <MobileHeaderSlot desktopClassName="grid w-full gap-2.5 sm:flex sm:w-auto sm:flex-wrap sm:items-center sm:justify-end [&_[data-slot=button]]:w-full sm:[&_[data-slot=button]]:w-auto">
          <Button
            asChild
            aria-label="View receipt"
            title="View receipt"
            size="sm"
            className={mobileNavbarIconButtonClassName}
          >
            <Link href={getBusinessPaymentReceiptPath(businessSlug, payment.id)}>
              <ReceiptText data-icon="inline-start" />
              <span className="hidden lg:inline">View receipt</span>
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            aria-label="View invoice"
            title="View invoice"
            size="sm"
            className={mobileNavbarIconButtonClassName}
          >
            <Link href={getBusinessInvoicePath(businessSlug, payment.invoiceId)}>
              <FileText data-icon="inline-start" />
              <span className="hidden lg:inline">View invoice</span>
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            aria-label="Download receipt"
            title="Download receipt"
            size="sm"
            className={mobileNavbarIconButtonClassName}
          >
            <a href={getBusinessPaymentReceiptExportPath(businessSlug, payment.id)}>
              <Download data-icon="inline-start" />
              <span className="hidden lg:inline">Download receipt</span>
            </a>
          </Button>
          {canManageFinancials && !isVoided ? (
            <VoidPaymentDialog
              paymentNumber={payment.paymentNumber}
              action={voidPaymentAction.bind(null, payment.id, payment.invoiceId)}
            />
          ) : null}
        </MobileHeaderSlot>
      }
    />
  );
}

async function PaymentDetailsRegion({ params }: PaymentDetailPageProps) {
  const { businessSlug, paymentId } = await params;
  const { businessContext } = await getAppShellContext(businessSlug);
  const payment = await getPaymentDetailForBusiness({ businessId: businessContext.business.id, paymentId });
  if (!payment) notFound();

  return <PaymentDetailsSection businessSlug={businessSlug} payment={payment} />;
}

async function PaymentBalanceRegion({ params }: PaymentDetailPageProps) {
  const { businessSlug, paymentId } = await params;
  const { businessContext } = await getAppShellContext(businessSlug);
  const payment = await getPaymentDetailForBusiness({ businessId: businessContext.business.id, paymentId });
  if (!payment) notFound();
  const amount = (cents: number) => formatQuoteMoney(cents, payment.currency);

  return (
    <DashboardSection
      contentClassName="flex flex-col gap-4"
      description={`What remains on ${payment.invoiceNumber} after this payment.`}
      title="Invoice balance"
      action={<InvoiceStatusBadge status={payment.invoiceStatus} />}
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <InfoTile label="Invoice total" value={<span className="tabular-nums">{amount(payment.invoiceTotalInCents)}</span>} />
        <InfoTile label="Amount paid" value={<span className="tabular-nums">{amount(payment.invoicePaidInCents)}</span>} />
        <InfoTile
          label="Remaining balance"
          value={<span className="font-semibold tabular-nums">{amount(payment.invoiceBalanceInCents)}</span>}
        />
      </div>
      <Button asChild variant="outline" size="sm" className="w-full sm:w-auto sm:self-start">
        <Link href={getBusinessInvoicePath(businessSlug, payment.invoiceId)}>
          <FileText data-icon="inline-start" />
          View invoice
        </Link>
      </Button>
    </DashboardSection>
  );
}

/* -------------------------------------------------------------------------- */
/*  Sections                                                                  */
/* -------------------------------------------------------------------------- */

function PaymentDetailsSection({
  businessSlug,
  payment,
}: {
  businessSlug: string;
  payment: PaymentDetailView;
}) {
  return (
    <DashboardSection
      contentClassName="flex flex-col gap-4"
      description="How and when this payment was recorded."
      title="Payment details"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <InfoTile
          icon={Wallet}
          label="Method"
          value={getPaymentMethodLabel(payment.method)}
        />
        <InfoTile
          icon={CalendarDays}
          label="Payment date"
          value={formatQuoteDate(payment.paymentDate)}
        />
        <InfoTile
          icon={Hash}
          label="Reference"
          value={payment.reference ?? "—"}
        />
        <InfoTile
          icon={User}
          label="Recorded by"
          value={payment.recordedByName ?? "—"}
          description={formatQuoteDateTime(payment.createdAt)}
        />
        <InfoTile
          icon={ReceiptText}
          label="Invoice"
          value={
            <Link
              className="hover:underline"
              href={getBusinessInvoicePath(businessSlug, payment.invoiceId)}
            >
              {payment.invoiceNumber}
            </Link>
          }
          description={payment.invoiceTitle}
        />
        <InfoTile
          icon={Mail}
          label="Customer"
          value={payment.customerName}
          description={payment.customerEmail ?? undefined}
        />
      </div>
      {payment.notes ? (
        <div className="soft-panel shadow-none">
          <p className="meta-label">Notes</p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-foreground">
            {payment.notes}
          </p>
        </div>
      ) : null}
      {payment.voidedAt ? (
        <div className="soft-panel shadow-none">
          <p className="meta-label">Void reason</p>
          <p className="mt-2 text-sm leading-6 text-foreground">
            {getVoidReasonLabel(payment.voidReason)}
          </p>
        </div>
      ) : null}
      <p className="text-sm text-muted-foreground">Payment recorded in Requo. Requo did not process this payment.</p>
    </DashboardSection>
  );
}
