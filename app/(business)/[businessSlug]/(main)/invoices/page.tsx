import type { Metadata } from "next";

import { getAppShellContext } from "@/lib/app-shell/context";
import { getInvoicesForBusiness } from "@/features/invoices/queries";
import { InvoicesList } from "@/features/invoices/components/invoices-list";

export const metadata: Metadata = {
  title: "Invoices",
};

export default async function InvoicesPage({
  params,
  searchParams,
}: {
  params: Promise<{ businessSlug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { businessSlug } = await params;
  const search = await searchParams;
  const { businessContext } = await getAppShellContext(businessSlug);

  const filters = {
    q: typeof search.q === "string" ? search.q : undefined,
    view: (search.view === "archived" ? "archived" : "active") as "active" | "archived",
    status: (typeof search.status === "string" ? search.status : "all") as "all",
    sort: (search.sort === "oldest" ? "oldest" : "newest") as "newest" | "oldest",
    page: typeof search.page === "string" ? Math.max(1, Number(search.page) || 1) : 1,
  };

  const { items, totalCount } = await getInvoicesForBusiness(
    businessContext.business.id,
    filters,
  );

  return (
    <InvoicesList
      items={items}
      totalCount={totalCount}
      businessSlug={businessSlug}
      filters={filters}
    />
  );
}
