import type { Metadata } from "next";
import { Suspense } from "react";

import { DashboardPage } from "@/components/shared/dashboard-layout";
import { PageHeader } from "@/components/shared/page-header";
import { AdminSectionsFallback } from "@/features/admin/components/admin-sections-fallback";
import { AdminUsageSections } from "@/features/admin/components/operations/usage/admin-usage-sections";
import { withAdminViewLog } from "@/features/admin/page-shell";
import { adminUsageFiltersSchema } from "@/features/admin/schemas";
import { createNoIndexMetadata } from "@/lib/seo/site";

export const instant = true;

export const metadata: Metadata = createNoIndexMetadata({
  absoluteTitle: "Usage - Requo admin",
  description: "Who is consuming platform resources.",
});

type SearchParamsRecord = Record<string, string | string[] | undefined>;

type AdminUsagePageProps = {
  searchParams: Promise<SearchParamsRecord>;
};

/**
 * Admin usage page — non-blocking structural shell.
 *
 * Platform-wide activity report: totals, a per-day chart, and the
 * top-consuming businesses for one resource. Day range and resource ride
 * the URL. The shell and `PageHeader` return synchronously so the header
 * paints instantly on sibling navigations; filters, the admin gate + view
 * log, and the report resolve inside the region below.
 */
export default function AdminUsagePage({ searchParams }: AdminUsagePageProps) {
  return (
    <DashboardPage>
      <PageHeader
        title="Usage"
        description="Who is consuming platform resources."
      />
      <Suspense fallback={<AdminSectionsFallback />}>
        <AdminUsageRegion searchParams={searchParams} />
      </Suspense>
    </DashboardPage>
  );
}

async function AdminUsageRegion({ searchParams }: AdminUsagePageProps) {
  const rawParams = await searchParams;
  const filters = adminUsageFiltersSchema.safeParse(rawParams).data;
  const days = filters?.days ?? 30;
  const resource = filters?.resource ?? "inquiries";

  return withAdminViewLog({ action: "view.usage", targetType: "usage" }, () => (
    <AdminUsageSections days={days} resource={resource} />
  ));
}
