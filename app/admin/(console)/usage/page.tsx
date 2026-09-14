import type { Metadata } from "next";
import { Suspense } from "react";

import { DashboardPage } from "@/components/shared/dashboard-layout";
import { PageHeader } from "@/components/shared/page-header";
import { AdminUsageSections } from "@/features/admin/components/operations/usage/admin-usage-sections";
import { withAdminViewLog } from "@/features/admin/page-shell";
import { adminUsageFiltersSchema } from "@/features/admin/schemas";
import { createNoIndexMetadata } from "@/lib/seo/site";

import AdminLoading from "../loading";

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
 * Admin usage page.
 *
 * Platform-wide activity report: totals, a per-day chart, and the
 * top-consuming businesses for one resource. Day range and resource ride
 * the URL. Records a `view.usage` audit entry via `withAdminViewLog`.
 */
export default function AdminUsagePage({ searchParams }: AdminUsagePageProps) {
  return (
    <Suspense fallback={<AdminLoading />}>
      <AdminUsagePageContent searchParams={searchParams} />
    </Suspense>
  );
}

async function AdminUsagePageContent({ searchParams }: AdminUsagePageProps) {
  const rawParams = await searchParams;
  const filters = adminUsageFiltersSchema.safeParse(rawParams).data;
  const days = filters?.days ?? 30;
  const resource = filters?.resource ?? "inquiries";

  return withAdminViewLog(
    { action: "view.usage", targetType: "usage" },
    () => (
      <DashboardPage>
        <PageHeader
          eyebrow="Admin"
          title="Usage"
          description="Who is consuming platform resources."
        />
        <AdminUsageSections days={days} resource={resource} />
      </DashboardPage>
    ),
  );
}
