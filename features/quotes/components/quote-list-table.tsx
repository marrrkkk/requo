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
import { Badge } from "@/components/ui/badge";
import { QuotePostAcceptanceStatusBadge } from "@/features/quotes/components/quote-post-acceptance-status-badge";
import { QuoteRecordStateBadge } from "@/features/quotes/components/quote-record-state-badge";
import { QuoteReminderBadge } from "@/features/quotes/components/quote-reminder-badge";
import { QuoteStatusBadge } from "@/features/quotes/components/quote-status-badge";
import type { DashboardQuoteListItem } from "@/features/quotes/types";
import {
  formatQuoteDate,
  formatQuoteMoney,
} from "@/features/quotes/utils";
import { getBusinessQuotePath } from "@/features/businesses/routes";

type QuoteListTableProps = {
  quotes: DashboardQuoteListItem[];
  businessSlug: string;
};

export function QuoteListTable({
  quotes,
  businessSlug,
}: QuoteListTableProps) {
  return (
    <DashboardTableContainer className="hidden xl:block">
      <Table className="min-w-[54rem] table-fixed 2xl:min-w-[64rem]">
        <TableCaption className="sr-only">Newest quotes appear first.</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[18rem]">Quote</TableHead>
            <TableHead className="w-[15rem]">Customer</TableHead>
            <TableHead className="w-[8rem]">Valid until</TableHead>
            <TableHead className="w-[8rem]">Total</TableHead>
            <TableHead className="w-[9rem]">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {quotes.map((quote) => {
            const quoteHref = getBusinessQuotePath(businessSlug, quote.id);
            const reminders = quote.reminders.filter(
              (reminder) => reminder !== "follow_up_due",
            );

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
                    {reminders.length ||
                    quote.postAcceptanceStatus !== "none" ||
                    isViewedWithoutResponse(quote) ? (
                      <Link
                        className="flex flex-wrap gap-2"
                        href={quoteHref}
                        prefetch={true}
                      >
                        {reminders.map((reminder) => (
                          <QuoteReminderBadge key={reminder} kind={reminder} />
                        ))}
                        {quote.postAcceptanceStatus !== "none" ? (
                          <QuotePostAcceptanceStatusBadge
                            status={quote.postAcceptanceStatus}
                          />
                        ) : null}
                        {isViewedWithoutResponse(quote) ? (
                          <Badge variant="secondary">Viewed, no response</Badge>
                        ) : null}
                      </Link>
                    ) : null}
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
                      text={quote.customerEmail ?? ""}
                    />
                  </div>
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
                    {formatQuoteMoney(quote.totalInCents, quote.currency)}
                  </Link>
                </TableCell>
                <TableCell className="w-[9rem]">
                  <Link
                    className="inline-flex max-w-full flex-wrap gap-2"
                    href={quoteHref}
                    prefetch={true}
                  >
                    <QuoteStatusBadge status={quote.status} />
                    {quote.archivedAt ? <QuoteRecordStateBadge state="archived" /> : null}
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

function isViewedWithoutResponse(quote: DashboardQuoteListItem) {
  return Boolean(
    quote.status === "sent" &&
      quote.publicViewedAt &&
    !quote.customerRespondedAt,
  );
}
