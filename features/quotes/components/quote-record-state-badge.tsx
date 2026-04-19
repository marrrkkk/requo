import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  quoteRecordStateClassNames,
  quoteRecordStateIcons,
  quoteRecordStateLabels,
} from "@/features/quotes/utils";

type QuoteRecordStateBadgeProps = {
  state: "archived";
  className?: string;
};

export function QuoteRecordStateBadge({
  state,
  className,
}: QuoteRecordStateBadgeProps) {
  const Icon = quoteRecordStateIcons[state];

  return (
    <Badge
      className={cn(
        "shrink-0 rounded-full",
        quoteRecordStateClassNames[state],
        className,
      )}
      variant="secondary"
    >
      <Icon data-icon="inline-start" />
      {quoteRecordStateLabels[state]}
    </Badge>
  );
}
