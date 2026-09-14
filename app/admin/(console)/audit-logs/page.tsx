import type { Metadata } from "next";
import { Suspense } from "react";

import {
  AdminAuditListContentSection,
  AdminAuditListControlsSection,
  AdminAuditListPageShell,
  AdminListContentFallback,
  AdminListControlsFallback,
} from "@/features/admin/components/system/admin-audit-list-sections";
import { withAdminViewLog } from "@/features/admin/page-shell";
import { createNoIndexMetadata } from "@/lib/seo/site";

export const instant = true;

export const metadata: Metadata = createNoIndexMetadata({
  absoluteTitle: "Audit logs - Requo admin",
  description: "Every admin view and action, newest first.",
});

type SearchParamsRecord = Record<string, string | string[] | undefined>;

type AuditLogsPageProps = {
  searchParams: Promise<SearchParamsRecord>;
};

export default function AuditLogsPage({ searchParams }: AuditLogsPageProps) {
  return (
    <Suspense
      fallback={
        <AdminAuditListPageShell>
          <AdminListContentFallback />
        </AdminAuditListPageShell>
      }
    >
      <AuditLogsPageContent searchParams={searchParams} />
    </Suspense>
  );
}

async function AuditLogsPageContent({ searchParams }: AuditLogsPageProps) {
  const rawParams = await searchParams;

  return withAdminViewLog(
    { action: "view.audit-logs", targetType: "audit-log" },
    () => (
      <AdminAuditListPageShell>
        <div className="dashboard-table-shell" data-list-card>
          <Suspense fallback={<AdminListControlsFallback />}>
            <AdminAuditListControlsSection rawParams={rawParams} />
          </Suspense>
          <Suspense fallback={<AdminListContentFallback />}>
            <AdminAuditListContentSection rawParams={rawParams} />
          </Suspense>
        </div>
      </AdminAuditListPageShell>
    ),
  );
}
