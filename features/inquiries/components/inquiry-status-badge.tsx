import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { InquiryStatus } from "@/features/inquiries/types";
import {
  inquiryStatusClassNames,
  getInquiryStatusLabel,
  inquiryStatusIcons,
} from "@/features/inquiries/utils";

type InquiryStatusBadgeProps = {
  status: InquiryStatus;
  className?: string;
};

export function InquiryStatusBadge({
  status,
  className,
}: InquiryStatusBadgeProps) {
  const Icon = inquiryStatusIcons[status];

  return (
    <Badge
      className={cn(
        "shrink-0 rounded-full",
        inquiryStatusClassNames[status],
        className,
      )}
      variant="secondary"
    >
      <Icon data-icon="inline-start" />
      {getInquiryStatusLabel(status)}
    </Badge>
  );
}
