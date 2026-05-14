import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { DashboardSettingsSkeleton } from "@/components/shell/dashboard-settings-skeleton";
import { PageHeader } from "@/components/shared/page-header";
import { BusinessAuditLogFilters } from "@/features/audit/components/workspace-audit-log-filters";
import { BusinessAuditLogTable } from "@/features/audit/components/workspace-audit-log-table";
import {
  getBusinessAuditLogFiltersBySlug,
  getBusinessAuditLogPageBySlug,
  parseAuditLogFilters,
} from "@/features/audit/queries";
import { getBusinessSettingsPath } from "@/features/businesses/routes";
import { getBusinessOperationalPageContext } from "@/app/businesses/[slug]/(main)/settings/_lib/page-context";
import { createNoIndexMetadata } from "@/lib/seo/site";

export const metadata: Metadata = createNoIndexMetadata({
  title: "Audit log",
  description: "Review meaningful admin, lifecycle, and security actions.",
});

export const unstable_instant = {
  prefetch: "static",
  unstable_disableValidation: true,
};

export default function AuditLogSettingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <div className="flex flex-col gap-6 lg:gap-8">
      <PageHeader
        title="Audit log"
        description="Review meaningful admin, lifecycle, billing, and security actions for this business."
      />
      <Suspense fallback={<DashboardSettingsSkeleton />}>
        <AuditLogContent params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function AuditLogContent({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ slug }, resolvedSearchParams] = await Promise.all([
    params,
    searchParams,
  ]);
  const { user, businessContext } = await getBusinessOperationalPageContext(slug);
  const businessSlug = businessContext.business.slug;
  const filters = parseAuditLogFilters(resolvedSearchParams);

  const [page, filterOptions] = await Promise.all([
    getBusinessAuditLogPageBySlug(user.id, businessSlug, filters),
    getBusinessAuditLogFiltersBySlug(user.id, businessSlug),
  ]);

  if (!page || !filterOptions) {
    notFound();
  }

  const actionPath = getBusinessSettingsPath(businessSlug, "audit-log");

  return (
    <div className="flex flex-col gap-6">
      <BusinessAuditLogFilters
        action={actionPath}
        filters={filters}
        options={filterOptions}
      />
      <BusinessAuditLogTable page={page} />
    </div>
  );
}
