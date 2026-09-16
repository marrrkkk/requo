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
  AdminUserHeaderSection,
  AdminUserOverviewSection,
  AdminUserOwnedBusinessesSection,
  AdminUserRecentAuditSection,
  AdminUserRecordSidebar,
} from "@/features/admin/components/admin-user-detail";
import { withAdminViewLog } from "@/features/admin/page-shell";
import {
  getAdminUserDetailCore,
  getAdminUserOwnedBusinesses,
  getAdminUserRecentAuditLogs,
} from "@/features/admin/queries";
import { timed } from "@/lib/dev/server-timing";
import { createNoIndexMetadata } from "@/lib/seo/site";

export const instant = true;

export const metadata: Metadata = createNoIndexMetadata({
  absoluteTitle: "User - Requo admin",
  description: "Inspect a Requo user and run support actions.",
});

type AdminUserDetailPageProps = {
  params: Promise<{ userId: string }>;
};

/**
 * Admin user detail page (task 12.2 / Req 3.3, 4.x, 8.1, 9.1).
 *
 * Renders the header (identity + account badges + action toolbar), the
 * main column (overview, owned businesses, recent audit), and the
 * record sidebar — the same composition as the business detail view.
 *
 * The page returns its layout frames synchronously; the core row (one
 * indexed lookup plus scalar aggregates) paints the header, overview,
 * and record sidebar first, and the owned-business roster and recent
 * audit feed each stream behind their own boundary. Writes a `view.user`
 * audit row on every render via `withAdminViewLog` (Req 10.1). The
 * target user id is captured in the audit row so the audit feed can be
 * filtered by target.
 */
export default function AdminUserDetailPage({
  params,
}: AdminUserDetailPageProps) {
  return (
    <DashboardPage>
      <Suspense fallback={<AdminDetailHeaderFallback />}>
        <AdminUserHeaderRegion params={params} />
      </Suspense>

      <DashboardDetailLayout className="xl:grid-cols-[minmax(0,1.1fr)_0.9fr]">
        <div className="flex min-w-0 flex-col gap-6">
          <Suspense fallback={<AdminDetailSectionFallback />}>
            <AdminUserOverviewRegion params={params} />
          </Suspense>
          <Suspense fallback={<AdminDetailSectionFallback />}>
            <AdminUserOwnedBusinessesRegion params={params} />
          </Suspense>
          <Suspense fallback={<AdminDetailSectionFallback rows={2} />}>
            <AdminUserRecentAuditRegion params={params} />
          </Suspense>
        </div>

        <DashboardSidebarStack>
          <Suspense fallback={<AdminDetailSectionFallback rows={2} />}>
            <AdminUserRecordSidebarRegion params={params} />
          </Suspense>
        </DashboardSidebarStack>
      </DashboardDetailLayout>
    </DashboardPage>
  );
}

async function AdminUserHeaderRegion({ params }: AdminUserDetailPageProps) {
  const { userId } = await params;

  return withAdminViewLog(
    {
      action: "view.user",
      targetType: "user",
      targetId: userId,
    },
    async (context) => {
      // The header meta names the owned-business count, so it resolves
      // the roster's length alongside the core row. Both are indexed
      // lookups; the audit feed below streams on its own.
      const [core, ownedBusinesses] = await Promise.all([
        timed("adminUserDetail.getAdminUserDetailCore", getAdminUserDetailCore(userId)),
        getAdminUserOwnedBusinesses(userId),
      ]);

      if (!core) {
        notFound();
      }

      return (
        <AdminUserHeaderSection
          adminUserId={context.user.id}
          ownedBusinessCount={ownedBusinesses.length}
          user={core}
        />
      );
    },
  );
}

async function AdminUserOverviewRegion({ params }: AdminUserDetailPageProps) {
  const { userId } = await params;
  const [core, ownedBusinesses, recentAuditLogs] = await Promise.all([
    getAdminUserDetailCore(userId),
    getAdminUserOwnedBusinesses(userId),
    getAdminUserRecentAuditLogs(userId),
  ]);

  if (!core) {
    notFound();
  }

  return (
    <AdminUserOverviewSection
      ownedBusinesses={ownedBusinesses}
      recentAuditLogs={recentAuditLogs}
      user={core}
    />
  );
}

async function AdminUserOwnedBusinessesRegion({
  params,
}: AdminUserDetailPageProps) {
  const { userId } = await params;
  const ownedBusinesses = await getAdminUserOwnedBusinesses(userId);

  return (
    <AdminUserOwnedBusinessesSection ownedBusinesses={ownedBusinesses} />
  );
}

async function AdminUserRecentAuditRegion({
  params,
}: AdminUserDetailPageProps) {
  const { userId } = await params;
  const recentAuditLogs = await getAdminUserRecentAuditLogs(userId);

  return <AdminUserRecentAuditSection recentAuditLogs={recentAuditLogs} />;
}

async function AdminUserRecordSidebarRegion({
  params,
}: AdminUserDetailPageProps) {
  const { userId } = await params;
  const core = await getAdminUserDetailCore(userId);

  if (!core) {
    notFound();
  }

  return <AdminUserRecordSidebar user={core} />;
}
