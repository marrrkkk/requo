import { Badge } from "@/components/ui/badge";
import type { QuoteStatus } from "@/features/quotes/types";
import {
  getQuoteStatusLabel,
  quoteStatusIcons,
  quoteStatusVariants,
} from "@/features/quotes/utils";

type QuoteStatusBadgeProps = {
  status: QuoteStatus;
};

export function QuoteStatusBadge({ status }: QuoteStatusBadgeProps) {
  const Icon = quoteStatusIcons[status];

  return (
    <Badge className="shrink-0 rounded-full" variant={quoteStatusVariants[status]}>
      <Icon data-icon="inline-start" />
      {getQuoteStatusLabel(status)}
    </Badge>
  );
}
