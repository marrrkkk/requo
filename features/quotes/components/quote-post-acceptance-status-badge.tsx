import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { QuotePostAcceptanceStatus } from "@/features/quotes/types";
import {
  getQuotePostAcceptanceStatusLabel,
  quotePostAcceptanceStatusClassNames,
} from "@/features/quotes/utils";

type QuotePostAcceptanceStatusBadgeProps = {
  status: QuotePostAcceptanceStatus;
  className?: string;
};

export function QuotePostAcceptanceStatusBadge({
  status,
  className,
}: QuotePostAcceptanceStatusBadgeProps) {
  return (
    <Badge
      className={cn(
        "shrink-0 rounded-full",
        quotePostAcceptanceStatusClassNames[status],
        className,
      )}
      variant="secondary"
    >
      {getQuotePostAcceptanceStatusLabel(status)}
    </Badge>
  );
}
