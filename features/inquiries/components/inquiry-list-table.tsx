import Link from "next/link";
import { Bot, FileText, PenLine } from "lucide-react";
import type { MotionState } from "@/hooks/use-animated-list";

import { Checkbox } from "@/components/ui/checkbox";
import { DashboardTableContainer } from "@/components/shared/dashboard-layout";
import { TruncatedTextWithTooltip } from "@/components/shared/truncated-text-with-tooltip";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { DashboardInquiryListItem } from "@/features/inquiries/types";
import {
  formatInquiryDate,
} from "@/features/inquiries/utils";
import { InquiryRecordStateBadge } from "@/features/inquiries/components/inquiry-record-state-badge";
import { InquiryStatusBadge } from "@/features/inquiries/components/inquiry-status-badge";
import { getBusinessInquiryPath } from "@/features/businesses/routes";
import { Copy } from "lucide-react";

function getInquiryChannelDisplay(inquiry: DashboardInquiryListItem) {
  if (inquiry.inquiryFormName) {
    return { label: inquiry.inquiryFormName, icon: FileText };
  }
  if (inquiry.source === "ai") {
    return { label: "AI", icon: Bot };
  }
  return { label: "Manual", icon: PenLine };
}

type InquiryListTableProps = {
  inquiries: DashboardInquiryListItem[];
  businessSlug: string;
  isSelected?: (id: string) => boolean;
  isAtLimit?: boolean;
  onToggle?: (id: string) => void;
  allOnPageSelected?: boolean;
  onSelectAllOnPage?: () => void;
  getMotionState?: (id: string) => MotionState;
};

export function InquiryListTable({
  inquiries,
  businessSlug,
  isSelected,
  isAtLimit,
  onToggle,
  allOnPageSelected,
  onSelectAllOnPage,
  getMotionState,
}: InquiryListTableProps) {
  return (
    <DashboardTableContainer className="hidden xl:block">
      <Table className="min-w-[69rem] table-fixed">
        <TableCaption className="sr-only">Newest inquiries appear first.</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[3rem]">
              <Checkbox
                aria-label="Select all inquiries on this page"
                checked={allOnPageSelected}
                onCheckedChange={onSelectAllOnPage}
              />
            </TableHead>
            <TableHead className="w-[17rem]">Customer</TableHead>
            <TableHead className="w-[13rem]">Channel</TableHead>
            <TableHead className="w-[13rem]">Service</TableHead>
            <TableHead className="w-[8rem]">Created</TableHead>
            <TableHead className="w-[8.75rem]">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {inquiries.map((inquiry) => {
            const inquiryHref = getBusinessInquiryPath(businessSlug, inquiry.id);
            const checked = isSelected?.(inquiry.id) ?? false;
            const disabled = !checked && (isAtLimit ?? false);

            return (
              <TableRow className="motion-list-item group/row" data-motion-state={getMotionState?.(inquiry.id)} key={inquiry.id}>
                <TableCell className="w-[3rem]">
                  <Checkbox
                    aria-label={`Select inquiry from ${inquiry.customerName}`}
                    checked={checked}
                    disabled={disabled}
                    onCheckedChange={() => onToggle?.(inquiry.id)}
                  />
                </TableCell>
                <TableCell className="w-[17rem]">
                  <div className="table-meta-stack max-w-full">
                    <div className="flex items-center gap-1.5">
                      <TruncatedTextWithTooltip
                        className="table-link"
                        href={inquiryHref}
                        prefetch={true}
                        text={inquiry.customerName}
                      />
                      {inquiry.hasDuplicateFlag ? (
                        <Copy
                          aria-label="Potential duplicate"
                          className="size-3.5 shrink-0 text-amber-500"
                        />
                      ) : null}
                    </div>
                    <TruncatedTextWithTooltip
                      className="table-supporting-text"
                      href={inquiryHref}
                      prefetch={true}
                      text={inquiry.customerEmail ?? ""}
                    />
                  </div>
                </TableCell>
                <TableCell className="w-[13rem]">
                  {(() => {
                    const channel = getInquiryChannelDisplay(inquiry);
                    const Icon = channel.icon;
                    return (
                      <Link
                        className="inline-flex items-center gap-1.5 text-sm text-foreground transition-colors hover:text-primary group-hover/row:text-primary"
                        href={inquiryHref}
                        prefetch={true}
                      >
                        <Icon aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />
                        <span className="truncate">{channel.label}</span>
                      </Link>
                    );
                  })()}
                </TableCell>
                <TableCell className="w-[13rem]">
                  <TruncatedTextWithTooltip
                    className="table-emphasis"
                    href={inquiryHref}
                    prefetch={true}
                    text={inquiry.serviceCategory}
                  />
                </TableCell>
                <TableCell className="w-[8rem]">
                  <Link
                    className="block text-sm text-muted-foreground transition-colors hover:text-primary group-hover/row:text-primary"
                    href={inquiryHref}
                    prefetch={true}
                  >
                    {formatInquiryDate(inquiry.submittedAt)}
                  </Link>
                </TableCell>
                <TableCell className="w-[8.75rem]">
                  <Link
                    className="inline-flex max-w-full flex-wrap gap-2"
                    href={inquiryHref}
                    prefetch={true}
                  >
                    <InquiryStatusBadge status={inquiry.status} />
                    {inquiry.recordState !== "active" ? (
                      <InquiryRecordStateBadge state={inquiry.recordState} />
                    ) : null}
                  </Link>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </DashboardTableContainer>
  );
}
