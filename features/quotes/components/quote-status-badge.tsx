import { Badge } from "@/components/ui/badge";
import type { QuoteStatus } from "@/features/quotes/types";
import {
  getQuoteStatusLabel,
  quoteStatusVariants,
} from "@/features/quotes/utils";

type QuoteStatusBadgeProps = {
  status: QuoteStatus;
};

export function QuoteStatusBadge({ status }: QuoteStatusBadgeProps) {
  return <Badge variant={quoteStatusVariants[status]}>{getQuoteStatusLabel(status)}</Badge>;
}
