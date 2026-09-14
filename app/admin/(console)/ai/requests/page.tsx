import type { Metadata } from "next";
import { Suspense } from "react";

import { DashboardPage } from "@/components/shared/dashboard-layout";
import { PageHeader } from "@/components/shared/page-header";
import {
  AdminListContentFallback,
  AdminListControlsFallback,
  AdminAiRequestsListContentSection,
  AdminAiRequestsListControlsSection,
} from "@/features/admin/components/ai/admin-ai-requests-list-sections";
import { withAdminViewLog } from "@/features/admin/page-shell";
import { createNoIndexMetadata } from "@/lib/seo/site";

export const instant = true;

export const metadata: Metadata = createNoIndexMetadata({
  absoluteTitle: "AI requests - Requo admin",
  description: "Per-call provider, model, latency, and tokens.",
});

type SearchParamsRecord = Record<string, string | string[] | undefined>;

type AdminAiRequestsPageProps = {
  searchParams: Promise<SearchParamsRecord>;
};

export default function AdminAiRequestsPage({
  searchParams,
}: AdminAiRequestsPageProps) {
  return (
    <Suspense fallback={<AdminAiRequestsListFallback />}>
      <AdminAiRequestsPageContent searchParams={searchParams} />
    </Suspense>
  );
}

function AdminAiRequestsListFallback() {
  return (
    <DashboardPage>
      <PageHeader
        description="Per-call provider, model, latency, and tokens."
        eyebrow="Admin"
        title="AI requests"
      />
      <div className="dashboard-table-shell" data-list-card>
        <AdminListControlsFallback />
        <AdminListContentFallback />
      </div>
    </DashboardPage>
  );
}

async function AdminAiRequestsPageContent({
  searchParams,
}: AdminAiRequestsPageProps) {
  const rawParams = await searchParams;

  return withAdminViewLog(
    { action: "view.ai-requests", targetType: "ai-request" },
    () => (
      <DashboardPage>
        <PageHeader
          description="Per-call provider, model, latency, and tokens."
          eyebrow="Admin"
          title="AI requests"
        />
        <div className="dashboard-table-shell" data-list-card>
          <Suspense fallback={<AdminListControlsFallback />}>
            <AdminAiRequestsListControlsSection rawParams={rawParams} />
          </Suspense>
          <Suspense fallback={<AdminListContentFallback />}>
            <AdminAiRequestsListContentSection rawParams={rawParams} />
          </Suspense>
        </div>
      </DashboardPage>
    ),
  );
}
