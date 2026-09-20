import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { DashboardPage, DashboardSection } from "@/components/shared/dashboard-layout";
import { PageHeader } from "@/components/shared/page-header";
import { DetailPageHeaderFallback, DetailSectionFallback } from "@/components/shared/detail-section-fallback";
import { RegionErrorBoundary } from "@/components/shared/region-error-boundary";
import { InfoTile } from "@/components/shared/info-tile";
import { getBusinessInvoicePath, getBusinessPaymentReceiptExportPath, getBusinessPaymentReceiptPath } from "@/features/businesses/routes";
import { voidPaymentAction } from "@/features/invoices/actions";
import { VoidPaymentDialog } from "@/features/invoices/components/void-payment-dialog";
import { getPaymentDetailForBusiness } from "@/features/invoices/queries";
import { getVoidReasonLabel } from "@/features/invoices/mutations";
import { formatQuoteMoney } from "@/features/invoices/utils";
import type { PaymentMethod } from "@/features/invoices/types";
import { getAppShellContext } from "@/lib/app-shell/context";
import { hasOperationalBusinessAccess } from "@/lib/db/business-access";
import { createNoIndexMetadata } from "@/lib/seo/site";

type PaymentDetailPageProps = {
  params: Promise<{ businessSlug: string; paymentId: string }>;
};

const methodLabels: Record<PaymentMethod, string> = {
  cash: "Cash",
  bank_transfer: "Bank Transfer",
  gcash: "GCash",
  maya: "Maya",
  check: "Check",
  other: "Other",
};

export const metadata: Metadata = createNoIndexMetadata({
  title: "Payment detail",
  description: "View a recorded payment and its receipt.",
});

export const instant = true;

export default function PaymentDetailPage({ params }: PaymentDetailPageProps) {
  return (
    <DashboardPage>
      <RegionErrorBoundary fallback={<DetailPageHeaderFallback />}>
        <Suspense fallback={<DetailPageHeaderFallback />}>
          <PaymentHeaderRegion params={params} />
        </Suspense>
      </RegionErrorBoundary>
      <RegionErrorBoundary fallback={<DetailSectionFallback rows={4} />}>
        <Suspense fallback={<DetailSectionFallback rows={4} />}>
          <PaymentDetailRegion params={params} />
        </Suspense>
      </RegionErrorBoundary>
    </DashboardPage>
  );
}

async function PaymentHeaderRegion({ params }: PaymentDetailPageProps) {
  const { businessSlug, paymentId } = await params;
  const { businessContext } = await getAppShellContext(businessSlug);
  const payment = await getPaymentDetailForBusiness({ businessId: businessContext.business.id, paymentId });
  if (!payment) notFound();
  const canManageFinancials = hasOperationalBusinessAccess(businessContext.role);
  const isVoided = Boolean(payment.voidedAt);

  return (
    <PageHeader
      eyebrow={`Payment ${payment.paymentNumber}`}
      title={formatQuoteMoney(payment.amountInCents, payment.currency)}
      description={`${payment.customerName} · ${payment.invoiceNumber} · ${payment.paymentDate}`}
      actions={
        <div className="flex flex-col gap-2 sm:flex-row">
          <Link
            className="inline-flex h-9 items-center justify-center rounded-md border bg-background px-4 text-sm font-medium shadow-xs transition-colors hover:bg-accent hover:text-accent-foreground"
            href={getBusinessInvoicePath(businessSlug, payment.invoiceId)}
          >
            View invoice
          </Link>
          <Link
            className="inline-flex h-9 items-center justify-center rounded-md border bg-background px-4 text-sm font-medium shadow-xs transition-colors hover:bg-accent hover:text-accent-foreground"
            href={getBusinessPaymentReceiptPath(businessSlug, payment.id)}
          >
            View receipt
          </Link>
          <a
            className="inline-flex h-9 items-center justify-center rounded-md border bg-background px-4 text-sm font-medium shadow-xs transition-colors hover:bg-accent hover:text-accent-foreground"
            href={getBusinessPaymentReceiptExportPath(businessSlug, payment.id)}
          >
            Download receipt
          </a>
          {canManageFinancials && !isVoided ? (
            <VoidPaymentDialog
              paymentNumber={payment.paymentNumber}
              action={voidPaymentAction.bind(null, payment.id, payment.invoiceId)}
            />
          ) : null}
        </div>
      }
    />
  );
}

async function PaymentDetailRegion({ params }: PaymentDetailPageProps) {
  const { businessSlug, paymentId } = await params;
  const { businessContext } = await getAppShellContext(businessSlug);
  const payment = await getPaymentDetailForBusiness({ businessId: businessContext.business.id, paymentId });
  if (!payment) notFound();
  const amount = (cents: number) => formatQuoteMoney(cents, payment.currency);

  return (
    <div className="flex flex-col gap-6">
      <DashboardSection title="Payment">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <InfoTile label="Status" value={payment.voidedAt ? "Voided" : "Recorded"} />
          <InfoTile label="Amount" value={<span className="tabular-nums">{amount(payment.amountInCents)}</span>} />
          <InfoTile label="Method" value={methodLabels[payment.method]} />
          <InfoTile label="Payment date" value={payment.paymentDate} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <InfoTile label="Invoice" value={payment.invoiceNumber} description={payment.invoiceTitle} />
          <InfoTile label="Customer" value={payment.customerName} description={payment.customerEmail ?? undefined} />
          <InfoTile label="Reference" value={payment.reference ?? "—"} />
          <InfoTile label="Recorded by" value={payment.recordedByName ?? "—"} />
        </div>
        {payment.notes ? <p className="whitespace-pre-wrap text-sm leading-6">{payment.notes}</p> : null}
        <p className="text-sm text-muted-foreground">Payment recorded in Requo. Requo did not process this payment.</p>
        {payment.voidedAt ? (
          <p className="text-sm text-muted-foreground">Void reason: {getVoidReasonLabel(payment.voidReason)}</p>
        ) : null}
      </DashboardSection>
      <DashboardSection title="Invoice balance">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <InfoTile label="Invoice total" value={<span className="tabular-nums">{amount(payment.invoiceTotalInCents)}</span>} />
          <InfoTile label="Amount paid" value={<span className="tabular-nums">{amount(payment.invoicePaidInCents)}</span>} />
          <InfoTile
            label="Remaining balance"
            value={<span className="font-semibold tabular-nums">{amount(payment.invoiceBalanceInCents)}</span>}
          />
        </div>
      </DashboardSection>
    </div>
  );
}
