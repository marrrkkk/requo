import type { Metadata } from "next";
import { Suspense } from "react";

import { DashboardPage } from "@/components/shared/dashboard-layout";
import { PageHeader } from "@/components/shared/page-header";
import { requireAdminUser } from "@/features/admin/access";
import { wrapAdminRouteWithViewLog } from "@/features/admin/audit";
import {
  AdminBusinessesListContentSection,
  AdminBusinessesListControlsSection,
  AdminListContentFallback,
  AdminListControlsFallback,
} from "@/features/admin/components/admin-businesses-list-sections";
import { createNoIndexMetadata } from "@/lib/seo/site";

export const unstable_instant = {
  prefetch: "static",
  unstable_disableValidation: true,
};

export const metadata: Metadata = createNoIndexMetadata({
  absoluteTitle: "Businesses · Requo admin",
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
          <AdminListControlsFallback />
          <AdminListContentFallback />
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
  const { session, user: admin } = await requireAdminUser();
  const rawParams = await searchParams;

  const renderPage = wrapAdminRouteWithViewLog(
    async () => (
      <DashboardPage>
        <PageHeader
          description="Read-only review of customer business setups."
          eyebrow="Admin"
          title="Businesses"
        />
        <Suspense fallback={<AdminListControlsFallback />}>
          <AdminBusinessesListControlsSection rawParams={rawParams} />
        </Suspense>
        <Suspense fallback={<AdminListContentFallback />}>
          <AdminBusinessesListContentSection rawParams={rawParams} />
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
      action: "view.businesses",
      targetType: "business",
    },
  );

  return renderPage();
}
