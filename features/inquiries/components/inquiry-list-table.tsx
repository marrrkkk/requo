import Link from "next/link";

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

type InquiryListTableProps = {
  inquiries: DashboardInquiryListItem[];
};

export function InquiryListTable({ inquiries }: InquiryListTableProps) {
  return (
    <div className="section-panel hidden p-4 lg:block">
      <Table>
        <TableCaption>Newest inquiries appear first.</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Customer</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Budget</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {inquiries.map((inquiry) => (
            <TableRow key={inquiry.id}>
              <TableCell className="max-w-[18rem]">
                <div className="flex flex-col gap-1">
                  <Link
                    className="font-semibold text-foreground underline-offset-4 hover:text-primary hover:underline"
                    href={`/dashboard/inquiries/${inquiry.id}`}
                    prefetch={false}
                  >
                    {inquiry.customerName}
                  </Link>
                  <span className="truncate text-sm text-muted-foreground">
                    {inquiry.customerEmail}
                  </span>
                </div>
              </TableCell>
              <TableCell className="max-w-[16rem] truncate">
                {inquiry.serviceCategory}
              </TableCell>
              <TableCell>{formatInquiryBudget(inquiry.budgetText)}</TableCell>
              <TableCell>{formatInquiryDate(inquiry.submittedAt)}</TableCell>
              <TableCell>
                <InquiryStatusBadge status={inquiry.status} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
