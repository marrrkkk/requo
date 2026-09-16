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
  AdminEmailBodySection,
  AdminEmailDeliverySection,
  AdminEmailHeaderSection,
  AdminEmailMetaSidebar,
  AdminEmailTimelineSection,
} from "@/features/admin/components/operations/emails/admin-email-detail";
import { withAdminViewLog } from "@/features/admin/page-shell";
import {
  getAdminEmailBody,
  getAdminEmailDetailCore,
  getAdminEmailTimeline,
} from "@/features/admin/queries";
import { createNoIndexMetadata } from "@/lib/seo/site";

export const instant = true;

export const metadata: Metadata = createNoIndexMetadata({
  absoluteTitle: "Email - Requo admin",
  description: "Read-only delivery details for a transactional email.",
});

type AdminEmailDetailPageProps = {
  params: Promise<{ emailId: string }>;
};

/**
 * Admin email detail — staged structural shell.
 *
 * Read-only inspection: delivery state, provider attempts, and the body —
 * except auth emails, whose bodies stay redacted.
 *
 * The page returns its layout frames synchronously; the core row (one
 * indexed lookup) paints the header, delivery state, recipients, and
 * business sidebar first, and the body and attempt timeline each stream
 * behind their own boundary — no full-page skeleton. Records a
 * `view.email` audit entry with `targetId = emailId` via
 * `withAdminViewLog`.
 */
export default function AdminEmailDetailPage({
  params,
}: AdminEmailDetailPageProps) {
  return (
    <DashboardPage>
      <Suspense fallback={<AdminDetailHeaderFallback />}>
        <AdminEmailHeaderRegion params={params} />
      </Suspense>

      <DashboardDetailLayout className="xl:grid-cols-[minmax(0,1.1fr)_0.9fr]">
        <div className="flex min-w-0 flex-col gap-6">
          <Suspense fallback={<AdminDetailSectionFallback />}>
            <AdminEmailDeliveryRegion params={params} />
          </Suspense>
          <Suspense fallback={<AdminDetailSectionFallback rows={4} />}>
            <AdminEmailTimelineRegion params={params} />
          </Suspense>
          <Suspense fallback={<AdminDetailSectionFallback rows={4} />}>
            <AdminEmailBodyRegion params={params} />
          </Suspense>
        </div>

        <DashboardSidebarStack>
          <Suspense fallback={<AdminDetailSectionFallback rows={2} />}>
            <AdminEmailMetaSidebarRegion params={params} />
          </Suspense>
        </DashboardSidebarStack>
      </DashboardDetailLayout>
    </DashboardPage>
  );
}

async function AdminEmailHeaderRegion({ params }: AdminEmailDetailPageProps) {
  const { emailId } = await params;

  return withAdminViewLog(
    {
      action: "view.email",
      targetType: "email",
      targetId: emailId,
    },
    async () => {
      const core = await getAdminEmailDetailCore(emailId);

      if (!core) {
        notFound();
      }

      return <AdminEmailHeaderSection detail={core} />;
    },
  );
}

async function AdminEmailDeliveryRegion({ params }: AdminEmailDetailPageProps) {
  const { emailId } = await params;
  const core = await getAdminEmailDetailCore(emailId);

  if (!core) {
    notFound();
  }

  return <AdminEmailDeliverySection detail={core} />;
}

async function AdminEmailTimelineRegion({ params }: AdminEmailDetailPageProps) {
  const { emailId } = await params;
  // The section names the delivery state in its empty copy, so it reads
  // the (cached) core row alongside its own attempt feed.
  const [core, attempts] = await Promise.all([
    getAdminEmailDetailCore(emailId),
    getAdminEmailTimeline(emailId),
  ]);

  if (!core) {
    notFound();
  }

  return <AdminEmailTimelineSection attempts={attempts} status={core.status} />;
}

async function AdminEmailBodyRegion({ params }: AdminEmailDetailPageProps) {
  const { emailId } = await params;
  const [core, body] = await Promise.all([
    getAdminEmailDetailCore(emailId),
    getAdminEmailBody(emailId),
  ]);

  if (!core || !body) {
    notFound();
  }

  return <AdminEmailBodySection body={body} subject={core.subject} />;
}

async function AdminEmailMetaSidebarRegion({
  params,
}: AdminEmailDetailPageProps) {
  const { emailId } = await params;
  const core = await getAdminEmailDetailCore(emailId);

  if (!core) {
    notFound();
  }

  return <AdminEmailMetaSidebar detail={core} />;
}
