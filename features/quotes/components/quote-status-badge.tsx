import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { QuoteStatus } from "@/features/quotes/types";
import {
  getQuoteStatusLabel,
  quoteStatusClassNames,
  quoteStatusIcons,
} from "@/features/quotes/utils";

type QuoteStatusBadgeProps = {
  status: QuoteStatus;
  className?: string;
};

export function QuoteStatusBadge({
  status,
  className,
}: QuoteStatusBadgeProps) {
  const Icon = quoteStatusIcons[status];

  return (
    <Badge
      className={cn(
        "shrink-0 rounded-full",
        quoteStatusClassNames[status],
        className,
      )}
      variant="secondary"
    >
      <Icon data-icon="inline-start" />
      {getQuoteStatusLabel(status)}
    </Badge>
  );
}
