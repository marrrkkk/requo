import type { Metadata } from "next";
import { Suspense } from "react";

import { requireAdminUser } from "@/features/admin/access";
import {
  wrapAdminRouteWithViewLog,
  type AdminAuditContext,
} from "@/features/admin/audit";
import { AdminAuditTable } from "@/features/admin/components/admin-audit-table";
import {
  type AdminAction,
  type AdminTargetType,
} from "@/features/admin/constants";
import { listAdminAuditLogs } from "@/features/admin/queries";
import { adminAuditLogListFiltersSchema } from "@/features/admin/schemas";
import type { AuthSession, AuthUser } from "@/lib/auth/session";
import { createNoIndexMetadata } from "@/lib/seo/site";

import AdminLoading from "../loading";

export const metadata: Metadata = createNoIndexMetadata({
  absoluteTitle: "Audit logs · Requo admin",
  description: "Every admin view and action, newest first.",
});

type SearchParamsRecord = Record<string, string | string[] | undefined>;

type AuditLogsPageProps = {
  searchParams: Promise<SearchParamsRecord>;
};

/**
 * Admin audit logs page.
 *
 * Paginated feed of every `admin_audit_logs` row, filterable by admin
 * user id, action, target type, and target id. Ordering is enforced by
 * `listAdminAuditLogs` as `createdAt` DESC (Req 10.6).
 *
 * Access + audit logging follow the same pattern as the other admin
 * pages: `requireAdminUser()` gates the render, and the returned
 * handler is wrapped with `wrapAdminRouteWithViewLog` to record a
 * `view.audit-logs` entry once the page settles (Req 10.1). The
 * top-level component stays sync + wraps the async work in
 * `<Suspense>` so `cacheComponents` can stream the dynamic body
 * independently of the admin shell.
 */
export default function AuditLogsPage({ searchParams }: AuditLogsPageProps) {
  return (
    <Suspense fallback={<AdminLoading />}>
      <AuditLogsPageContent searchParams={searchParams} />
    </Suspense>
  );
}

async function AuditLogsPageContent({
  searchParams,
}: AuditLogsPageProps) {
  const [{ session, user }, resolvedSearchParams] = await Promise.all([
    requireAdminUser(),
    searchParams,
  ]);

  const auditContext = buildAdminAuditContext(user, session);

  const renderPage = wrapAdminRouteWithViewLog(
    async () => renderAuditLogsPage(resolvedSearchParams),
    auditContext,
    {
      action: "view.audit-logs",
      targetType: "audit-log",
    },
  );

  return renderPage();
}

async function renderAuditLogsPage(
  searchParams: SearchParamsRecord,
) {
  // Parse once at the page boundary so we can compute pagination
  // without reaching back into the query's internal parse result.
  // `listAdminAuditLogs` will re-validate the input but that's a
  // cheap check compared to the database query behind it.
  const filters = adminAuditLogListFiltersSchema.parse(searchParams);

  const { items, total } = await listAdminAuditLogs(filters);

  const pageSize = filters.pageSize;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(Math.max(1, filters.page), totalPages);

  return (
    <AdminAuditTable
      currentPage={currentPage}
      filters={{
        adminUserId: filters.adminUserId ?? "",
        action: (filters.action ?? "all") as AdminAction | "all",
        targetType: (filters.targetType ?? "all") as AdminTargetType | "all",
        targetId: filters.targetId ?? "",
      }}
      items={items}
      pageSize={pageSize}
      searchParams={searchParams}
      totalItems={total}
      totalPages={totalPages}
    />
  );
}

function buildAdminAuditContext(
  admin: AuthUser,
  session: AuthSession,
): AdminAuditContext {
  const impersonatedBy = session.session?.impersonatedBy ?? null;

  return {
    adminUserId: admin.id,
    adminEmail: admin.email,
    impersonatedUserId: impersonatedBy ? session.user.id : null,
  };
}
