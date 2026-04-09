import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { QuotePostAcceptanceStatusBadge } from "@/features/quotes/components/quote-post-acceptance-status-badge";
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
  currency: string;
  businessSlug: string;
};

export function QuoteListCards({
  quotes,
  currency,
  businessSlug,
}: QuoteListCardsProps) {
  return (
    <div className="data-list-mobile-grid">
      {quotes.map((quote) => (
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
                  {quote.reminders.length || quote.postAcceptanceStatus !== "none" ? (
                    <div className="mt-2 flex flex-wrap gap-2">
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
                </div>
                <div className="shrink-0">
                  <QuoteStatusBadge status={quote.status} />
                </div>
              </div>
            </CardHeader>
            <CardContent className="data-list-card-meta pt-0">
              <div className="info-tile min-w-0 h-full px-3.5 py-3 shadow-none">
                <span className="meta-label">
                  Customer
                </span>
                <div className="mt-2 min-w-0 flex flex-col gap-1">
                  <p className="truncate text-sm font-medium text-foreground" title={quote.customerName}>
                    {quote.customerName}
                  </p>
                  <p className="truncate text-sm text-muted-foreground">
                    {quote.customerEmail}
                  </p>
                </div>
              </div>
              <div className="info-tile min-w-0 h-full px-3.5 py-3 shadow-none">
                <span className="meta-label">
                  Valid until
                </span>
                <p className="mt-2 truncate text-sm text-foreground">
                  {formatQuoteDate(quote.validUntil)}
                </p>
              </div>
              <div className="info-tile min-w-0 h-full px-3.5 py-3 shadow-none">
                <span className="meta-label">
                  Total
                </span>
                <p className="mt-2 truncate text-sm font-semibold text-foreground">
                  {formatQuoteMoney(quote.totalInCents, currency)}
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
