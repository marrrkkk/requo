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
import { QuoteStatusBadge } from "@/features/quotes/components/quote-status-badge";
import type { DashboardQuoteListItem } from "@/features/quotes/types";
import {
  formatQuoteDate,
  formatQuoteMoney,
} from "@/features/quotes/utils";

type QuoteListTableProps = {
  quotes: DashboardQuoteListItem[];
  currency: string;
};

export function QuoteListTable({ quotes, currency }: QuoteListTableProps) {
  return (
    <DashboardTableContainer>
      <Table className="min-w-[72rem]">
        <TableCaption className="sr-only">Newest quotes appear first.</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Quote</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Linked inquiry</TableHead>
            <TableHead>Valid until</TableHead>
            <TableHead>Total</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {quotes.map((quote) => (
            <TableRow key={quote.id}>
              <TableCell className="max-w-[18rem]">
                <div className="table-meta-stack max-w-full">
                  <Link
                    className="table-link"
                    href={`/dashboard/quotes/${quote.id}`}
                    prefetch={false}
                  >
                    {quote.quoteNumber}
                  </Link>
                  <span className="table-supporting-text">
                    {quote.title}
                  </span>
                </div>
              </TableCell>
              <TableCell className="max-w-[16rem]">
                <div className="table-meta-stack max-w-full">
                  <span className="table-emphasis">
                    {quote.customerName}
                  </span>
                  <span className="table-supporting-text">
                    {quote.customerEmail}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                {quote.inquiryId ? (
                  <Link
                    className="text-sm font-medium text-foreground underline-offset-4 transition-colors hover:text-primary hover:underline group-hover/row:text-primary"
                    href={`/dashboard/inquiries/${quote.inquiryId}`}
                    prefetch={false}
                  >
                    Open inquiry
                  </Link>
                ) : (
                  <span className="text-sm text-muted-foreground">Manual quote</span>
                )}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {formatQuoteDate(quote.validUntil)}
              </TableCell>
              <TableCell className="text-sm font-semibold text-foreground">
                {formatQuoteMoney(quote.totalInCents, currency)}
              </TableCell>
              <TableCell className="w-[9rem]">
                <QuoteStatusBadge status={quote.status} />
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {formatQuoteDate(quote.createdAt)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </DashboardTableContainer>
  );
}
