import Link from "next/link";
import { Search } from "lucide-react";
import type { ReactNode } from "react";

import {
  DashboardEmptyState,
  DashboardSection,
  DashboardStatsGrid,
  DashboardTableContainer,
} from "@/components/shared/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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

export function buildAdminPageHref(
  path: string,
  searchParams: Record<string, string | string[] | undefined>,
  page: number,
) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(searchParams)) {
    if (key === "page" || value === undefined) {
      continue;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        params.append(key, item);
      }
      continue;
    }

    if (value) {
      params.set(key, value);
    }
  }

  params.set("page", String(page));

  return `${path}?${params.toString()}`;
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
  placeholder,
}: {
  action: string;
  defaultValue: string;
  placeholder: string;
}) {
  return (
    <form
      action={action}
      className="flex w-full flex-col gap-3 sm:flex-row sm:items-center"
    >
      <div className="relative min-w-0 flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          defaultValue={defaultValue}
          name="q"
          placeholder={placeholder}
          type="search"
        />
      </div>
      <Button type="submit" variant="outline">
        Search
      </Button>
    </form>
  );
}

export function AdminPagination({
  pageInfo,
  hrefForPage,
}: {
  pageInfo: AdminPageInfo;
  hrefForPage: (page: number) => string;
}) {
  if (pageInfo.pageCount <= 1) {
    return null;
  }

  const hasPrevious = pageInfo.page > 1;
  const hasNext = pageInfo.page < pageInfo.pageCount;

  return (
    <div className="flex flex-col gap-3 border-t border-border/70 pt-5 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground">
        Page {pageInfo.page} of {pageInfo.pageCount} - {pageInfo.totalCount}{" "}
        total
      </p>
      <div className="dashboard-actions">
        {hasPrevious ? (
          <Button asChild variant="outline">
            <Link href={hrefForPage(pageInfo.page - 1)}>Previous</Link>
          </Button>
        ) : (
          <Button disabled variant="outline">
            Previous
          </Button>
        )}
        {hasNext ? (
          <Button asChild variant="outline">
            <Link href={hrefForPage(pageInfo.page + 1)}>Next</Link>
          </Button>
        ) : (
          <Button disabled variant="outline">
            Next
          </Button>
        )}
      </div>
    </div>
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
}: {
  children: ReactNode;
  empty?: boolean;
}) {
  if (empty) {
    return (
      <DashboardEmptyState
        description="Try a broader search or check back after more records are created."
        title="No records found"
        variant="section"
      />
    );
  }

  return <DashboardTableContainer>{children}</DashboardTableContainer>;
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
