import { StatusBadge } from "@/components/shared/status-badge";
import type { QuoteStatus } from "@/features/quotes/types";
import {
  getQuoteStatusLabel,
  quoteStatusIcons,
  quoteStatusTones,
} from "@/features/quotes/utils";

type QuoteStatusBadgeProps = {
  status: QuoteStatus;
  size?: "default" | "sm";
  className?: string;
};

export function QuoteStatusBadge({ status, size, className }: QuoteStatusBadgeProps) {
  return (
    <StatusBadge
      tone={quoteStatusTones[status]}
      label={getQuoteStatusLabel(status)}
      icon={quoteStatusIcons[status]}
      size={size}
      className={className}
    />
  );
}
