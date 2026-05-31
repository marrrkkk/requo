import Link from "next/link";
import type { MotionState } from "@/hooks/use-animated-list";

import { Badge } from "@/components/ui/badge";
import { getBusinessInvoicePath } from "@/features/businesses/routes";
import type {
  DashboardInvoiceListItem,
  InvoiceStatus,
} from "@/features/invoices/types";

type InvoiceListCardsProps = {
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

export function InvoiceListCards({
  invoices,
  businessSlug,
  getMotionState,
}: InvoiceListCardsProps) {
  return (
    <div className="flex flex-col gap-2 sm:hidden">
      {invoices.map((invoice) => (
        <Link
          key={invoice.id}
          href={getBusinessInvoicePath(businessSlug, invoice.id)}
          className="motion-list-item flex items-center justify-between gap-3 rounded-xl border border-border/80 bg-background px-4 py-3.5 transition-colors active:bg-muted/50"
          data-motion-state={getMotionState?.(invoice.id)}
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
  );
}
