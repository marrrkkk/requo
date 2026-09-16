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
  AdminInquiryAttachmentsSection,
  AdminInquiryHeaderSection,
  AdminInquiryLinkedQuotesSection,
  AdminInquiryMessagesSection,
  AdminInquiryMetaSidebar,
  AdminInquiryNotesSection,
  AdminInquiryRequestSection,
} from "@/features/admin/components/product/inquiries/admin-inquiry-detail";
import { withAdminViewLog } from "@/features/admin/page-shell";
import {
  getAdminInquiryAttachments,
  getAdminInquiryDetailCore,
  getAdminInquiryLinkedQuotes,
  getAdminInquiryMessages,
  getAdminInquiryNotes,
} from "@/features/admin/queries";
import { createNoIndexMetadata } from "@/lib/seo/site";

export const instant = true;

export const metadata: Metadata = createNoIndexMetadata({
  absoluteTitle: "Inquiry - Requo admin",
  description: "Read-only details for a customer inquiry.",
});

type AdminInquiryDetailPageProps = {
  params: Promise<{ inquiryId: string }>;
};

/**
 * Admin inquiry detail — staged structural shell.
 *
 * Read-only inspection: request content, messages, owner notes,
 * attachment metadata, and linked quotes. No customer-facing editing.
 *
 * The page returns its layout frames synchronously; the core row (one
 * indexed lookup) paints the header, request, and sidebar metadata
 * first, and each feed streams behind its own Suspense boundary — no
 * full-page skeleton. Records a `view.inquiry` audit entry with
 * `targetId = inquiryId` via `withAdminViewLog`.
 */
export default function AdminInquiryDetailPage({
  params,
}: AdminInquiryDetailPageProps) {
  return (
    <DashboardPage>
      <Suspense fallback={<AdminDetailHeaderFallback />}>
        <AdminInquiryHeaderRegion params={params} />
      </Suspense>

      <DashboardDetailLayout className="xl:grid-cols-[minmax(0,1.1fr)_0.9fr]">
        <div className="flex min-w-0 flex-col gap-6">
          <Suspense fallback={<AdminDetailSectionFallback />}>
            <AdminInquiryRequestRegion params={params} />
          </Suspense>
          <Suspense fallback={<AdminDetailSectionFallback rows={4} />}>
            <AdminInquiryMessagesRegion params={params} />
          </Suspense>
          <Suspense fallback={<AdminDetailSectionFallback rows={2} />}>
            <AdminInquiryNotesRegion params={params} />
          </Suspense>
          <Suspense fallback={<AdminDetailSectionFallback rows={2} />}>
            <AdminInquiryAttachmentsRegion params={params} />
          </Suspense>
          <Suspense fallback={<AdminDetailSectionFallback rows={2} />}>
            <AdminInquiryLinkedQuotesRegion params={params} />
          </Suspense>
        </div>

        <DashboardSidebarStack>
          <Suspense fallback={<AdminDetailSectionFallback rows={2} />}>
            <AdminInquiryMetaSidebarRegion params={params} />
          </Suspense>
        </DashboardSidebarStack>
      </DashboardDetailLayout>
    </DashboardPage>
  );
}

async function AdminInquiryHeaderRegion({
  params,
}: AdminInquiryDetailPageProps) {
  const { inquiryId } = await params;

  return withAdminViewLog(
    {
      action: "view.inquiry",
      targetType: "inquiry",
      targetId: inquiryId,
    },
    async () => {
      const core = await getAdminInquiryDetailCore(inquiryId);

      if (!core) {
        notFound();
      }

      return <AdminInquiryHeaderSection detail={core} />;
    },
  );
}

async function AdminInquiryRequestRegion({
  params,
}: AdminInquiryDetailPageProps) {
  const { inquiryId } = await params;
  const core = await getAdminInquiryDetailCore(inquiryId);

  if (!core) {
    notFound();
  }

  return <AdminInquiryRequestSection detail={core} />;
}

async function AdminInquiryMessagesRegion({
  params,
}: AdminInquiryDetailPageProps) {
  const { inquiryId } = await params;
  const [core, messages] = await Promise.all([
    getAdminInquiryDetailCore(inquiryId),
    getAdminInquiryMessages(inquiryId),
  ]);

  if (!core) {
    notFound();
  }

  return (
    <AdminInquiryMessagesSection
      customerName={core.customerName}
      messages={messages}
    />
  );
}

async function AdminInquiryNotesRegion({
  params,
}: AdminInquiryDetailPageProps) {
  const { inquiryId } = await params;
  const notes = await getAdminInquiryNotes(inquiryId);

  return <AdminInquiryNotesSection notes={notes} />;
}

async function AdminInquiryAttachmentsRegion({
  params,
}: AdminInquiryDetailPageProps) {
  const { inquiryId } = await params;
  const attachments = await getAdminInquiryAttachments(inquiryId);

  return <AdminInquiryAttachmentsSection attachments={attachments} />;
}

async function AdminInquiryLinkedQuotesRegion({
  params,
}: AdminInquiryDetailPageProps) {
  const { inquiryId } = await params;
  const linkedQuotes = await getAdminInquiryLinkedQuotes(inquiryId);

  return <AdminInquiryLinkedQuotesSection linkedQuotes={linkedQuotes} />;
}

async function AdminInquiryMetaSidebarRegion({
  params,
}: AdminInquiryDetailPageProps) {
  const { inquiryId } = await params;
  const core = await getAdminInquiryDetailCore(inquiryId);

  if (!core) {
    notFound();
  }

  return <AdminInquiryMetaSidebar detail={core} />;
}
