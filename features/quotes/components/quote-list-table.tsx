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
import { QuotePostAcceptanceStatusBadge } from "@/features/quotes/components/quote-post-acceptance-status-badge";
import { QuoteReminderBadge } from "@/features/quotes/components/quote-reminder-badge";
import { QuoteStatusBadge } from "@/features/quotes/components/quote-status-badge";
import type { DashboardQuoteListItem } from "@/features/quotes/types";
import {
  formatQuoteDate,
  formatQuoteMoney,
} from "@/features/quotes/utils";
import {
  getWorkspaceInquiryPath,
  getWorkspaceQuotePath,
} from "@/features/workspaces/routes";

type QuoteListTableProps = {
  quotes: DashboardQuoteListItem[];
  currency: string;
  workspaceSlug: string;
};

export function QuoteListTable({
  quotes,
  currency,
  workspaceSlug,
}: QuoteListTableProps) {
  return (
    <DashboardTableContainer>
      <Table className="min-w-[56rem] 2xl:min-w-[64rem]">
        <TableCaption className="sr-only">Newest quotes appear first.</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Quote</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead className="hidden 2xl:table-cell">Linked inquiry</TableHead>
            <TableHead>Valid until</TableHead>
            <TableHead>Total</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="hidden 2xl:table-cell">Created</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {quotes.map((quote) => (
            <TableRow key={quote.id}>
              <TableCell className="max-w-[18rem]">
                <div className="table-meta-stack max-w-full">
                  <Link
                    className="table-link"
                    href={getWorkspaceQuotePath(workspaceSlug, quote.id)}
                    prefetch={true}
                  >
                    {quote.quoteNumber}
                  </Link>
                  <span className="table-supporting-text">
                    {quote.title}
                  </span>
                  {quote.reminders.length || quote.postAcceptanceStatus !== "none" ? (
                    <div className="flex flex-wrap gap-2">
                      {quote.reminders.map((reminder) => (
                        <QuoteReminderBadge key={reminder} kind={reminder} />
                      ))}
                      {quote.postAcceptanceStatus !== "none" ? (
                        <QuotePostAcceptanceStatusBadge
                          status={quote.postAcceptanceStatus}
                        />
                      ) : null}
                    </div>
                  ) : null}
                  <span className="table-supporting-text 2xl:hidden">
                    {quote.inquiryId ? "Linked inquiry" : "Manual quote"} |{" "}
                    {formatQuoteDate(quote.createdAt)}
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
              <TableCell className="hidden 2xl:table-cell">
                {quote.inquiryId ? (
                  <Link
                    className="text-sm font-medium text-foreground underline-offset-4 transition-colors hover:text-primary hover:underline group-hover/row:text-primary"
                    href={getWorkspaceInquiryPath(workspaceSlug, quote.inquiryId)}
                    prefetch={true}
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
              <TableCell className="hidden text-sm text-muted-foreground 2xl:table-cell">
                {formatQuoteDate(quote.createdAt)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </DashboardTableContainer>
  );
}
