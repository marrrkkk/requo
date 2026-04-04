import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
import { getWorkspaceQuotePath } from "@/features/workspaces/routes";

type QuoteListCardsProps = {
  quotes: DashboardQuoteListItem[];
  currency: string;
  workspaceSlug: string;
};

export function QuoteListCards({
  quotes,
  currency,
  workspaceSlug,
}: QuoteListCardsProps) {
  return (
    <div className="data-list-mobile-grid">
      {quotes.map((quote) => (
        <Card key={quote.id} className="data-list-card">
          <CardHeader className="data-list-card-header">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex flex-col gap-1">
                <CardTitle className="text-lg leading-tight">
                  <Link
                    className="block truncate underline-offset-4 transition-colors hover:text-primary hover:underline"
                    href={getWorkspaceQuotePath(workspaceSlug, quote.id)}
                    prefetch={true}
                  >
                    {quote.quoteNumber}
                  </Link>
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
              <QuoteStatusBadge status={quote.status} />
            </div>
          </CardHeader>
          <CardContent className="data-list-card-meta pt-0">
            <div className="info-tile h-full px-3.5 py-3 shadow-none">
              <span className="meta-label">
                Customer
              </span>
              <div className="mt-2 flex flex-col gap-1">
                <p className="text-sm font-medium text-foreground">
                  {quote.customerName}
                </p>
                <p className="truncate text-sm text-muted-foreground">
                  {quote.customerEmail}
                </p>
              </div>
            </div>
            <div className="info-tile h-full px-3.5 py-3 shadow-none">
              <span className="meta-label">
                Valid until
              </span>
              <p className="mt-2 text-sm text-foreground">
                {formatQuoteDate(quote.validUntil)}
              </p>
            </div>
            <div className="info-tile h-full px-3.5 py-3 shadow-none">
              <span className="meta-label">
                Total
              </span>
              <p className="mt-2 text-sm font-semibold text-foreground">
                {formatQuoteMoney(quote.totalInCents, currency)}
              </p>
            </div>
          </CardContent>
          <CardFooter className="data-list-card-footer">
            <span className="text-sm text-muted-foreground">
              {quote.inquiryId
                ? "Linked to the original inquiry"
                : "Created manually from the workspace"}
            </span>
            <Button asChild className="w-full sm:w-auto" size="sm" variant="outline">
              <Link
                href={getWorkspaceQuotePath(workspaceSlug, quote.id)}
                prefetch={true}
              >
                Open quote
                <ArrowRight data-icon="inline-end" />
              </Link>
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
