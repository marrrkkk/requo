"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import {
  DashboardEmptyState,
  DashboardPage,
  DashboardTableContainer,
} from "@/components/shared/dashboard-layout";
import { DataListPagination } from "@/components/shared/data-list-pagination";
import { PageHeader } from "@/components/shared/page-header";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getBusinessInvoicePath } from "@/features/businesses/routes";
import type {
  DashboardInvoiceListItem,
  InvoiceListFilters,
  InvoiceStatus,
} from "@/features/invoices/types";

type InvoicesListProps = {
  items: DashboardInvoiceListItem[];
  totalCount: number;
  businessSlug: string;
  filters: InvoiceListFilters;
};

const PAGE_SIZE = 50;

function formatCurrency(cents: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

const statusLabels: Record<InvoiceStatus, string> = {
  draft: "Draft",
  sent: "Sent",
  viewed: "Viewed",
  paid: "Paid",
  overdue: "Overdue",
  voided: "Voided",
};

const statusVariants: Record<InvoiceStatus, "secondary" | "default" | "outline" | "destructive"> = {
  draft: "secondary",
  sent: "outline",
  viewed: "outline",
  paid: "default",
  overdue: "destructive",
  voided: "secondary",
};

export function InvoicesList({
  items,
  totalCount,
  businessSlug,
  filters,
}: InvoicesListProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const searchParamsRecord: Record<string, string | undefined> = {};
  searchParams.forEach((value, key) => {
    searchParamsRecord[key] = value;
  });

  return (
    <DashboardPage>
      <PageHeader
        title="Invoices"
        description="Generate, send, and track payment for completed work."
      />

      {items.length === 0 && filters.page === 1 ? (
        <DashboardEmptyState
          title="No invoices yet"
          description="Invoices are generated from completed jobs or accepted quotes."
        />
      ) : (
        <>
          {/* Mobile card list */}
          <div className="flex flex-col gap-2 sm:hidden">
            {items.map((invoice) => (
              <Link
                key={invoice.id}
                href={getBusinessInvoicePath(businessSlug, invoice.id)}
                className="flex items-center justify-between gap-3 rounded-xl border border-border/80 bg-background px-4 py-3.5 transition-colors active:bg-muted/50"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {invoice.title}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {invoice.invoiceNumber} · {invoice.customerName}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className="text-sm font-semibold text-foreground">
                    {formatCurrency(invoice.totalInCents, invoice.currency)}
                  </span>
                  <Badge variant={statusVariants[invoice.status]} className="text-[0.65rem]">
                    {statusLabels[invoice.status]}
                  </Badge>
                </div>
              </Link>
            ))}
          </div>

          {/* Desktop table */}
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
                {items.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell>
                      <Link
                        href={getBusinessInvoicePath(businessSlug, invoice.id)}
                        className="flex flex-col gap-0.5"
                      >
                        <span className="text-sm font-medium hover:underline">
                          {invoice.title}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {invoice.invoiceNumber}
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm">
                      {invoice.customerName}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariants[invoice.status]}>
                        {statusLabels[invoice.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium">
                      {formatCurrency(invoice.totalInCents, invoice.currency)}
                    </TableCell>
                    <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">
                      {invoice.createdAt.toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </DashboardTableContainer>

          {totalPages > 1 && (
            <DataListPagination
              currentPage={filters.page}
              pageSize={PAGE_SIZE}
              pathname={pathname}
              searchParams={searchParamsRecord}
              totalItems={totalCount}
              totalPages={totalPages}
            />
          )}
        </>
      )}
    </DashboardPage>
  );
}
