import { StatusBadge } from "@/components/shared/status-badge";
import type { QuoteReminderKind } from "@/features/quotes/types";
import {
  getQuoteReminderLabel,
  quoteReminderTones,
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
    <StatusBadge
      tone={quoteReminderTones[kind]}
      label={getQuoteReminderLabel(kind)}
      className={className}
    />
  );
}
