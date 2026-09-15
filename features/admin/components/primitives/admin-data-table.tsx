"use client";

import { type ReactNode, useTransition } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { ChevronDown, ChevronUp, ChevronsUpDown } from "lucide-react";

import {
  DashboardEmptyState,
  DashboardTableContainer,
} from "@/components/shared/dashboard-layout";
import { MobileRecordRow } from "@/components/shared/mobile-record-row";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useProgressRouter } from "@/hooks/use-progress-router";
import { cn } from "@/lib/utils";

export type AdminDataTableColumn<T> = {
  id: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  /** Applied to the `th`/`td` (e.g. `w-40`). */
  width?: string;
  align?: "left" | "right";
  /** Server-side sortable. Requires the list query to whitelist this column. */
  sortable?: boolean;
  /** Hide this column below the given breakpoint. */
  hideBelow?: "sm" | "md" | "lg" | "xl";
};

export type AdminDataTableSort = {
  key: string;
  dir: "asc" | "desc";
};

export type AdminDataTableEmptyState = {
  title: ReactNode;
  description: ReactNode;
  icon?: LucideIcon;
  action?: ReactNode;
};

export type AdminDataTableMobileCard = {
  title: ReactNode;
  subtitle?: ReactNode;
  statusBadge?: ReactNode;
  metadata?: ReactNode;
};

export type AdminDataTableProps<T> = {
  columns: AdminDataTableColumn<T>[];
  rows: T[];
  getRowId: (row: T) => string;
  /** Makes each row a link. Required for the mobile card layout. */
  getRowHref?: (row: T) => string;
  empty: AdminDataTableEmptyState;
  /** Current server-side sort. */
  sort?: AdminDataTableSort;
  /** Override the default sort navigation (which writes `sort`/`dir` to the URL). */
  onSortChange?: (key: string) => void;
  /** Rendered above the table (search + filters). */
  toolbar?: ReactNode;
  /** Rendered below the table (pagination). */
  pagination?: ReactNode;
  /** Minimum table width before the container scrolls horizontally. */
  minWidthClass?: string;
  isLoading?: boolean;
  /**
   * Mobile (< xl) card rendering. When provided together with `getRowHref`,
   * the table is replaced by `MobileRecordRow` cards below `xl` instead of
   * horizontally scrolling.
   */
  mobileCard?: (row: T) => AdminDataTableMobileCard;
  className?: string;
};

const hideBelowClassNames = {
  sm: "hidden sm:table-cell",
  md: "hidden md:table-cell",
  lg: "hidden lg:table-cell",
  xl: "hidden xl:table-cell",
} as const;

const SKELETON_ROW_COUNT = 6;

/**
 * The single table pattern for the admin console.
 *
 * Server-rendered rows with URL-persisted, server-driven sorting — there is no
 * TanStack Table in this repo, so sorting writes `sort`/`dir` to the query
 * string and the list query re-runs. Never interpolate a sort key into SQL:
 * every list query whitelists its sortable columns.
 */
export function AdminDataTable<T>({
  columns,
  rows,
  getRowId,
  getRowHref,
  empty,
  sort,
  onSortChange,
  toolbar,
  pagination,
  minWidthClass = "min-w-[56rem]",
  isLoading = false,
  mobileCard,
  className,
}: AdminDataTableProps<T>) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useProgressRouter();
  const [isPending, startTransition] = useTransition();

  const useCards = Boolean(mobileCard && getRowHref);

  function handleSort(columnId: string) {
    if (onSortChange) {
      onSortChange(columnId);
      return;
    }

    const nextDir: AdminDataTableSort["dir"] =
      sort?.key === columnId && sort.dir === "desc" ? "asc" : "desc";

    const params = new URLSearchParams(searchParams.toString());
    params.set("sort", columnId);
    params.set("dir", nextDir);
    // A sort change invalidates the current offset.
    params.delete("page");

    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    });
  }

  const isEmpty = !isLoading && rows.length === 0;

  return (
    <div className={cn("flex min-w-0 flex-col gap-4", className)}>
      {toolbar}

      {isEmpty ? (
        <DashboardEmptyState
          title={empty.title}
          description={empty.description}
          icon={empty.icon}
          action={empty.action}
          variant="list"
        />
      ) : (
        <>
          {useCards ? (
            <div className="flex flex-col gap-3 xl:hidden">
              {isLoading
                ? Array.from({ length: SKELETON_ROW_COUNT }).map((_, index) => (
                    <Skeleton
                      className="h-[4.5rem] w-full rounded-xl"
                      key={index}
                    />
                  ))
                : rows.map((row) => {
                    const card = mobileCard!(row);

                    return (
                      <MobileRecordRow
                        id={getRowId(row)}
                        key={getRowId(row)}
                        href={getRowHref!(row)}
                        title={card.title}
                        subtitle={card.subtitle}
                        statusBadge={card.statusBadge}
                        metadata={card.metadata}
                      />
                    );
                  })}
            </div>
          ) : null}

          <DashboardTableContainer
            className={cn(useCards && "hidden xl:block")}
          >
            <Table className={minWidthClass}>
              <TableHeader>
                <TableRow>
                  {columns.map((column) => {
                    const isSorted = sort?.key === column.id;
                    const SortIcon = isSorted
                      ? sort?.dir === "asc"
                        ? ChevronUp
                        : ChevronDown
                      : ChevronsUpDown;

                    return (
                      <TableHead
                        key={column.id}
                        scope="col"
                        aria-sort={
                          isSorted
                            ? sort?.dir === "asc"
                              ? "ascending"
                              : "descending"
                            : column.sortable
                              ? "none"
                              : undefined
                        }
                        className={cn(
                          column.width,
                          column.align === "right" && "text-right",
                          column.hideBelow &&
                            hideBelowClassNames[column.hideBelow],
                        )}
                      >
                        {column.sortable ? (
                          <Button
                            className={cn(
                              "-mx-2 h-7 gap-1 px-2 font-medium text-muted-foreground hover:text-foreground",
                              isSorted && "text-foreground",
                              column.align === "right" && "ml-auto",
                            )}
                            disabled={isPending}
                            onClick={() => handleSort(column.id)}
                            size="sm"
                            type="button"
                            variant="ghost"
                          >
                            {column.header}
                            <SortIcon aria-hidden className="size-3.5" />
                          </Button>
                        ) : (
                          column.header
                        )}
                      </TableHead>
                    );
                  })}
                </TableRow>
              </TableHeader>

              <TableBody>
                {isLoading
                  ? Array.from({ length: SKELETON_ROW_COUNT }).map(
                      (_, rowIndex) => (
                        <TableRow key={rowIndex}>
                          {columns.map((column) => (
                            <TableCell
                              key={column.id}
                              className={cn(
                                column.hideBelow &&
                                  hideBelowClassNames[column.hideBelow],
                              )}
                            >
                              <Skeleton className="h-4 w-full max-w-40 rounded" />
                            </TableCell>
                          ))}
                        </TableRow>
                      ),
                    )
                  : rows.map((row) => (
                      <TableRow key={getRowId(row)}>
                        {columns.map((column) => (
                          <TableCell
                            key={column.id}
                            className={cn(
                              column.align === "right" && "text-right",
                              column.hideBelow &&
                                hideBelowClassNames[column.hideBelow],
                            )}
                          >
                            {column.cell(row)}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
              </TableBody>
            </Table>
          </DashboardTableContainer>
        </>
      )}

      {pagination}
    </div>
  );
}
