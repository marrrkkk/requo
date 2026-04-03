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
import { QuoteStatusBadge } from "@/features/quotes/components/quote-status-badge";
import type { DashboardQuoteListItem } from "@/features/quotes/types";
import {
  formatQuoteDate,
  formatQuoteMoney,
} from "@/features/quotes/utils";

type QuoteListCardsProps = {
  quotes: DashboardQuoteListItem[];
  currency: string;
};

export function QuoteListCards({ quotes, currency }: QuoteListCardsProps) {
  return (
    <div className="grid gap-4 lg:hidden">
      {quotes.map((quote) => (
        <Card key={quote.id}>
          <CardHeader className="gap-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex flex-col gap-1">
                <CardTitle className="truncate text-lg">
                  {quote.quoteNumber}
                </CardTitle>
                <CardDescription className="truncate">
                  {quote.title}
                </CardDescription>
              </div>
              <QuoteStatusBadge status={quote.status} />
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3">
            <div className="info-tile px-3 py-3 shadow-none">
              <span className="meta-label">
                Customer
              </span>
              <p className="mt-2 text-sm text-foreground">{quote.customerName}</p>
            </div>
            <div className="info-tile px-3 py-3 shadow-none">
              <span className="meta-label">
                Valid until
              </span>
              <p className="mt-2 text-sm text-foreground">
                {formatQuoteDate(quote.validUntil)}
              </p>
            </div>
            <div className="info-tile px-3 py-3 shadow-none">
              <span className="meta-label">
                Total
              </span>
              <p className="mt-2 text-sm text-foreground">
                {formatQuoteMoney(quote.totalInCents, currency)}
              </p>
            </div>
          </CardContent>
          <CardFooter className="justify-between gap-3">
            <span className="text-sm text-muted-foreground">
              {quote.inquiryId ? "Linked inquiry" : "Manual quote"}
            </span>
            <Button asChild variant="outline">
              <Link href={`/dashboard/quotes/${quote.id}`} prefetch={false}>
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
