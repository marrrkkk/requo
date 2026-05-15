import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { requireAdminUser } from "@/features/admin/access";
import { wrapAdminRouteWithViewLog } from "@/features/admin/audit";
import { AdminBusinessDetail } from "@/features/admin/components/admin-business-detail";
import { getAdminBusinessDetail } from "@/features/admin/queries";
import { createNoIndexMetadata } from "@/lib/seo/site";

import AdminLoading from "../../loading";

export const metadata: Metadata = createNoIndexMetadata({
  absoluteTitle: "Business · Requo admin",
  description: "Read-only details for a customer business.",
});

type AdminBusinessDetailPageProps = {
  params: Promise<{ businessId: string }>;
};

/**
 * Admin business detail (task 12.3 / Req 5.3, 5.4).
 *
 * Read-only: identity, owner summary, denormalized plan, member
 * roster, activity counts, and last-activity timestamps. No mutation
 * affordances are rendered per Req 5.4.
 *
 * The top-level component stays sync and wraps the async body in
 * `<Suspense>` so `cacheComponents` can stream the dynamic detail
 * independently of the admin shell. When the business id does not
 * resolve we call `notFound()` before the view log is written so the
 * audit trail only records successful detail opens. Records a
 * `view.business` audit entry with `targetId = business.id` (Req 10.1)
 * via `wrapAdminRouteWithViewLog`.
 */
export default function AdminBusinessDetailPage({
  params,
}: AdminBusinessDetailPageProps) {
  return (
    <Suspense fallback={<AdminLoading />}>
      <AdminBusinessDetailPageContent params={params} />
    </Suspense>
  );
}

async function AdminBusinessDetailPageContent({
  params,
}: AdminBusinessDetailPageProps) {
  const { session, user: admin } = await requireAdminUser();
  const { businessId } = await params;

  const renderPage = wrapAdminRouteWithViewLog(
    async () => renderDetail(businessId),
    {
      adminUserId: admin.id,
      adminEmail: admin.email,
      impersonatedUserId: session.session?.impersonatedBy
        ? session.user.id
        : null,
    },
    {
      action: "view.business",
      targetType: "business",
      targetId: businessId,
    },
  );

  return renderPage();
}

async function renderDetail(businessId: string) {
  const detail = await getAdminBusinessDetail(businessId);

  if (!detail) {
    notFound();
  }

  return <AdminBusinessDetail detail={detail} />;
}
