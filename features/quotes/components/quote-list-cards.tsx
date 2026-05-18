import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

type QuoteListCardsProps = {
  quotes: DashboardQuoteListItem[];
  businessSlug: string;
};

export function QuoteListCards({
  quotes,
  businessSlug,
}: QuoteListCardsProps) {
  return (
    <div className="data-list-mobile-grid">
      {quotes.map((quote) => {
        const reminders = quote.reminders.filter(
          (reminder) => reminder !== "follow_up_due",
        );

        return (
          <Link
            className="block"
            href={getBusinessQuotePath(businessSlug, quote.id)}
            key={quote.id}
            prefetch={true}
          >
            <Card className="data-list-card transition-colors hover:bg-accent/20">
              <CardHeader className="data-list-card-header">
                <div className="flex min-w-0 items-start justify-between gap-3">
                  <div className="min-w-0 flex flex-1 flex-col gap-1">
                    <CardTitle className="min-w-0 text-lg leading-tight">
                      <span className="block truncate">{quote.quoteNumber}</span>
                    </CardTitle>
                    <CardDescription className="truncate text-sm">
                      {quote.title}
                    </CardDescription>
                    {reminders.length ||
                    quote.postAcceptanceStatus !== "none" ||
                    isViewedWithoutResponse(quote) ? (
                      <div className="mt-2 flex flex-wrap gap-2">
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
                      </div>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 flex-col gap-2">
                    <QuoteStatusBadge status={quote.status} />
                    {quote.archivedAt ? (
                      <QuoteRecordStateBadge state="archived" />
                    ) : null}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-2.5 pt-0 sm:grid-cols-2 sm:gap-3">
                <div className="info-tile col-span-2 min-w-0 h-full px-3 py-2.5 shadow-none sm:px-3.5 sm:py-3">
                  <span className="meta-label">Customer</span>
                  <div className="mt-1.5 min-w-0 flex flex-col gap-0.5 sm:mt-2 sm:gap-1">
                    <p
                      className="truncate text-sm font-medium text-foreground"
                      title={quote.customerName}
                    >
                      {quote.customerName}
                    </p>
                    <p className="truncate text-sm text-muted-foreground">
                      {quote.customerEmail}
                    </p>
                  </div>
                </div>
                <div className="info-tile min-w-0 h-full px-3 py-2.5 shadow-none sm:px-3.5 sm:py-3">
                  <span className="meta-label">Valid until</span>
                  <p className="mt-1.5 truncate text-sm text-foreground sm:mt-2">
                    {formatQuoteDate(quote.validUntil)}
                  </p>
                </div>
                <div className="info-tile min-w-0 h-full px-3 py-2.5 shadow-none sm:px-3.5 sm:py-3">
                  <span className="meta-label">Total</span>
                  <p className="mt-1.5 truncate text-sm font-semibold text-foreground sm:mt-2">
                    {formatQuoteMoney(quote.totalInCents, quote.currency)}
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}

function isViewedWithoutResponse(quote: DashboardQuoteListItem) {
  return Boolean(
    quote.status === "sent" &&
      quote.publicViewedAt &&
    !quote.customerRespondedAt,
  );
}
