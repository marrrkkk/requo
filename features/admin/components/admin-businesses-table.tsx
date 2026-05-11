import Link from "next/link";
import { Briefcase } from "lucide-react";

import { DataListPagination } from "@/components/shared/data-list-pagination";
import {
  DashboardEmptyState,
  DashboardTableContainer,
} from "@/components/shared/dashboard-layout";
import { TruncatedTextWithTooltip } from "@/components/shared/truncated-text-with-tooltip";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AdminBusinessesFilters } from "@/features/admin/components/admin-businesses-filters";
import { getAdminBusinessDetailPath } from "@/features/admin/navigation";
import type { AdminBusinessesListFilters } from "@/features/admin/schemas";
import type { AdminBusinessRow } from "@/features/admin/types";
import { planMeta, type BusinessPlan } from "@/lib/plans";

type SearchParamsRecord = Record<string, string | string[] | undefined>;

type AdminBusinessesTableProps = {
  items: AdminBusinessRow[];
  totalItems: number;
  currentPage: number;
  pageSize: number;
  filters: AdminBusinessesListFilters;
  searchParams: SearchParamsRecord;
  pathname: string;
};

/**
 * Admin businesses table (Requirement 5.1, 5.2).
 *
 * Pure render component: search + pagination are driven entirely through
 * URL search params (`q`, `plan`, `page`). The table is a read surface —
 * no mutation affordances per Requirement 5.4. Rows link to the
 * read-only detail page at `/admin/businesses/[businessId]`.
 */
export function AdminBusinessesTable({
  items,
  totalItems,
  currentPage,
  pageSize,
  filters,
  searchParams,
  pathname,
}: AdminBusinessesTableProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const hasFilters = Boolean(filters.search?.trim() || filters.plan);
  const firstItemIndex = totalItems
    ? (currentPage - 1) * pageSize + 1
    : 0;
  const lastItemIndex = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="flex flex-col gap-5">
      <AdminBusinessesFilters filters={filters} resultCount={totalItems} />

      {items.length === 0 ? (
        <DashboardEmptyState
          description={
            hasFilters
              ? "No businesses match these filters. Try clearing the search or plan filter."
              : "No businesses have been created yet."
          }
          icon={Briefcase}
          title={hasFilters ? "No matching businesses" : "No businesses yet"}
          variant="section"
        />
      ) : (
        <DashboardTableContainer>
          <Table className="min-w-[72rem] table-fixed">
            <TableCaption className="sr-only">
              {totalItems
                ? `Showing businesses ${firstItemIndex}-${lastItemIndex} of ${totalItems}, newest first.`
                : "No businesses to display."}
            </TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[18rem]">Business</TableHead>
                <TableHead className="w-[16rem]">Owner</TableHead>
                <TableHead className="w-[8rem]">Plan</TableHead>
                <TableHead className="w-[8rem] text-right">Members</TableHead>
                <TableHead className="w-[10rem]">Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => {
                const href = getAdminBusinessDetailPath(item.id);

                return (
                  <TableRow className="group/row" key={item.id}>
                    <TableCell className="w-[18rem]">
                      <div className="table-meta-stack max-w-full">
                        <TruncatedTextWithTooltip
                          className="table-link"
                          href={href}
                          prefetch={true}
                          text={item.name}
                        />
                        <TruncatedTextWithTooltip
                          className="table-supporting-text"
                          href={href}
                          prefetch={true}
                          text={item.slug}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="w-[16rem]">
                      <TruncatedTextWithTooltip
                        className="table-emphasis"
                        href={href}
                        prefetch={true}
                        text={item.ownerEmail}
                      />
                    </TableCell>
                    <TableCell className="w-[8rem]">
                      <Link
                        className="inline-flex max-w-full"
                        href={href}
                        prefetch={true}
                      >
                        <AdminBusinessPlanBadge plan={item.plan} />
                      </Link>
                    </TableCell>
                    <TableCell className="w-[8rem] text-right tabular-nums">
                      <Link
                        className="block text-sm text-muted-foreground transition-colors hover:text-primary group-hover/row:text-primary"
                        href={href}
                        prefetch={true}
                      >
                        {item.memberCount.toLocaleString()}
                      </Link>
                    </TableCell>
                    <TableCell className="w-[10rem]">
                      <Link
                        className="block text-sm text-muted-foreground transition-colors hover:text-primary group-hover/row:text-primary"
                        href={href}
                        prefetch={true}
                      >
                        {formatAdminDate(item.createdAt)}
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </DashboardTableContainer>
      )}

      <DataListPagination
        currentPage={currentPage}
        pageSize={pageSize}
        pathname={pathname}
        searchParams={searchParams}
        totalItems={totalItems}
        totalPages={totalPages}
      />
    </div>
  );
}

function AdminBusinessPlanBadge({ plan }: { plan: BusinessPlan }) {
  return (
    <Badge variant={plan === "free" ? "outline" : "secondary"}>
      {planMeta[plan].label}
    </Badge>
  );
}

function formatAdminDate(value: Date) {
  return value.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
