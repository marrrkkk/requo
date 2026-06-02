import type { Metadata } from "next";
import { Suspense } from "react";

import { requireAdminUser } from "@/features/admin/access";
import { wrapAdminRouteWithViewLog } from "@/features/admin/audit";
import {
  AdminAuditListContentSection,
  AdminAuditListPageShell,
  AdminListContentFallback,
} from "@/features/admin/components/admin-audit-list-sections";
import { createNoIndexMetadata } from "@/lib/seo/site";

export const unstable_instant = {
  prefetch: "static",
  unstable_disableValidation: true,
};

export const metadata: Metadata = createNoIndexMetadata({
  absoluteTitle: "Audit logs · Requo admin",
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
  const { session, user: admin } = await requireAdminUser();
  const rawParams = await searchParams;

  const renderPage = wrapAdminRouteWithViewLog(
    async () => (
      <AdminAuditListPageShell>
        <Suspense fallback={<AdminListContentFallback />}>
          <AdminAuditListContentSection rawParams={rawParams} />
        </Suspense>
      </AdminAuditListPageShell>
    ),
    {
      adminUserId: admin.id,
      adminEmail: admin.email,
      impersonatedUserId: session.session?.impersonatedBy
        ? session.user.id
        : null,
    },
    {
      action: "view.audit-logs",
      targetType: "audit-log",
    },
  );

  return renderPage();
}
