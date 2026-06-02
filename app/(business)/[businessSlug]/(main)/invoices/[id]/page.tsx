import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { DashboardDetailPageSkeleton } from "@/components/shell/dashboard-detail-page-skeleton";
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
  unstable_disableValidation: true,
};

type InvoiceDetailPageProps = {
  params: Promise<{ businessSlug: string; id: string }>;
};

export default function InvoiceDetailPage({ params }: InvoiceDetailPageProps) {
  return (
    <Suspense fallback={<DashboardDetailPageSkeleton variant="invoice" />}>
      <InvoiceDetailContent params={params} />
    </Suspense>
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
