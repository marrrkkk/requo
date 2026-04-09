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
import { QuotePostAcceptanceStatusBadge } from "@/features/quotes/components/quote-post-acceptance-status-badge";
import { QuoteReminderBadge } from "@/features/quotes/components/quote-reminder-badge";
import { QuoteStatusBadge } from "@/features/quotes/components/quote-status-badge";
import type { DashboardQuoteListItem } from "@/features/quotes/types";
import {
  formatQuoteDate,
  formatQuoteMoney,
} from "@/features/quotes/utils";
import {
  getBusinessInquiryPath,
  getBusinessQuotePath,
} from "@/features/businesses/routes";

type QuoteListTableProps = {
  quotes: DashboardQuoteListItem[];
  currency: string;
  businessSlug: string;
};

export function QuoteListTable({
  quotes,
  currency,
  businessSlug,
}: QuoteListTableProps) {
  return (
    <DashboardTableContainer>
      <TooltipProvider delayDuration={120}>
        <Table className="min-w-[58rem] table-fixed 2xl:min-w-[75rem]">
          <TableCaption className="sr-only">Newest quotes appear first.</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[18rem]">Quote</TableHead>
              <TableHead className="w-[15rem]">Customer</TableHead>
              <TableHead className="hidden w-[9rem] 2xl:table-cell">Linked inquiry</TableHead>
              <TableHead className="w-[8rem]">Valid until</TableHead>
              <TableHead className="w-[8rem]">Total</TableHead>
              <TableHead className="w-[9rem]">Status</TableHead>
              <TableHead className="hidden w-[8rem] 2xl:table-cell">Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {quotes.map((quote) => {
              const quoteHref = getBusinessQuotePath(businessSlug, quote.id);

              return (
                <TableRow className="group/row" key={quote.id}>
                  <TableCell className="w-[18rem]">
                    <div className="table-meta-stack max-w-full">
                      <TruncatedTextWithTooltip
                        className="table-link"
                        href={quoteHref}
                        prefetch={true}
                        text={quote.quoteNumber}
                      />
                      <TruncatedTextWithTooltip
                        className="table-supporting-text"
                        href={quoteHref}
                        prefetch={true}
                        text={quote.title}
                      />
                      {quote.reminders.length || quote.postAcceptanceStatus !== "none" ? (
                        <Link
                          className="flex flex-wrap gap-2"
                          href={quoteHref}
                          prefetch={true}
                        >
                          {quote.reminders.map((reminder) => (
                            <QuoteReminderBadge key={reminder} kind={reminder} />
                          ))}
                          {quote.postAcceptanceStatus !== "none" ? (
                            <QuotePostAcceptanceStatusBadge
                              status={quote.postAcceptanceStatus}
                            />
                          ) : null}
                        </Link>
                      ) : null}
                      <Link
                        className="table-supporting-text 2xl:hidden"
                        href={quoteHref}
                        prefetch={true}
                      >
                        {quote.inquiryId ? "Linked inquiry" : "Manual quote"} |{" "}
                        {formatQuoteDate(quote.createdAt)}
                      </Link>
                    </div>
                  </TableCell>
                  <TableCell className="w-[15rem]">
                    <div className="table-meta-stack max-w-full">
                      <TruncatedTextWithTooltip
                        className="table-emphasis"
                        href={quoteHref}
                        prefetch={true}
                        text={quote.customerName}
                      />
                      <TruncatedTextWithTooltip
                        className="table-supporting-text"
                        href={quoteHref}
                        prefetch={true}
                        text={quote.customerEmail}
                      />
                    </div>
                  </TableCell>
                  <TableCell className="hidden w-[9rem] 2xl:table-cell">
                    {quote.inquiryId ? (
                      <Link
                        className="text-sm font-medium text-foreground underline-offset-4 transition-colors hover:text-primary hover:underline group-hover/row:text-primary"
                        href={getBusinessInquiryPath(businessSlug, quote.inquiryId)}
                        prefetch={true}
                      >
                        Open inquiry
                      </Link>
                    ) : (
                      <Link
                        className="text-sm text-muted-foreground transition-colors hover:text-primary group-hover/row:text-primary"
                        href={quoteHref}
                        prefetch={true}
                      >
                        Manual quote
                      </Link>
                    )}
                  </TableCell>
                  <TableCell className="w-[8rem]">
                    <Link
                      className="block text-sm text-muted-foreground transition-colors hover:text-primary group-hover/row:text-primary"
                      href={quoteHref}
                      prefetch={true}
                    >
                      {formatQuoteDate(quote.validUntil)}
                    </Link>
                  </TableCell>
                  <TableCell className="w-[8rem]">
                    <Link
                      className="block text-sm font-semibold text-foreground transition-colors hover:text-primary group-hover/row:text-primary"
                      href={quoteHref}
                      prefetch={true}
                    >
                      {formatQuoteMoney(quote.totalInCents, currency)}
                    </Link>
                  </TableCell>
                  <TableCell className="w-[9rem]">
                    <Link
                      className="inline-flex max-w-full"
                      href={quoteHref}
                      prefetch={true}
                    >
                      <QuoteStatusBadge status={quote.status} />
                    </Link>
                  </TableCell>
                  <TableCell className="hidden w-[8rem] 2xl:table-cell">
                    <Link
                      className="block text-sm text-muted-foreground transition-colors hover:text-primary group-hover/row:text-primary"
                      href={quoteHref}
                      prefetch={true}
                    >
                      {formatQuoteDate(quote.createdAt)}
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
