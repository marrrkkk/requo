import type { Metadata } from "next";
import { Suspense } from "react";

import { DashboardPage } from "@/components/shared/dashboard-layout";
import { PageHeader } from "@/components/shared/page-header";
import {
  AdminListContentFallback,
  AdminListControlsFallback,
  AdminEmailsListContentSection,
  AdminEmailsListControlsSection,
} from "@/features/admin/components/operations/emails/admin-emails-list-sections";
import { withAdminViewLog } from "@/features/admin/page-shell";
import { createNoIndexMetadata } from "@/lib/seo/site";

export const instant = true;

export const metadata: Metadata = createNoIndexMetadata({
  absoluteTitle: "Emails - Requo admin",
  description: "Transactional email delivery and failures.",
});

type SearchParamsRecord = Record<string, string | string[] | undefined>;

type AdminEmailsPageProps = {
  searchParams: Promise<SearchParamsRecord>;
};

export default function AdminEmailsPage({
  searchParams,
}: AdminEmailsPageProps) {
  return (
    <Suspense fallback={<AdminEmailsListFallback />}>
      <AdminEmailsPageContent searchParams={searchParams} />
    </Suspense>
  );
}

function AdminEmailsListFallback() {
  return (
    <DashboardPage>
      <PageHeader
        description="Transactional email delivery and failures."
        eyebrow="Admin"
        title="Emails"
      />
      <div className="dashboard-table-shell" data-list-card>
        <AdminListControlsFallback />
        <AdminListContentFallback />
      </div>
    </DashboardPage>
  );
}

async function AdminEmailsPageContent({
  searchParams,
}: AdminEmailsPageProps) {
  const rawParams = await searchParams;

  return withAdminViewLog(
    { action: "view.emails", targetType: "email" },
    () => (
      <DashboardPage>
        <PageHeader
          description="Transactional email delivery and failures."
          eyebrow="Admin"
          title="Emails"
        />
        <div className="dashboard-table-shell" data-list-card>
          <Suspense fallback={<AdminListControlsFallback />}>
            <AdminEmailsListControlsSection rawParams={rawParams} />
          </Suspense>
          <Suspense fallback={<AdminListContentFallback />}>
            <AdminEmailsListContentSection rawParams={rawParams} />
          </Suspense>
        </div>
      </DashboardPage>
    ),
  );
}
