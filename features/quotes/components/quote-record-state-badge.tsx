import { StatusBadge } from "@/components/shared/status-badge";
import {
  quoteRecordStateIcons,
  quoteRecordStateLabels,
  quoteRecordStateTones,
} from "@/features/quotes/utils";

type QuoteRecordStateBadgeProps = {
  state: "archived";
  className?: string;
};

export function QuoteRecordStateBadge({
  state,
  className,
}: QuoteRecordStateBadgeProps) {
  return (
    <StatusBadge
      tone={quoteRecordStateTones[state]}
      label={quoteRecordStateLabels[state]}
      icon={quoteRecordStateIcons[state]}
      className={className}
    />
  );
}
