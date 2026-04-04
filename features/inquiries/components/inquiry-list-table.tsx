import Link from "next/link";

import { DashboardTableContainer } from "@/components/shared/dashboard-layout";
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
  formatInquiryBudget,
  formatInquiryDate,
} from "@/features/inquiries/utils";
import { InquiryStatusBadge } from "@/features/inquiries/components/inquiry-status-badge";
import { getWorkspaceInquiryPath } from "@/features/workspaces/routes";

type InquiryListTableProps = {
  inquiries: DashboardInquiryListItem[];
  workspaceSlug: string;
};

export function InquiryListTable({
  inquiries,
  workspaceSlug,
}: InquiryListTableProps) {
  return (
    <DashboardTableContainer>
      <Table className="min-w-[46rem]">
        <TableCaption className="sr-only">Newest inquiries appear first.</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Customer</TableHead>
            <TableHead>Form</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Budget</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {inquiries.map((inquiry) => (
            <TableRow key={inquiry.id}>
              <TableCell className="max-w-[20rem]">
                <div className="table-meta-stack max-w-full">
                  <Link
                    className="table-link"
                    href={getWorkspaceInquiryPath(workspaceSlug, inquiry.id)}
                    prefetch={true}
                  >
                    {inquiry.customerName}
                  </Link>
                  <span className="table-supporting-text">
                    {inquiry.customerEmail}
                  </span>
                </div>
              </TableCell>
              <TableCell className="max-w-[16rem]">
                <p className="table-emphasis">{inquiry.inquiryFormName}</p>
              </TableCell>
              <TableCell className="max-w-[16rem]">
                <p className="table-emphasis">{inquiry.serviceCategory}</p>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {formatInquiryBudget(inquiry.budgetText)}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {formatInquiryDate(inquiry.submittedAt)}
              </TableCell>
              <TableCell className="w-[8.75rem]">
                <InquiryStatusBadge status={inquiry.status} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </DashboardTableContainer>
  );
}
