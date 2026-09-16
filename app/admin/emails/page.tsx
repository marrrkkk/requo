import type { Metadata } from "next";
import { Suspense } from "react";

import { DashboardPage } from "@/components/shared/dashboard-layout";
import { PageHeader } from "@/components/shared/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AdminListContentFallback,
  AdminListControlsFallback,
  AdminEmailsListContentSection,
  AdminEmailsListControlsSection,
} from "@/features/admin/components/operations/emails/admin-emails-list-sections";
import { AdminEmailQuotasSection } from "@/features/admin/components/operations/emails/admin-email-quotas";
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

/**
 * Admin emails list — non-blocking structural shell.
 *
 * Returns the `DashboardPage` shell and `PageHeader` synchronously so the
 * header paints instantly on sibling navigations. All dynamic reads
 * (`searchParams`, the admin gate + view log, queries) resolve inside the
 * Suspense-wrapped regions below. The view audit row is written once, from
 * the content region.
 */
export default function AdminEmailsPage({
  searchParams,
}: AdminEmailsPageProps) {
  return (
    <DashboardPage>
      <PageHeader
        description="Transactional email delivery and failures."
        title="Emails"
      />
      <Suspense fallback={<QuotasFallback />}>
        <AdminEmailQuotasRegion />
      </Suspense>
      <div className="dashboard-table-shell" data-list-card>
        <Suspense fallback={<AdminListControlsFallback />}>
          <AdminEmailsControlsRegion searchParams={searchParams} />
        </Suspense>
        <Suspense fallback={<AdminListContentFallback />}>
          <AdminEmailsContentRegion searchParams={searchParams} />
        </Suspense>
      </div>
    </DashboardPage>
  );
}

async function AdminEmailQuotasRegion() {
  return <AdminEmailQuotasSection />;
}

async function AdminEmailsControlsRegion({
  searchParams,
}: AdminEmailsPageProps) {
  const rawParams = await searchParams;

  return <AdminEmailsListControlsSection rawParams={rawParams} />;
}

async function AdminEmailsContentRegion({
  searchParams,
}: AdminEmailsPageProps) {
  const rawParams = await searchParams;

  return withAdminViewLog(
    { action: "view.emails", targetType: "email" },
    () => <AdminEmailsListContentSection rawParams={rawParams} />,
  );
}

function QuotasFallback() {
  return (
    <div className="section-panel space-y-3">
      <Skeleton className="h-5 w-32 rounded-md" />
      <div className="grid gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton className="h-24 w-full rounded-lg" key={index} />
        ))}
      </div>
    </div>
  );
}
