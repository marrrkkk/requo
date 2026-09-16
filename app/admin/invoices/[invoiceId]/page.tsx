import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import {
  DashboardDetailLayout,
  DashboardPage,
  DashboardSidebarStack,
} from "@/components/shared/dashboard-layout";
import {
  AdminDetailHeaderFallback,
  AdminDetailSectionFallback,
} from "@/features/admin/components/admin-detail-section-fallback";
import {
  AdminInvoiceAmountsSection,
  AdminInvoiceHeaderSection,
  AdminInvoiceItemsSection,
  AdminInvoiceMetaSidebar,
  AdminInvoicePaymentSection,
} from "@/features/admin/components/product/invoices/admin-invoice-detail";
import { withAdminViewLog } from "@/features/admin/page-shell";
import {
  getAdminInvoiceDetailCore,
  getAdminInvoiceItems,
  getAdminInvoicePayments,
} from "@/features/admin/queries";
import { createNoIndexMetadata } from "@/lib/seo/site";

export const instant = true;

export const metadata: Metadata = createNoIndexMetadata({
  absoluteTitle: "Invoice - Requo admin",
  description: "Read-only details for a customer invoice.",
});

type AdminInvoiceDetailPageProps = {
  params: Promise<{ invoiceId: string }>;
};

/**
 * Admin invoice detail — staged structural shell.
 *
 * Read-only inspection leading with payment state (paid vs outstanding
 * plus recorded manual payments), then amounts, line items, and the
 * source quote. No customer-facing editing.
 *
 * The page returns its layout frames synchronously; the core row (one
 * indexed lookup plus a scalar payments sum) paints the header, payment
 * verdict, amounts, and sidebar metadata first, and the recorded-payments
 * feed and line items each stream behind their own boundary — no
 * full-page skeleton. Records a `view.invoice` audit entry with
 * `targetId = invoiceId` via `withAdminViewLog`.
 */
export default function AdminInvoiceDetailPage({
  params,
}: AdminInvoiceDetailPageProps) {
  return (
    <DashboardPage>
      <Suspense fallback={<AdminDetailHeaderFallback />}>
        <AdminInvoiceHeaderRegion params={params} />
      </Suspense>

      <DashboardDetailLayout className="xl:grid-cols-[minmax(0,1.1fr)_0.9fr]">
        <div className="flex min-w-0 flex-col gap-6">
          <Suspense fallback={<AdminDetailSectionFallback />}>
            <AdminInvoicePaymentRegion params={params} />
          </Suspense>
          <Suspense fallback={<AdminDetailSectionFallback />}>
            <AdminInvoiceAmountsRegion params={params} />
          </Suspense>
          <Suspense fallback={<AdminDetailSectionFallback rows={4} />}>
            <AdminInvoiceItemsRegion params={params} />
          </Suspense>
        </div>

        <DashboardSidebarStack>
          <Suspense fallback={<AdminDetailSectionFallback rows={2} />}>
            <AdminInvoiceMetaSidebarRegion params={params} />
          </Suspense>
        </DashboardSidebarStack>
      </DashboardDetailLayout>
    </DashboardPage>
  );
}

async function AdminInvoiceHeaderRegion({
  params,
}: AdminInvoiceDetailPageProps) {
  const { invoiceId } = await params;

  return withAdminViewLog(
    {
      action: "view.invoice",
      targetType: "invoice",
      targetId: invoiceId,
    },
    async () => {
      const core = await getAdminInvoiceDetailCore(invoiceId);

      if (!core) {
        notFound();
      }

      return <AdminInvoiceHeaderSection detail={core} />;
    },
  );
}

async function AdminInvoicePaymentRegion({
  params,
}: AdminInvoiceDetailPageProps) {
  const { invoiceId } = await params;
  const [core, payments] = await Promise.all([
    getAdminInvoiceDetailCore(invoiceId),
    getAdminInvoicePayments(invoiceId),
  ]);

  if (!core) {
    notFound();
  }

  return <AdminInvoicePaymentSection detail={core} payments={payments} />;
}

async function AdminInvoiceAmountsRegion({
  params,
}: AdminInvoiceDetailPageProps) {
  const { invoiceId } = await params;
  const core = await getAdminInvoiceDetailCore(invoiceId);

  if (!core) {
    notFound();
  }

  return <AdminInvoiceAmountsSection detail={core} />;
}

async function AdminInvoiceItemsRegion({
  params,
}: AdminInvoiceDetailPageProps) {
  const { invoiceId } = await params;
  const [core, items] = await Promise.all([
    getAdminInvoiceDetailCore(invoiceId),
    getAdminInvoiceItems(invoiceId),
  ]);

  if (!core) {
    notFound();
  }

  return <AdminInvoiceItemsSection currency={core.currency} items={items} />;
}

async function AdminInvoiceMetaSidebarRegion({
  params,
}: AdminInvoiceDetailPageProps) {
  const { invoiceId } = await params;
  const core = await getAdminInvoiceDetailCore(invoiceId);

  if (!core) {
    notFound();
  }

  return <AdminInvoiceMetaSidebar detail={core} />;
}
