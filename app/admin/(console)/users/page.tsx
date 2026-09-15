import type { Metadata } from "next";
import { Suspense } from "react";

import { DashboardPage } from "@/components/shared/dashboard-layout";
import { PageHeader } from "@/components/shared/page-header";
import {
  AdminListContentFallback,
  AdminListControlsFallback,
  AdminUsersListContentSection,
  AdminUsersListControlsSection,
} from "@/features/admin/components/admin-users-list-sections";
import { withAdminViewLog } from "@/features/admin/page-shell";
import { createNoIndexMetadata } from "@/lib/seo/site";

export const instant = true;

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
      <div className="dashboard-table-shell" data-list-card>
        <AdminListControlsFallback />
        <AdminListContentFallback />
      </div>
    </DashboardPage>
  );
}

async function AdminUsersPageContent({ searchParams }: AdminUsersPageProps) {
  const rawParams = await searchParams;

  return withAdminViewLog(
    { action: "view.users", targetType: "user" },
    () => (
      <DashboardPage>
        <PageHeader
          description="Search, inspect, and support Requo users."
          eyebrow="Admin"
          title="Users"
        />
        <div className="dashboard-table-shell" data-list-card>
          <Suspense fallback={<AdminListControlsFallback />}>
            <AdminUsersListControlsSection rawParams={rawParams} />
          </Suspense>
          <Suspense fallback={<AdminListContentFallback />}>
            <AdminUsersListContentSection rawParams={rawParams} />
          </Suspense>
        </div>
      </DashboardPage>
    ),
  );
}
