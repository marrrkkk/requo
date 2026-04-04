import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { QuoteReminderKind } from "@/features/quotes/types";
import {
  getQuoteReminderLabel,
  quoteReminderClassNames,
} from "@/features/quotes/utils";

type QuoteReminderBadgeProps = {
  kind: QuoteReminderKind;
  className?: string;
};

export function QuoteReminderBadge({
  kind,
  className,
}: QuoteReminderBadgeProps) {
  return (
    <Badge
      className={cn(
        "shrink-0 rounded-full",
        quoteReminderClassNames[kind],
        className,
      )}
      variant="secondary"
    >
      {getQuoteReminderLabel(kind)}
    </Badge>
  );
}
