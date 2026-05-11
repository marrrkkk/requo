import type { Metadata } from "next";
import { Suspense } from "react";

import { requireAdminUser } from "@/features/admin/access";
import { wrapAdminRouteWithViewLog } from "@/features/admin/audit";
import { AdminBusinessesTable } from "@/features/admin/components/admin-businesses-table";
import { ADMIN_BUSINESSES_PATH } from "@/features/admin/navigation";
import { listAdminBusinesses } from "@/features/admin/queries";
import { adminBusinessesListFiltersSchema } from "@/features/admin/schemas";
import { createNoIndexMetadata } from "@/lib/seo/site";

import AdminLoading from "../loading";

export const metadata: Metadata = createNoIndexMetadata({
  absoluteTitle: "Businesses · Requo admin",
  description: "Read-only review of customer business setups.",
});

type SearchParamsRecord = Record<string, string | string[] | undefined>;

type AdminBusinessesPageProps = {
  searchParams: Promise<SearchParamsRecord>;
};

/**
 * Admin businesses list (task 12.3 / Req 5.1, 5.2).
 *
 * Uses `q`, `plan`, `page`, and `pageSize` URL params so the view stays
 * linkable. Default ordering is `createdAt desc`. The page is read-only
 * — no mutation affordances are rendered on the list or the detail
 * (Req 5.4); the detail page at `[businessId]/page.tsx` enforces the
 * same.
 *
 * The top-level component stays sync + wraps the async body in
 * `<Suspense>` so `cacheComponents` can stream the dynamic list
 * independently of the admin shell. The layout already writes a
 * `view.dashboard` audit row for the shell render; we refine the audit
 * here to `view.businesses` via `wrapAdminRouteWithViewLog` per Req
 * 10.1.
 */
export default function AdminBusinessesPage({
  searchParams,
}: AdminBusinessesPageProps) {
  return (
    <Suspense fallback={<AdminLoading />}>
      <AdminBusinessesPageContent searchParams={searchParams} />
    </Suspense>
  );
}

async function AdminBusinessesPageContent({
  searchParams,
}: AdminBusinessesPageProps) {
  const { session, user: admin } = await requireAdminUser();
  const rawParams = await searchParams;

  const renderPage = wrapAdminRouteWithViewLog(
    async () => renderBusinessesPage(rawParams),
    {
      adminUserId: admin.id,
      adminEmail: admin.email,
      impersonatedUserId: session.session?.impersonatedBy
        ? session.user.id
        : null,
    },
    {
      action: "view.businesses",
      targetType: "business",
    },
  );

  return renderPage();
}

async function renderBusinessesPage(rawParams: SearchParamsRecord) {
  const filters = adminBusinessesListFiltersSchema.parse(rawParams);
  const { items, total } = await listAdminBusinesses(filters);
  const totalPages = Math.max(1, Math.ceil(total / filters.pageSize));
  const currentPage = Math.min(Math.max(1, filters.page), totalPages);

  return (
    <AdminBusinessesTable
      currentPage={currentPage}
      filters={filters}
      items={items}
      pageSize={filters.pageSize}
      pathname={ADMIN_BUSINESSES_PATH}
      searchParams={rawParams}
      totalItems={total}
    />
  );
}
