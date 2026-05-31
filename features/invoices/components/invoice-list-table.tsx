import Link from "next/link";
import type { MotionState } from "@/hooks/use-animated-list";

import { Badge } from "@/components/ui/badge";
import {
  DashboardTableContainer,
} from "@/components/shared/dashboard-layout";
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
  InvoiceStatus,
} from "@/features/invoices/types";

type InvoiceListTableProps = {
  invoices: DashboardInvoiceListItem[];
  businessSlug: string;
  getMotionState?: (id: string) => MotionState;
};

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

export function InvoiceListTable({
  invoices,
  businessSlug,
  getMotionState,
}: InvoiceListTableProps) {
  return (
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
          {invoices.map((invoice) => (
            <TableRow
              key={invoice.id}
              className="motion-list-item group/row"
              data-motion-state={getMotionState?.(invoice.id)}
            >
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
  );
}
