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
import { getInvoicesForBusiness } from "@/features/invoices/queries";
import { InvoicesList } from "@/features/invoices/components/invoices-list";
import { createNoIndexMetadata } from "@/lib/seo/site";

export const metadata: Metadata = createNoIndexMetadata({
  title: "Invoices",
  description: "Generate, send, and track payment for completed work.",
});

export const unstable_instant = {
  prefetch: "static",
  unstable_disableValidation: true,
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

  return (
    <Suspense fallback={<InvoicesPageSkeleton />}>
      <StreamedInvoicesList businessSlug={businessSlug} filters={filters} />
    </Suspense>
  );
}

async function StreamedInvoicesList({
  businessSlug,
  filters,
}: {
  businessSlug: string;
  filters: {
    q: string | undefined;
    view: "active" | "archived";
    status: "all";
    sort: "newest" | "oldest";
    page: number;
  };
}) {
  const { businessContext } = await getAppShellContext(businessSlug);

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

function InvoicesPageSkeleton() {
  return (
    <DashboardPage>
      <PageHeader
        title="Invoices"
        description="Generate, send, and track payment for completed work."
      />

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
    </DashboardPage>
  );
}
