import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { DashboardPage } from "@/components/shared/dashboard-layout";
import { AdminBusinessDetail } from "@/features/admin/components/admin-business-detail";
import { withAdminViewLog } from "@/features/admin/page-shell";
import {
  getAdminBusinessBilling,
  getAdminBusinessDetail,
} from "@/features/admin/queries";
import { createNoIndexMetadata } from "@/lib/seo/site";

import AdminLoading from "../../loading";

export const instant = true;

export const metadata: Metadata = createNoIndexMetadata({
  absoluteTitle: "Business - Requo admin",
  description: "Read-only details for a customer business.",
});

type AdminBusinessDetailPageProps = {
  params: Promise<{ businessId: string }>;
};

/**
 * Admin business detail (task 12.3 / Req 5.3, 5.4).
 *
 * Read-only: identity, owner summary, denormalized plan, member
 * roster, activity counts, last-activity timestamps, and the billing
 * section (effective cached plan + owner's account subscription +
 * business subscription, each labelled with its source). No mutation
 * affordances are rendered per Req 5.4 — overrides live on the owner's
 * user detail page.
 *
 * The top-level component stays sync and wraps the async body in
 * `<Suspense>` so `cacheComponents` can stream the dynamic detail
 * independently of the admin shell. Records a `view.business` audit
 * entry with `targetId = businessId` (Req 10.1) via `withAdminViewLog`.
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
  const { businessId } = await params;

  return withAdminViewLog(
    {
      action: "view.business",
      targetType: "business",
      targetId: businessId,
    },
    () => renderDetail(businessId),
  );
}

async function renderDetail(businessId: string) {
  const [detail, billing] = await Promise.all([
    getAdminBusinessDetail(businessId),
    getAdminBusinessBilling(businessId),
  ]);

  if (!detail) {
    notFound();
  }

  return (
    <DashboardPage>
      <AdminBusinessDetail billing={billing} detail={detail} />
    </DashboardPage>
  );
}
