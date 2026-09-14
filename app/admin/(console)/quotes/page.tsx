import type { Metadata } from "next";
import { Suspense } from "react";

import { DashboardPage } from "@/components/shared/dashboard-layout";
import { PageHeader } from "@/components/shared/page-header";
import {
  AdminListContentFallback,
  AdminListControlsFallback,
  AdminQuotesListContentSection,
  AdminQuotesListControlsSection,
} from "@/features/admin/components/product/quotes/admin-quotes-list-sections";
import { withAdminViewLog } from "@/features/admin/page-shell";
import { createNoIndexMetadata } from "@/lib/seo/site";

export const instant = true;

export const metadata: Metadata = createNoIndexMetadata({
  absoluteTitle: "Quotes - Requo admin",
  description: "Quote drafts, deliveries, and customer responses.",
});

type SearchParamsRecord = Record<string, string | string[] | undefined>;

type AdminQuotesPageProps = {
  searchParams: Promise<SearchParamsRecord>;
};

export default function AdminQuotesPage({
  searchParams,
}: AdminQuotesPageProps) {
  return (
    <Suspense fallback={<AdminQuotesListFallback />}>
      <AdminQuotesPageContent searchParams={searchParams} />
    </Suspense>
  );
}

function AdminQuotesListFallback() {
  return (
    <DashboardPage>
      <PageHeader
        description="Quote drafts, deliveries, and customer responses."
        eyebrow="Admin"
        title="Quotes"
      />
      <div className="dashboard-table-shell" data-list-card>
        <AdminListControlsFallback />
        <AdminListContentFallback />
      </div>
    </DashboardPage>
  );
}

async function AdminQuotesPageContent({
  searchParams,
}: AdminQuotesPageProps) {
  const rawParams = await searchParams;

  return withAdminViewLog(
    { action: "view.quotes", targetType: "quote" },
    () => (
      <DashboardPage>
        <PageHeader
          description="Quote drafts, deliveries, and customer responses."
          eyebrow="Admin"
          title="Quotes"
        />
        <div className="dashboard-table-shell" data-list-card>
          <Suspense fallback={<AdminListControlsFallback />}>
            <AdminQuotesListControlsSection rawParams={rawParams} />
          </Suspense>
          <Suspense fallback={<AdminListContentFallback />}>
            <AdminQuotesListContentSection rawParams={rawParams} />
          </Suspense>
        </div>
      </DashboardPage>
    ),
  );
}
