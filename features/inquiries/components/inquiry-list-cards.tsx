import { Bot, Copy, FileText, PenLine } from "lucide-react";
import type { MotionState } from "@/hooks/use-animated-list";
import { MobileRecordRow } from "@/components/shared/mobile-record-row";
import type { DashboardInquiryListItem } from "@/features/inquiries/types";
import { formatInquiryDate } from "@/features/inquiries/utils";
import { InquiryRecordStateBadge } from "@/features/inquiries/components/inquiry-record-state-badge";
import { InquiryStatusBadge } from "@/features/inquiries/components/inquiry-status-badge";
import { getBusinessInquiryPath } from "@/features/businesses/routes";

function getInquiryChannelDisplay(inquiry: DashboardInquiryListItem) {
  if (inquiry.inquiryFormName) {
    return { label: inquiry.inquiryFormName, icon: FileText };
  }
  if (inquiry.source === "ai") {
    return { label: "AI", icon: Bot };
  }
  return { label: "Manual", icon: PenLine };
}

type InquiryListCardsProps = {
  inquiries: DashboardInquiryListItem[];
  businessSlug: string;
  isSelected?: (id: string) => boolean;
  isAtLimit?: boolean;
  onToggle?: (id: string) => void;
  getMotionState?: (id: string) => MotionState;
};

export function InquiryListCards({
  inquiries,
  businessSlug,
  isSelected,
  isAtLimit,
  onToggle,
  getMotionState,
}: InquiryListCardsProps) {
  return (
    <div className="flex flex-col gap-2.5 xl:hidden">
      {inquiries.map((inquiry) => {
        const checked = isSelected?.(inquiry.id) ?? false;
        const disabled = !checked && (isAtLimit ?? false);
        const channel = getInquiryChannelDisplay(inquiry);
        const ChannelIcon = channel.icon;

        return (
          <MobileRecordRow
            key={inquiry.id}
            id={inquiry.id}
            href={getBusinessInquiryPath(businessSlug, inquiry.id)}
            isSelected={checked}
            isSelectionDisabled={disabled}
            onToggleSelect={onToggle}
            motionState={getMotionState?.(inquiry.id)}
            title={
              <span className="flex items-center gap-1.5 min-w-0">
                <span className="truncate">{inquiry.customerName}</span>
                {inquiry.hasDuplicateFlag ? (
                  <Copy
                    aria-label="Potential duplicate"
                    className="size-3.5 shrink-0 text-amber-500"
                  />
                ) : null}
              </span>
            }
            subtitle={
              inquiry.customerEmail ? (
                <span className="truncate">{inquiry.customerEmail}</span>
              ) : null
            }
            statusBadge={<InquiryStatusBadge status={inquiry.status} />}
            stateBadge={
              inquiry.recordState !== "active" ? (
                <InquiryRecordStateBadge state={inquiry.recordState} />
              ) : null
            }
            metadata={
              <>
                <span className="inline-flex items-center gap-1">
                  <ChannelIcon className="size-3 shrink-0 text-muted-foreground" />
                  <span className="truncate max-w-[120px]">{channel.label}</span>
                </span>
                {inquiry.serviceCategory ? (
                  <>
                    <span aria-hidden="true" className="text-muted-foreground/40">·</span>
                    <span className="truncate max-w-[130px]">{inquiry.serviceCategory}</span>
                  </>
                ) : null}
                <span aria-hidden="true" className="text-muted-foreground/40">·</span>
                <span>{formatInquiryDate(inquiry.submittedAt)}</span>
              </>
            }
          />
        );
      })}
    </div>
  );
}
