import type { Metadata } from "next";
import { Suspense } from "react";

import { DashboardPage } from "@/components/shared/dashboard-layout";
import { PageHeader } from "@/components/shared/page-header";
import { requireAdminUser } from "@/features/admin/access";
import { wrapAdminRouteWithViewLog } from "@/features/admin/audit";
import {
  AdminListContentFallback,
  AdminListControlsFallback,
  AdminUsersListContentSection,
  AdminUsersListControlsSection,
} from "@/features/admin/components/admin-users-list-sections";
import { createNoIndexMetadata } from "@/lib/seo/site";

export const unstable_instant = false;

export const metadata: Metadata = createNoIndexMetadata({
  absoluteTitle: "Users - Requo admin",
  description: "Search, inspect, and support Requo users.",
});

type SearchParamsRecord = Record<string, string | string[] | undefined>;

type AdminUsersPageProps = {
  searchParams: Promise<SearchParamsRecord>;
};

export default function AdminUsersPage({ searchParams }: AdminUsersPageProps) {
  return (
    <Suspense fallback={<AdminListPageFallback />}>
      <AdminUsersPageContent searchParams={searchParams} />
    </Suspense>
  );
}

function AdminListPageFallback() {
  return (
    <DashboardPage>
      <PageHeader
        description="Search, inspect, and support Requo users."
        eyebrow="Admin"
        title="Users"
      />
      <AdminListControlsFallback />
      <AdminListContentFallback />
    </DashboardPage>
  );
}

async function AdminUsersPageContent({ searchParams }: AdminUsersPageProps) {
  const { session, user: admin } = await requireAdminUser();
  const rawParams = await searchParams;

  const renderPage = wrapAdminRouteWithViewLog(
    async () => (
      <DashboardPage>
        <PageHeader
          description="Search, inspect, and support Requo users."
          eyebrow="Admin"
          title="Users"
        />
        <Suspense fallback={<AdminListControlsFallback />}>
          <AdminUsersListControlsSection rawParams={rawParams} />
        </Suspense>
        <Suspense fallback={<AdminListContentFallback />}>
          <AdminUsersListContentSection rawParams={rawParams} />
        </Suspense>
      </DashboardPage>
    ),
    {
      adminUserId: admin.id,
      adminEmail: admin.email,
      impersonatedUserId: session.session?.impersonatedBy
        ? session.user.id
        : null,
    },
    {
      action: "view.users",
      targetType: "user",
    },
  );

  return renderPage();
}
