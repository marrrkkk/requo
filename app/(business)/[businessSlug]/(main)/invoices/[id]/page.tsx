import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { DashboardDetailPageSkeleton } from "@/components/shell/dashboard-detail-page-skeleton";
import { RegionErrorBoundary } from "@/components/shared/region-error-boundary";
import { getAppShellContext } from "@/lib/app-shell/context";
import { getInvoiceDetailForBusiness } from "@/features/invoices/queries";
import { InvoiceDetail } from "@/features/invoices/components/invoice-detail";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ businessSlug: string; id: string }>;
}): Promise<Metadata> {
  const { businessSlug, id } = await params;
  const { businessContext } = await getAppShellContext(businessSlug);
  const invoice = await getInvoiceDetailForBusiness(
    businessContext.business.id,
    id,
  );

  return {
    title: invoice ? `${invoice.invoiceNumber} - ${invoice.title}` : "Invoice not found",
  };
}

export const unstable_instant = {
  prefetch: "static",
  samples: [
    {
      params: { businessSlug: "demo", id: "sample-invoice-id" },
      headers: [
        ["rsc", "1"],
        ["next-action", null],
      ],
    },
  ],
};

type InvoiceDetailPageProps = {
  params: Promise<{ businessSlug: string; id: string }>;
};

/**
 * Invoice detail page — returns the structural shell synchronously.
 *
 * All dynamic reads (params, getAppShellContext, invoice queries) are pushed
 * into a `<Suspense>`-wrapped child server component so the shell paints
 * instantly on client navigation.
 */
export default function InvoiceDetailPage({ params }: InvoiceDetailPageProps) {
  return (
    <RegionErrorBoundary fallback={<DashboardDetailPageSkeleton variant="invoice" />}>
      <Suspense fallback={<DashboardDetailPageSkeleton variant="invoice" />}>
        <InvoiceDetailContent params={params} />
      </Suspense>
    </RegionErrorBoundary>
  );
}

async function InvoiceDetailContent({ params }: InvoiceDetailPageProps) {
  const { businessSlug, id } = await params;
  const { user, businessContext } = await getAppShellContext(businessSlug);
  const invoice = await getInvoiceDetailForBusiness(
    businessContext.business.id,
    id,
  );

  if (!invoice) {
    notFound();
  }

  const plan = businessContext.business.plan;
  const pdfExportHref = `/api/business/${businessSlug}/invoices/${invoice.id}/pdf`;

  return (
    <InvoiceDetail
      invoice={invoice}
      businessSlug={businessSlug}
      pdfExportHref={pdfExportHref}
      plan={plan}
      upgradeAction={{
        userId: user.id,
        businessId: businessContext.business.id,
        businessSlug,
        currentPlan: plan,
      }}
    />
  );
}
