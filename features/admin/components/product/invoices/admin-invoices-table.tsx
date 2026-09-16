"use client";

import { Receipt } from "lucide-react";

import { TruncatedTextWithTooltip } from "@/components/shared/truncated-text-with-tooltip";
import {
  AdminDataTable,
  type AdminDataTableColumn,
} from "@/features/admin/components/primitives/admin-data-table";
import {
  formatAdminMoney,
  formatProductDate,
} from "@/features/admin/components/product/admin-product-format";
import { getAdminInvoiceDetailPath } from "@/features/admin/navigation";
import type { AdminInvoiceRow } from "@/features/admin/types";
import { InvoiceStatusBadge } from "@/features/invoices/components/invoice-status-badge";

const adminInvoiceColumns: AdminDataTableColumn<AdminInvoiceRow>[] = [
  {
    id: "invoice",
    header: "Invoice",
    width: "w-[16rem]",
    cell: (row) => {
      const href = getAdminInvoiceDetailPath(row.id);

      return (
        <div className="table-meta-stack max-w-full">
          <TruncatedTextWithTooltip
            className="table-link"
            href={href}
            prefetch={true}
            text={row.invoiceNumber}
          />
          <TruncatedTextWithTooltip
            className="table-supporting-text"
            href={href}
            prefetch={true}
            text={row.title}
          />
        </div>
      );
    },
  },
  {
    id: "customer",
    header: "Customer",
    width: "w-[14rem]",
    cell: (row) => {
      const href = getAdminInvoiceDetailPath(row.id);

      return (
        <div className="table-meta-stack max-w-full">
          <TruncatedTextWithTooltip
            className="table-emphasis"
            href={href}
            prefetch={true}
            text={row.customerName}
          />
          <TruncatedTextWithTooltip
            className="table-supporting-text"
            href={href}
            prefetch={true}
            text={row.customerEmail || "No email"}
          />
        </div>
      );
    },
  },
  {
    id: "status",
    header: "Status",
    width: "w-[9rem]",
    align: "center",
    cell: (row) => <InvoiceStatusBadge status={row.status} />,
  },
  {
    id: "total",
    header: "Total",
    width: "w-[7rem]",
    align: "right",
    cell: (row) => (
      <span className="text-sm font-medium tabular-nums text-foreground">
        {formatAdminMoney(row.totalInCents, row.currency)}
      </span>
    ),
  },
  {
    id: "business",
    header: "Business",
    width: "w-[12rem]",
    cell: (row) => (
      <TruncatedTextWithTooltip
        className="table-emphasis"
        href={getAdminInvoiceDetailPath(row.id)}
        prefetch={true}
        text={row.businessName}
      />
    ),
  },
  {
    id: "due",
    header: "Due",
    width: "w-[8rem]",
    cell: (row) => (
      <span className="text-sm text-muted-foreground">
        {formatProductDate(new Date(`${row.dueDate}T00:00:00Z`))}
      </span>
    ),
  },
];

type AdminInvoicesTableProps = {
  items: AdminInvoiceRow[];
  hasActiveFilters: boolean;
  toolbar?: React.ReactNode;
  pagination?: React.ReactNode;
};

/**
 * Admin invoices list on the shared `AdminDataTable`.
 *
 * Fixed `createdAt DESC` ordering (the list query owns it) — no sortable
 * columns. Status is the effective status (payments + due date applied).
 * `flush` renders the table edge to edge inside the page's list card
 * (one frame, like the businesses list) instead of nesting a second
 * bordered container. Below `xl` each row becomes a `MobileRecordRow`
 * card.
 */
export function AdminInvoicesTable({
  items,
  hasActiveFilters,
  toolbar,
  pagination,
}: AdminInvoicesTableProps) {
  return (
    <AdminDataTable
      columns={adminInvoiceColumns}
      empty={{
        title: hasActiveFilters
          ? "No invoices match these filters."
          : "No invoices yet",
        description: hasActiveFilters
          ? "Try a different number, customer, email, or status filter."
          : "Manual-payment invoices from every business will appear here.",
        icon: Receipt,
      }}
      getRowHref={(row) => getAdminInvoiceDetailPath(row.id)}
      getRowId={(row) => row.id}
      flush
      minWidthClass="min-w-[68rem]"
      mobileCard={(row) => ({
        title: `${row.invoiceNumber} · ${row.customerName}`,
        subtitle: row.businessName,
        statusBadge: <InvoiceStatusBadge status={row.status} />,
        metadata: (
          <span>
            {formatAdminMoney(row.totalInCents, row.currency)} · Due{" "}
            {formatProductDate(new Date(`${row.dueDate}T00:00:00Z`))}
          </span>
        ),
      })}
      pagination={pagination}
      rows={items}
      toolbar={toolbar}
    />
  );
}
