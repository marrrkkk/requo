"use client";

import Link from "next/link";
import { ChevronDown, Plus, ReceiptText } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { QuoteStatusBadge } from "@/features/quotes/components/quote-status-badge";
import type { QuoteStatus } from "@/features/quotes/types";
import { formatQuoteMoney } from "@/features/quotes/utils";
import {
  getBusinessNewQuotePath,
  getBusinessQuotePath,
} from "@/features/businesses/routes";
import { formatInquiryDate } from "@/features/inquiries/utils";
import type { DashboardInquiryRelatedQuotes } from "@/features/inquiries/types";

type InquiryQuoteActionsProps = {
  businessSlug: string;
  relatedQuotes: DashboardInquiryRelatedQuotes;
  canGenerateQuote: boolean;
  inquiryId: string;
  currency?: string;
};

export function InquiryQuoteActions({
  businessSlug,
  relatedQuotes,
  canGenerateQuote,
  inquiryId,
  currency,
}: InquiryQuoteActionsProps) {
  if (relatedQuotes.count === 1) {
    // Single quote: primary "View quote" button + dropdown chevron for "Create new quote"
    return (
      <div className="flex items-center">
        <Button asChild className="rounded-r-none border-r-0">
          <Link
            href={getBusinessQuotePath(businessSlug, relatedQuotes.latest.id)}
          >
            <ReceiptText data-icon="inline-start" />
            View quote
          </Link>
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              className="rounded-l-none border-l-border/40 px-2"
              aria-label="More quote actions"
            >
              <ChevronDown className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {canGenerateQuote ? (
              <DropdownMenuItem asChild>
                <Link href={getBusinessNewQuotePath(businessSlug, inquiryId)}>
                  <Plus className="size-4" />
                  Create new quote
                </Link>
              </DropdownMenuItem>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  // Multiple quotes: "View quotes (N)" button with dropdown listing all quotes
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button>
          <ReceiptText data-icon="inline-start" />
          View quotes ({relatedQuotes.count})
          <ChevronDown className="ml-1 size-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-56">
        {relatedQuotes.all.map((quote) => (
          <DropdownMenuItem key={quote.id} asChild>
            <Link
              href={getBusinessQuotePath(businessSlug, quote.id)}
              className="flex items-center justify-between gap-3"
            >
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="text-sm font-medium truncate">
                  {quote.quoteNumber ?? quote.id}
                </span>
                <span className="text-xs text-muted-foreground">
                  {currency
                    ? formatQuoteMoney(quote.totalInCents, currency)
                    : null}
                  {currency ? " · " : null}
                  {formatInquiryDate(quote.createdAt)}
                </span>
              </div>
              <QuoteStatusBadge status={quote.status as QuoteStatus} />
            </Link>
          </DropdownMenuItem>
        ))}
        {canGenerateQuote ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href={getBusinessNewQuotePath(businessSlug, inquiryId)}>
                <Plus className="size-4" />
                Create new quote
              </Link>
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
