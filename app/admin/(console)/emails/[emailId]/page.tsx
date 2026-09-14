import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { DashboardPage } from "@/components/shared/dashboard-layout";
import { AdminEmailDetailView } from "@/features/admin/components/operations/emails/admin-email-detail";
import { withAdminViewLog } from "@/features/admin/page-shell";
import { getAdminEmailDetail } from "@/features/admin/queries";
import { createNoIndexMetadata } from "@/lib/seo/site";

import AdminLoading from "../../loading";

export const instant = true;

export const metadata: Metadata = createNoIndexMetadata({
  absoluteTitle: "Email - Requo admin",
  description: "Read-only delivery details for a transactional email.",
});

type AdminEmailDetailPageProps = {
  params: Promise<{ emailId: string }>;
};

/**
 * Admin email detail.
 *
 * Read-only inspection: delivery state, provider attempts, and the body —
 * except auth emails, whose bodies stay redacted. Records a `view.email`
 * audit entry with `targetId = emailId` via `withAdminViewLog`.
 */
export default function AdminEmailDetailPage({
  params,
}: AdminEmailDetailPageProps) {
  return (
    <Suspense fallback={<AdminLoading />}>
      <AdminEmailDetailPageContent params={params} />
    </Suspense>
  );
}

async function AdminEmailDetailPageContent({
  params,
}: AdminEmailDetailPageProps) {
  const { emailId } = await params;

  return withAdminViewLog(
    {
      action: "view.email",
      targetType: "email",
      targetId: emailId,
    },
    () => renderDetail(emailId),
  );
}

async function renderDetail(emailId: string) {
  const detail = await getAdminEmailDetail(emailId);

  if (!detail) {
    notFound();
  }

  return (
    <DashboardPage>
      <AdminEmailDetailView detail={detail} />
    </DashboardPage>
  );
}
