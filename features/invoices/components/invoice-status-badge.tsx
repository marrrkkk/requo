import { StatusBadge } from "@/components/shared/status-badge";
import { cn } from "@/lib/utils";
import type { InvoiceStatus } from "@/features/invoices/types";
import {
  getInvoiceStatusLabel,
  invoiceStatusTones,
} from "@/features/invoices/utils";

export function InvoiceStatusBadge({
  status,
  className,
}: {
  status: InvoiceStatus;
  className?: string;
}) {
  return (
    <StatusBadge
      tone={invoiceStatusTones[status]}
      label={getInvoiceStatusLabel(status)}
      // Void invoices read as struck-through, as before.
      className={cn(status === "voided" && "line-through", className)}
    />
  );
}
