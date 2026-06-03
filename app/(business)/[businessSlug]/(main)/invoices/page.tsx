import type { Metadata } from "next";
import { Suspense } from "react";

import {
  DashboardPage,
  DashboardTableContainer,
} from "@/components/shared/dashboard-layout";
import { PageHeader } from "@/components/shared/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getAppShellContext } from "@/lib/app-shell/context";
import {
  getInvoiceListCount,
  getInvoiceListPage,
} from "@/features/invoices/queries";
import { InvoiceListResults } from "@/features/invoices/components/invoice-list-results";
import { createNoIndexMetadata } from "@/lib/seo/site";
import { FirstVisitTip } from "@/features/onboarding/components/first-visit-tip";
import { featureTips } from "@/features/onboarding/feature-tips";

export const metadata: Metadata = createNoIndexMetadata({
  title: "Invoices",
  description: "Generate, send, and track payment for completed work.",
});

export const unstable_instant = {
  prefetch: "static",
  unstable_disableValidation: true,
};

const ITEMS_PER_PAGE = 50;
const FULL_PAGE_CACHE_MAX_PAGES = 5;
const FORWARD_PAGE_CACHE_WINDOW = 1;
const BACKWARD_PAGE_CACHE_WINDOW = 0;

function getCachedPageWindow(currentPage: number, totalPages: number) {
  if (totalPages <= FULL_PAGE_CACHE_MAX_PAGES) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set<number>([currentPage]);

  for (let offset = 1; offset <= BACKWARD_PAGE_CACHE_WINDOW; offset += 1) {
    const page = currentPage - offset;
    if (page >= 1) {
      pages.add(page);
    }
  }

  for (let offset = 1; offset <= FORWARD_PAGE_CACHE_WINDOW; offset += 1) {
    const page = currentPage + offset;
    if (page <= totalPages) {
      pages.add(page);
    }
  }

  return Array.from(pages).sort((left, right) => left - right);
}

export default async function InvoicesPage({
  params,
  searchParams,
}: {
  params: Promise<{ businessSlug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { businessSlug } = await params;
  const search = await searchParams;

  const filters = {
    q: typeof search.q === "string" ? search.q : undefined,
    view: (search.view === "archived" ? "archived" : "active") as
      | "active"
      | "archived",
    status: (typeof search.status === "string" ? search.status : "all") as "all",
    sort: (search.sort === "oldest" ? "oldest" : "newest") as
      | "newest"
      | "oldest",
    page: typeof search.page === "string"
      ? Math.max(1, Number(search.page) || 1)
      : 1,
  };
  const baseFilters = {
    q: filters.q,
    view: filters.view,
    status: filters.status,
    sort: filters.sort,
  };

  const { businessContext } = await getAppShellContext(businessSlug);

  const countPromise = getInvoiceListCount(
    businessContext.business.id,
    baseFilters,
  );
  const pageDataPromise = countPromise.then(async (totalItems) => {
    const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));
    const currentPage = Math.min(Math.max(1, filters.page), totalPages);
    const cachedPageNumbers = totalItems
      ? getCachedPageWindow(currentPage, totalPages)
      : [];
    const cachedPageEntries = await Promise.all(
      cachedPageNumbers.map(async (page) => [
        page,
        await getInvoiceListPage(
          businessContext.business.id,
          baseFilters,
          page,
          ITEMS_PER_PAGE,
        ),
      ] as const),
    );
    const cachedPages = Object.fromEntries(cachedPageEntries);

    return {
      cachedPages,
      currentPage,
      filterKey: JSON.stringify(baseFilters),
      totalItems,
      totalPages,
    };
  });

  return (
    <DashboardPage>
      <PageHeader
        title="Invoices"
        description="Generate, send, and track payment for completed work."
      />

      <FirstVisitTip {...featureTips.invoices} className="mb-4" />

      <Suspense
        fallback={<InvoicesPageSkeleton />}
      >
        <InvoiceListResults
          businessSlug={businessSlug}
          pageData={pageDataPromise}
          searchParams={search}
        />
      </Suspense>
    </DashboardPage>
  );
}

function InvoicesPageSkeleton() {
  return (
    <>
      {/* Mobile skeleton */}
      <div className="flex flex-col gap-2 sm:hidden" style={{ minHeight: 320 }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center justify-between gap-3 rounded-xl border border-border/80 bg-background px-4 py-3.5"
          >
            <div className="min-w-0 flex-1 space-y-1.5">
              <Skeleton className="h-4 w-40 max-w-full rounded-md" />
              <Skeleton className="h-3 w-32 max-w-full rounded-md" />
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1.5">
              <Skeleton className="h-4 w-16 rounded-md" />
              <Skeleton className="h-5 w-12 rounded-full" />
            </div>
          </div>
        ))}
      </div>

      {/* Desktop skeleton */}
      <DashboardTableContainer className="hidden sm:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="hidden lg:table-cell">Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <Skeleton className="h-4 w-36 rounded-md" />
                    <Skeleton className="h-3 w-20 rounded-md" />
                  </div>
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-24 rounded-md" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-5 w-14 rounded-full" />
                </TableCell>
                <TableCell className="text-right">
                  <Skeleton className="ml-auto h-4 w-16 rounded-md" />
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  <Skeleton className="h-4 w-20 rounded-md" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DashboardTableContainer>
    </>
  );
}
