import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { InquiryRecordState } from "@/features/inquiries/types";
import {
  getInquiryRecordStateLabel,
  inquiryRecordStateClassNames,
  inquiryRecordStateIcons,
} from "@/features/inquiries/utils";

type InquiryRecordStateBadgeProps = {
  state: Exclude<InquiryRecordState, "active">;
  className?: string;
};

export function InquiryRecordStateBadge({
  state,
  className,
}: InquiryRecordStateBadgeProps) {
  const Icon = inquiryRecordStateIcons[state];

  return (
    <Badge
      className={cn(
        "shrink-0 rounded-full",
        inquiryRecordStateClassNames[state],
        className,
      )}
      variant="secondary"
    >
      <Icon data-icon="inline-start" />
      {getInquiryRecordStateLabel(state)}
    </Badge>
  );
}
