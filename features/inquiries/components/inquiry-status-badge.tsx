import { StatusBadge } from "@/components/shared/status-badge";
import type { InquiryStatus } from "@/features/inquiries/types";
import {
  getInquiryStatusLabel,
  inquiryStatusIcons,
  inquiryStatusTones,
} from "@/features/inquiries/utils";

type InquiryStatusBadgeProps = {
  status: InquiryStatus;
  className?: string;
};

export function InquiryStatusBadge({
  status,
  className,
}: InquiryStatusBadgeProps) {
  return (
    <StatusBadge
      tone={inquiryStatusTones[status]}
      label={getInquiryStatusLabel(status)}
      icon={inquiryStatusIcons[status]}
      className={className}
    />
  );
}
