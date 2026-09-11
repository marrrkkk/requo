import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { InvoiceStatus } from "@/features/invoices/types";
import { getInvoiceStatusLabel } from "@/features/invoices/utils";

const classes: Record<InvoiceStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  sent: "bg-blue-500/12 text-blue-700 dark:text-blue-300",
  unpaid: "bg-amber-500/12 text-amber-700 dark:text-amber-300",
  partially_paid: "bg-orange-500/12 text-orange-700 dark:text-orange-300",
  paid: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
  overdue: "bg-red-500/12 text-red-700 dark:text-red-300",
  voided: "bg-muted text-muted-foreground line-through",
};

export function InvoiceStatusBadge({ status, className }: { status: InvoiceStatus; className?: string }) {
  return <Badge variant="secondary" className={cn("rounded-full", classes[status], className)}>{getInvoiceStatusLabel(status)}</Badge>;
}
