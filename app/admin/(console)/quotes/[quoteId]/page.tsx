import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { DashboardPage } from "@/components/shared/dashboard-layout";
import { AdminQuoteDetail } from "@/features/admin/components/product/quotes/admin-quote-detail";
import { withAdminViewLog } from "@/features/admin/page-shell";
import { getAdminQuoteDetail } from "@/features/admin/queries";
import { createNoIndexMetadata } from "@/lib/seo/site";

import AdminLoading from "../../loading";

export const instant = true;

export const metadata: Metadata = createNoIndexMetadata({
  absoluteTitle: "Quote - Requo admin",
  description: "Read-only details for a customer quote.",
});

type AdminQuoteDetailPageProps = {
  params: Promise<{ quoteId: string }>;
};

/**
 * Admin quote detail.
 *
 * Read-only inspection leading with delivery (sent / viewed / responded
 * plus the matching delivery emails), then amounts, items, versions, and
 * revision requests. No customer-facing editing. Records a `view.quote`
 * audit entry with `targetId = quoteId` via `withAdminViewLog`.
 */
export default function AdminQuoteDetailPage({
  params,
}: AdminQuoteDetailPageProps) {
  return (
    <Suspense fallback={<AdminLoading />}>
      <AdminQuoteDetailPageContent params={params} />
    </Suspense>
  );
}

async function AdminQuoteDetailPageContent({
  params,
}: AdminQuoteDetailPageProps) {
  const { quoteId } = await params;

  return withAdminViewLog(
    {
      action: "view.quote",
      targetType: "quote",
      targetId: quoteId,
    },
    () => renderDetail(quoteId),
  );
}

async function renderDetail(quoteId: string) {
  const detail = await getAdminQuoteDetail(quoteId);

  if (!detail) {
    notFound();
  }

  return (
    <DashboardPage>
      <AdminQuoteDetail detail={detail} />
    </DashboardPage>
  );
}
