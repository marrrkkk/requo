import { Search } from "lucide-react";
import type { ReactNode } from "react";

import { DataListPagination } from "@/components/shared/data-list-pagination";
import {
  DashboardEmptyState,
  DashboardSection,
  DashboardStatsGrid,
  DashboardTableContainer,
  DashboardToolbar,
} from "@/components/shared/dashboard-layout";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Field, FieldContent, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AdminPageInfo } from "@/features/admin/types";
import { cn } from "@/lib/utils";

const dateTimeFormatter = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeStyle: "short",
});

const dateFormatter = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
});

export function formatDateTime(value: Date | string | null | undefined) {
  if (!value) {
    return "Not available";
  }

  return dateTimeFormatter.format(new Date(value));
}

export function formatDate(value: Date | string | null | undefined) {
  if (!value) {
    return "Not available";
  }

  return dateFormatter.format(new Date(value));
}

export function formatNullable(value: ReactNode | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return <span className="text-muted-foreground">Not available</span>;
  }

  return value;
}

export function formatNumber(value: number | null | undefined) {
  return new Intl.NumberFormat("en").format(value ?? 0);
}

export function formatLimit(value: number | null) {
  return value === null ? "Unlimited" : formatNumber(value);
}

export function formatMetadataPreview(
  metadata: Record<string, unknown> | null | undefined,
) {
  if (!metadata || !Object.keys(metadata).length) {
    return "No metadata";
  }

  return JSON.stringify(metadata, null, 0).slice(0, 180);
}

export function AdminMetricGrid({ children }: { children: ReactNode }) {
  return (
    <DashboardStatsGrid className="grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
      {children}
    </DashboardStatsGrid>
  );
}

export function AdminMetricCard({
  label,
  value,
  description,
}: {
  label: string;
  value: ReactNode;
  description?: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border/70 bg-card p-5 shadow-sm">
      <p className="meta-label">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
        {value}
      </p>
      {description ? (
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {description}
        </p>
      ) : null}
    </div>
  );
}

export function AdminSearchForm({
  action,
  defaultValue,
  description,
  placeholder,
  resultLabel,
}: {
  action: string;
  defaultValue: string;
  description?: ReactNode;
  placeholder: string;
  resultLabel?: ReactNode;
}) {
  return (
    <DashboardToolbar>
      <form action={action} className="flex flex-col gap-4">
        {description || resultLabel ? (
          <div className="data-list-toolbar-summary">
            {description ? (
              <p className="text-sm leading-6 text-muted-foreground">
                {description}
              </p>
            ) : null}
            {resultLabel ? (
              <p className="data-list-toolbar-count">{resultLabel}</p>
            ) : null}
          </div>
        ) : null}

        <div className="data-list-toolbar-grid">
          <Field className="min-w-0 w-full xl:min-w-[10rem] xl:max-w-md xl:flex-1 xl:basis-0">
            <FieldLabel className="meta-label px-0.5" htmlFor="admin-search">
              Search
            </FieldLabel>
            <FieldContent>
              <div className="relative min-w-0">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  defaultValue={defaultValue}
                  id="admin-search"
                  name="q"
                  placeholder={placeholder}
                  type="search"
                />
              </div>
            </FieldContent>
          </Field>
          <div className="data-list-toolbar-actions">
            <Button className="w-full sm:w-auto" type="submit" variant="outline">
              Search
            </Button>
          </div>
        </div>
      </form>
    </DashboardToolbar>
  );
}

export function AdminPagination({
  pageInfo,
  pathname,
  searchParams,
}: {
  pageInfo: AdminPageInfo;
  pathname: string;
  searchParams: Record<string, string | string[] | undefined>;
}) {
  return (
    <DataListPagination
      currentPage={pageInfo.page}
      pageSize={pageInfo.pageSize}
      pathname={pathname}
      searchParams={searchParams}
      totalItems={pageInfo.totalCount}
      totalPages={pageInfo.pageCount}
    />
  );
}

export function AdminStatusBadge({
  status,
}: {
  status: string | null | undefined;
}) {
  const normalized = status ?? "free";
  const variant =
    normalized.includes("deleted") ||
    normalized.includes("failed") ||
    normalized.includes("past_due")
      ? "destructive"
      : normalized.includes("scheduled") ||
          normalized.includes("pending") ||
          normalized.includes("canceled") ||
          normalized.includes("archived") ||
          normalized.includes("trash")
        ? "secondary"
        : "outline";

  return (
    <Badge className="capitalize" variant={variant}>
      {normalized.replace(/_/g, " ")}
    </Badge>
  );
}

export function AdminKeyValueGrid({
  items,
}: {
  items: Array<{
    label: string;
    value: ReactNode;
  }>;
}) {
  return (
    <dl className="grid gap-4 sm:grid-cols-2">
      {items.map((item) => (
        <div
          className="rounded-lg border border-border/70 bg-background/50 p-4"
          key={item.label}
        >
          <dt className="meta-label">{item.label}</dt>
          <dd className="mt-2 break-words text-sm font-medium text-foreground">
            {formatNullable(item.value)}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function AdminDataTable({
  children,
  empty,
  emptyDescription = "Try a broader search or check back after more records are created.",
  emptyTitle = "No records found",
}: {
  children: ReactNode;
  empty?: boolean;
  emptyDescription?: ReactNode;
  emptyTitle?: ReactNode;
}) {
  if (empty) {
    return (
      <DashboardEmptyState
        description={emptyDescription}
        title={emptyTitle}
        variant="list"
      />
    );
  }

  return (
    <DashboardTableContainer className="!block">
      {children}
    </DashboardTableContainer>
  );
}

export function AdminBasicTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: Array<ReactNode[]>;
}) {
  return (
    <AdminDataTable empty={rows.length === 0}>
      <Table>
        <TableHeader>
          <TableRow>
            {headers.map((header) => (
              <TableHead key={header}>{header}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, rowIndex) => (
            <TableRow key={rowIndex}>
              {row.map((cell, cellIndex) => (
                <TableCell
                  className={cn(cellIndex === 0 && "font-medium text-foreground")}
                  key={cellIndex}
                >
                  {cell}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </AdminDataTable>
  );
}

export function AdminRelatedSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <DashboardSection description={description} title={title}>
      {children}
    </DashboardSection>
  );
}

/* ---------------------------------------------------------------------------
 * Reusable Skeletons
 * ---------------------------------------------------------------------------*/

const skeletonWidths = [52, 68, 44, 60, 56, 72, 48, 64, 40, 58];

export function AdminTableSkeleton({
  columns = 4,
  rows = 5,
}: {
  columns?: number;
  rows?: number;
}) {
  return (
    <DashboardTableContainer className="!block">
      <Table>
        <TableHeader>
          <TableRow>
            {Array.from({ length: columns }).map((_, index) => (
              <TableHead key={index}>
                <Skeleton className="h-4 w-20 rounded-md" />
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <TableRow key={rowIndex}>
              {Array.from({ length: columns }).map((_, colIndex) => (
                <TableCell key={colIndex}>
                  {colIndex === 0 ? (
                    <div className="flex flex-col gap-1.5">
                      <Skeleton className="h-4 w-28 rounded-md" />
                      <Skeleton className="h-3 w-20 rounded-md" />
                    </div>
                  ) : (
                    <Skeleton
                      className="h-4 rounded-md"
                      style={{
                        width: `${skeletonWidths[(rowIndex * columns + colIndex) % skeletonWidths.length]}%`,
                        minWidth: "3rem",
                      }}
                    />
                  )}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </DashboardTableContainer>
  );
}

export function AdminPaginationSkeleton() {
  return (
    <div className="flex flex-col gap-3 border-t border-border/70 pt-5 sm:flex-row sm:items-center sm:justify-between">
      <Skeleton className="h-4 w-32 rounded-md" />
      <div className="flex items-center gap-1">
        <Skeleton className="h-9 w-20 rounded-md" />
        <Skeleton className="size-9 rounded-md" />
        <Skeleton className="size-9 rounded-md" />
        <Skeleton className="size-9 rounded-md" />
        <Skeleton className="h-9 w-16 rounded-md" />
      </div>
    </div>
  );
}

export function AdminPageSkeleton({
  title,
  description,
  columns = 4,
  rows = 5,
  hasSearch = true,
}: {
  title: string;
  description?: string;
  columns?: number;
  rows?: number;
  hasSearch?: boolean;
}) {
  return (
    <>
      <PageHeader title={title} description={description} />

      {hasSearch ? (
        <DashboardToolbar>
          <div className="flex flex-col gap-4">
            <div className="data-list-toolbar-summary">
              <Skeleton className="h-4 w-full max-w-sm rounded-md" />
              <Skeleton className="h-7 w-28 rounded-full" />
            </div>
            <div className="data-list-toolbar-grid items-end">
              <div className="flex min-w-0 flex-col gap-2.5 xl:min-w-[10rem] xl:max-w-md xl:flex-1 xl:basis-0">
                <Skeleton className="h-3 w-16 rounded-md" />
                <Skeleton className="h-10 w-full rounded-xl" />
              </div>
              <div className="data-list-toolbar-actions">
                <Skeleton className="h-10 w-full rounded-xl sm:w-20" />
              </div>
            </div>
          </div>
        </DashboardToolbar>
      ) : null}

      <div className="flex flex-col gap-5">
        <AdminTableSkeleton columns={columns} rows={rows} />
        <AdminPaginationSkeleton />
      </div>
    </>
  );
}
