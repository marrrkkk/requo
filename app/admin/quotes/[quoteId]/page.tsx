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
  AdminQuoteAmountsSection,
  AdminQuoteDeliverySection,
  AdminQuoteHeaderSection,
  AdminQuoteItemsSection,
  AdminQuoteMetaSidebar,
  AdminQuoteRevisionRequestsSection,
  AdminQuoteVersionsSection,
} from "@/features/admin/components/product/quotes/admin-quote-detail";
import { withAdminViewLog } from "@/features/admin/page-shell";
import {
  getAdminQuoteDetailCore,
  getAdminQuoteEmails,
  getAdminQuoteItems,
  getAdminQuoteRevisionRequests,
  getAdminQuoteVersions,
} from "@/features/admin/queries";
import { createNoIndexMetadata } from "@/lib/seo/site";

export const instant = true;

export const metadata: Metadata = createNoIndexMetadata({
  absoluteTitle: "Quote - Requo admin",
  description: "Read-only details for a customer quote.",
});

type AdminQuoteDetailPageProps = {
  params: Promise<{ quoteId: string }>;
};

/**
 * Admin quote detail — staged structural shell.
 *
 * Read-only inspection leading with delivery (sent / viewed / responded
 * plus the matching delivery emails), then amounts, items, versions, and
 * revision requests. No customer-facing editing.
 *
 * The page returns its layout frames synchronously; the core row (one
 * indexed lookup) paints the header, amounts, and sidebar metadata
 * first, and items, versions, revision requests, and the delivery-email
 * feed each stream behind their own boundary — no full-page skeleton.
 * Records a `view.quote` audit entry with `targetId = quoteId` via
 * `withAdminViewLog`.
 */
export default function AdminQuoteDetailPage({
  params,
}: AdminQuoteDetailPageProps) {
  return (
    <DashboardPage>
      <Suspense fallback={<AdminDetailHeaderFallback />}>
        <AdminQuoteHeaderRegion params={params} />
      </Suspense>

      <DashboardDetailLayout className="xl:grid-cols-[minmax(0,1.1fr)_0.9fr]">
        <div className="flex min-w-0 flex-col gap-6">
          <Suspense fallback={<AdminDetailSectionFallback rows={4} />}>
            <AdminQuoteDeliveryRegion params={params} />
          </Suspense>
          <Suspense fallback={<AdminDetailSectionFallback />}>
            <AdminQuoteAmountsRegion params={params} />
          </Suspense>
          <Suspense fallback={<AdminDetailSectionFallback rows={4} />}>
            <AdminQuoteItemsRegion params={params} />
          </Suspense>
          <Suspense fallback={<AdminDetailSectionFallback rows={2} />}>
            <AdminQuoteVersionsRegion params={params} />
          </Suspense>
          <Suspense fallback={<AdminDetailSectionFallback rows={2} />}>
            <AdminQuoteRevisionRequestsRegion params={params} />
          </Suspense>
        </div>

        <DashboardSidebarStack>
          <Suspense fallback={<AdminDetailSectionFallback rows={2} />}>
            <AdminQuoteMetaSidebarRegion params={params} />
          </Suspense>
        </DashboardSidebarStack>
      </DashboardDetailLayout>
    </DashboardPage>
  );
}

async function AdminQuoteHeaderRegion({
  params,
}: AdminQuoteDetailPageProps) {
  const { quoteId } = await params;

  return withAdminViewLog(
    {
      action: "view.quote",
      targetType: "quote",
      targetId: quoteId,
    },
    async () => {
      const core = await getAdminQuoteDetailCore(quoteId);

      if (!core) {
        notFound();
      }

      return <AdminQuoteHeaderSection detail={core} />;
    },
  );
}

async function AdminQuoteDeliveryRegion({
  params,
}: AdminQuoteDetailPageProps) {
  const { quoteId } = await params;
  const core = await getAdminQuoteDetailCore(quoteId);

  if (!core) {
    notFound();
  }

  // The delivery summary answers whether the quote reached the customer,
  // which needs the email rows — so the section resolves them together.
  // Items, versions, and revision requests stream independently below.
  const emails = await getAdminQuoteEmails(quoteId, core.businessId);

  return <AdminQuoteDeliverySection detail={core} emails={emails} />;
}

async function AdminQuoteAmountsRegion({
  params,
}: AdminQuoteDetailPageProps) {
  const { quoteId } = await params;
  const core = await getAdminQuoteDetailCore(quoteId);

  if (!core) {
    notFound();
  }

  return <AdminQuoteAmountsSection detail={core} />;
}

async function AdminQuoteItemsRegion({
  params,
}: AdminQuoteDetailPageProps) {
  const { quoteId } = await params;
  const [core, items] = await Promise.all([
    getAdminQuoteDetailCore(quoteId),
    getAdminQuoteItems(quoteId),
  ]);

  if (!core) {
    notFound();
  }

  return <AdminQuoteItemsSection currency={core.currency} items={items} />;
}

async function AdminQuoteVersionsRegion({
  params,
}: AdminQuoteDetailPageProps) {
  const { quoteId } = await params;
  const versions = await getAdminQuoteVersions(quoteId);

  return <AdminQuoteVersionsSection versions={versions} />;
}

async function AdminQuoteRevisionRequestsRegion({
  params,
}: AdminQuoteDetailPageProps) {
  const { quoteId } = await params;
  const revisionRequests = await getAdminQuoteRevisionRequests(quoteId);

  return (
    <AdminQuoteRevisionRequestsSection revisionRequests={revisionRequests} />
  );
}

async function AdminQuoteMetaSidebarRegion({
  params,
}: AdminQuoteDetailPageProps) {
  const { quoteId } = await params;
  const core = await getAdminQuoteDetailCore(quoteId);

  if (!core) {
    notFound();
  }

  return <AdminQuoteMetaSidebar detail={core} />;
}
