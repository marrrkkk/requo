import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { DashboardPage } from "@/components/shared/dashboard-layout";
import { AdminInquiryDetail } from "@/features/admin/components/product/inquiries/admin-inquiry-detail";
import { withAdminViewLog } from "@/features/admin/page-shell";
import { getAdminInquiryDetail } from "@/features/admin/queries";
import { createNoIndexMetadata } from "@/lib/seo/site";

import AdminLoading from "../../loading";

export const instant = true;

export const metadata: Metadata = createNoIndexMetadata({
  absoluteTitle: "Inquiry - Requo admin",
  description: "Read-only details for a customer inquiry.",
});

type AdminInquiryDetailPageProps = {
  params: Promise<{ inquiryId: string }>;
};

/**
 * Admin inquiry detail.
 *
 * Read-only inspection: request content, messages, owner notes,
 * attachment metadata, and linked quotes. No customer-facing editing.
 * Records a `view.inquiry` audit entry with `targetId = inquiryId` via
 * `withAdminViewLog`.
 */
export default function AdminInquiryDetailPage({
  params,
}: AdminInquiryDetailPageProps) {
  return (
    <Suspense fallback={<AdminLoading />}>
      <AdminInquiryDetailPageContent params={params} />
    </Suspense>
  );
}

async function AdminInquiryDetailPageContent({
  params,
}: AdminInquiryDetailPageProps) {
  const { inquiryId } = await params;

  return withAdminViewLog(
    {
      action: "view.inquiry",
      targetType: "inquiry",
      targetId: inquiryId,
    },
    () => renderDetail(inquiryId),
  );
}

async function renderDetail(inquiryId: string) {
  const detail = await getAdminInquiryDetail(inquiryId);

  if (!detail) {
    notFound();
  }

  return (
    <DashboardPage>
      <AdminInquiryDetail detail={detail} />
    </DashboardPage>
  );
}
