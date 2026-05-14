import type { Metadata } from "next";
import { Suspense } from "react";

import { requireAdminUser } from "@/features/admin/access";
import {
  wrapAdminRouteWithViewLog,
  type AdminAuditContext,
} from "@/features/admin/audit";
import { AdminSubscriptionsTable } from "@/features/admin/components/admin-subscriptions-table";
import { listAdminSubscriptions } from "@/features/admin/queries";
import { adminSubscriptionsListFiltersSchema } from "@/features/admin/schemas";
import { createNoIndexMetadata } from "@/lib/seo/site";

import AdminLoading from "../loading";

export const unstable_instant = { prefetch: 'static', unstable_disableValidation: true };

type SearchParamsRecord = Record<string, string | string[] | undefined>;

type AdminSubscriptionsPageProps = {
  searchParams: Promise<SearchParamsRecord>;
};

export const metadata: Metadata = createNoIndexMetadata({
  absoluteTitle: "Subscriptions · Requo admin",
  description: "Inspect account subscriptions and billing state.",
});

/**
 * Admin subscriptions list (task 12.4 / Req 6.1, 6.3).
 *
 * Paginated `account_subscriptions` feed with status + provider URL
 * filters. Each row links to the detail page which renders the
 * override form.
 *
 * The top-level component stays sync + wraps the async body in
 * `<Suspense>` so `cacheComponents` can stream the dynamic list
 * independently of the admin shell. Writes a `view.subscriptions`
 * audit row on every render (Req 10.1) via `wrapAdminRouteWithViewLog`.
 */
export default function AdminSubscriptionsPage({
  searchParams,
}: AdminSubscriptionsPageProps) {
  return (
    <Suspense fallback={<AdminLoading />}>
      <AdminSubscriptionsPageContent searchParams={searchParams} />
    </Suspense>
  );
}

async function AdminSubscriptionsPageContent({
  searchParams,
}: AdminSubscriptionsPageProps) {
  const [{ session, user }, resolvedSearchParams] = await Promise.all([
    requireAdminUser(),
    searchParams,
  ]);
  const auditContext = buildAdminAuditContext(user.id, session);
  const filters = adminSubscriptionsListFiltersSchema.parse(
    resolvedSearchParams,
  );

  const renderPage = wrapAdminRouteWithViewLog(
    async () => {
      const { items, total } = await listAdminSubscriptions(filters);
      const totalPages = Math.max(1, Math.ceil(total / filters.pageSize));
      const currentPage = Math.min(Math.max(1, filters.page), totalPages);

      return (
        <AdminSubscriptionsTable
          items={items}
          page={currentPage}
          pageSize={filters.pageSize}
          provider={filters.provider ?? ""}
          status={filters.status ?? ""}
          total={total}
        />
      );
    },
    auditContext,
    {
      action: "view.subscriptions",
      targetType: "dashboard",
    },
  );

  return renderPage();
}

function buildAdminAuditContext(
  adminUserId: string,
  session: Awaited<ReturnType<typeof requireAdminUser>>["session"],
): AdminAuditContext {
  const impersonatedBy = session.session?.impersonatedBy ?? null;

  return {
    adminUserId,
    adminEmail: session.user.email,
    impersonatedUserId: impersonatedBy ? session.user.id : null,
  };
}
