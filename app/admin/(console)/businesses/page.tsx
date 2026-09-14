import type { Metadata } from "next";
import { Suspense } from "react";

import { DashboardPage } from "@/components/shared/dashboard-layout";
import { PageHeader } from "@/components/shared/page-header";
import {
  AdminBusinessesListContentSection,
  AdminBusinessesListControlsSection,
  AdminListContentFallback,
  AdminListControlsFallback,
} from "@/features/admin/components/admin-businesses-list-sections";
import { withAdminViewLog } from "@/features/admin/page-shell";
import { createNoIndexMetadata } from "@/lib/seo/site";

export const instant = true;

export const metadata: Metadata = createNoIndexMetadata({
  absoluteTitle: "Businesses - Requo admin",
  description: "Read-only review of customer business setups.",
});

type SearchParamsRecord = Record<string, string | string[] | undefined>;

type AdminBusinessesPageProps = {
  searchParams: Promise<SearchParamsRecord>;
};

export default function AdminBusinessesPage({
  searchParams,
}: AdminBusinessesPageProps) {
  return (
      <Suspense
      fallback={
        <DashboardPage>
          <PageHeader
            description="Read-only review of customer business setups."
            eyebrow="Admin"
            title="Businesses"
          />
          <div className="dashboard-table-shell" data-list-card>
            <AdminListControlsFallback />
            <AdminListContentFallback />
          </div>
        </DashboardPage>
      }
    >
      <AdminBusinessesPageContent searchParams={searchParams} />
    </Suspense>
  );
}

async function AdminBusinessesPageContent({
  searchParams,
}: AdminBusinessesPageProps) {
  const rawParams = await searchParams;

  return withAdminViewLog(
    { action: "view.businesses", targetType: "business" },
    () => (
      <DashboardPage>
        <PageHeader
          description="Read-only review of customer business setups."
          eyebrow="Admin"
          title="Businesses"
        />
        <div className="dashboard-table-shell" data-list-card>
          <Suspense fallback={<AdminListControlsFallback />}>
            <AdminBusinessesListControlsSection rawParams={rawParams} />
          </Suspense>
          <Suspense fallback={<AdminListContentFallback />}>
            <AdminBusinessesListContentSection rawParams={rawParams} />
          </Suspense>
        </div>
      </DashboardPage>
    ),
  );
}
