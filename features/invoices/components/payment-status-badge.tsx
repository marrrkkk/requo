import { StatusBadge } from "@/components/shared/status-badge";
import { cn } from "@/lib/utils";
import type { PaymentListItem } from "@/features/invoices/types";
import {
  getPaymentStatusLabel,
  paymentStatusTones,
} from "@/features/invoices/utils";

export function PaymentStatusBadge({
  status,
  className,
}: {
  status: PaymentListItem["status"];
  className?: string;
}) {
  return (
    <StatusBadge
      tone={paymentStatusTones[status]}
      label={getPaymentStatusLabel(status)}
      // Voided payments read as struck-through, as before.
      className={cn(status === "voided" && "line-through", className)}
    />
  );
}
