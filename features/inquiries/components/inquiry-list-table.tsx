import Link from "next/link";

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
import { TooltipProvider } from "@/components/ui/tooltip";
import type { DashboardInquiryListItem } from "@/features/inquiries/types";
import {
  formatInquiryDate,
} from "@/features/inquiries/utils";
import { InquiryStatusBadge } from "@/features/inquiries/components/inquiry-status-badge";
import { getBusinessInquiryPath } from "@/features/businesses/routes";

type InquiryListTableProps = {
  inquiries: DashboardInquiryListItem[];
  businessSlug: string;
};

export function InquiryListTable({
  inquiries,
  businessSlug,
}: InquiryListTableProps) {
  return (
    <DashboardTableContainer>
      <TooltipProvider delayDuration={120}>
        <Table className="min-w-[57rem] table-fixed">
          <TableCaption className="sr-only">Newest inquiries appear first.</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[17rem]">Customer</TableHead>
              <TableHead className="w-[13rem]">Form</TableHead>
              <TableHead className="w-[13rem]">Category</TableHead>
              <TableHead className="w-[8rem]">Created</TableHead>
              <TableHead className="w-[8.75rem]">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {inquiries.map((inquiry) => {
              const inquiryHref = getBusinessInquiryPath(businessSlug, inquiry.id);

              return (
                <TableRow className="group/row" key={inquiry.id}>
                  <TableCell className="w-[17rem]">
                    <div className="table-meta-stack max-w-full">
                      <TruncatedTextWithTooltip
                        className="table-link"
                        href={inquiryHref}
                        prefetch={true}
                        text={inquiry.customerName}
                      />
                      <TruncatedTextWithTooltip
                        className="table-supporting-text"
                        href={inquiryHref}
                        prefetch={true}
                        text={inquiry.customerEmail}
                      />
                    </div>
                  </TableCell>
                  <TableCell className="w-[13rem]">
                    <TruncatedTextWithTooltip
                      className="table-emphasis"
                      href={inquiryHref}
                      prefetch={true}
                      text={inquiry.inquiryFormName}
                    />
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
                      className="inline-flex max-w-full"
                      href={inquiryHref}
                      prefetch={true}
                    >
                      <InquiryStatusBadge status={inquiry.status} />
                    </Link>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TooltipProvider>
    </DashboardTableContainer>
  );
}
