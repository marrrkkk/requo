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
    <div className="hidden rounded-[1.7rem] border bg-background/75 p-4 shadow-sm lg:block">
      <Table>
        <TableCaption>Newest quotes appear first.</TableCaption>
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
                <div className="flex flex-col gap-1">
                  <Link
                    className="font-medium text-foreground underline-offset-4 hover:underline"
                    href={`/dashboard/quotes/${quote.id}`}
                    prefetch={false}
                  >
                    {quote.quoteNumber}
                  </Link>
                  <span className="truncate text-sm text-muted-foreground">
                    {quote.title}
                  </span>
                </div>
              </TableCell>
              <TableCell className="max-w-[16rem]">
                <div className="flex flex-col gap-1">
                  <span className="font-medium text-foreground">
                    {quote.customerName}
                  </span>
                  <span className="truncate text-sm text-muted-foreground">
                    {quote.customerEmail}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                {quote.inquiryId ? (
                  <Link
                    className="text-sm text-foreground underline-offset-4 hover:underline"
                    href={`/dashboard/inquiries/${quote.inquiryId}`}
                    prefetch={false}
                  >
                    Linked
                  </Link>
                ) : (
                  <span className="text-sm text-muted-foreground">Manual</span>
                )}
              </TableCell>
              <TableCell>{formatQuoteDate(quote.validUntil)}</TableCell>
              <TableCell>
                {formatQuoteMoney(quote.totalInCents, currency)}
              </TableCell>
              <TableCell>
                <QuoteStatusBadge status={quote.status} />
              </TableCell>
              <TableCell>{formatQuoteDate(quote.createdAt)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
