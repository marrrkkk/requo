import { StatusBadge } from "@/components/shared/status-badge";
import type { InquiryRecordState } from "@/features/inquiries/types";
import {
  getInquiryRecordStateLabel,
  inquiryRecordStateIcons,
  inquiryRecordStateTones,
} from "@/features/inquiries/utils";

type InquiryRecordStateBadgeProps = {
  state: Exclude<InquiryRecordState, "active">;
  className?: string;
};

export function InquiryRecordStateBadge({
  state,
  className,
}: InquiryRecordStateBadgeProps) {
  return (
    <StatusBadge
      tone={inquiryRecordStateTones[state]}
      label={getInquiryRecordStateLabel(state)}
      icon={inquiryRecordStateIcons[state]}
      className={className}
    />
  );
}
