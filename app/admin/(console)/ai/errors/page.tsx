import type { Metadata } from "next";
import { Suspense } from "react";

import { DashboardPage } from "@/components/shared/dashboard-layout";
import { PageHeader } from "@/components/shared/page-header";
import {
  AdminListContentFallback,
  AdminListControlsFallback,
  AdminAiErrorsContentSection,
  AdminAiErrorsControlsSection,
} from "@/features/admin/components/ai/admin-ai-errors-sections";
import { withAdminViewLog } from "@/features/admin/page-shell";
import { createNoIndexMetadata } from "@/lib/seo/site";

export const instant = true;

export const metadata: Metadata = createNoIndexMetadata({
  absoluteTitle: "AI errors - Requo admin",
  description: "Failed AI calls and security events.",
});

type SearchParamsRecord = Record<string, string | string[] | undefined>;

type AdminAiErrorsPageProps = {
  searchParams: Promise<SearchParamsRecord>;
};

export default function AdminAiErrorsPage({
  searchParams,
}: AdminAiErrorsPageProps) {
  return (
    <Suspense fallback={<AdminAiErrorsListFallback />}>
      <AdminAiErrorsPageContent searchParams={searchParams} />
    </Suspense>
  );
}

function AdminAiErrorsListFallback() {
  return (
    <DashboardPage>
      <PageHeader
        description="Failed AI calls and security events."
        eyebrow="Admin"
        title="AI errors"
      />
      <div className="dashboard-table-shell" data-list-card>
        <AdminListControlsFallback />
        <AdminListContentFallback />
      </div>
    </DashboardPage>
  );
}

async function AdminAiErrorsPageContent({
  searchParams,
}: AdminAiErrorsPageProps) {
  const rawParams = await searchParams;

  return withAdminViewLog(
    { action: "view.ai-errors", targetType: "ai-request" },
    () => (
      <DashboardPage>
        <PageHeader
          description="Failed AI calls and security events."
          eyebrow="Admin"
          title="AI errors"
        />
        <div className="dashboard-table-shell" data-list-card>
          <Suspense fallback={<AdminListControlsFallback />}>
            <AdminAiErrorsControlsSection rawParams={rawParams} />
          </Suspense>
          <Suspense fallback={<AdminListContentFallback />}>
            <AdminAiErrorsContentSection rawParams={rawParams} />
          </Suspense>
        </div>
      </DashboardPage>
    ),
  );
}
