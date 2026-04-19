"use client";

import { useMemo, useState } from "react";
import { Mail, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PublicQuoteResponseForm } from "@/features/quotes/components/public-quote-response-form";
import { QuoteStatusBadge } from "@/features/quotes/components/quote-status-badge";
import type {
  PublicQuoteResolvedSnapshot,
  PublicQuoteResponseActionState,
  PublicQuoteView,
} from "@/features/quotes/types";
import {
  formatQuoteDate,
  formatQuoteDateTime,
  formatQuoteMoney,
} from "@/features/quotes/utils";

type PublicQuoteInteractiveColumnProps = {
  quote: PublicQuoteView;
  respondAction: (
    state: PublicQuoteResponseActionState,
    formData: FormData,
  ) => Promise<PublicQuoteResponseActionState>;
};

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="info-tile shadow-none">
      <div className="flex flex-col gap-1">
        <p className="meta-label">{label}</p>
        <p className="text-sm font-semibold text-foreground">{value}</p>
      </div>
    </div>
  );
}

export function PublicQuoteInteractiveColumn({
  quote,
  respondAction,
}: PublicQuoteInteractiveColumnProps) {
  const [resolved, setResolved] = useState<PublicQuoteResolvedSnapshot | null>(
    null,
  );

  const displayStatus = resolved?.status ?? quote.status;
  const isActionable = displayStatus === "sent";
  const customerRespondedAt =
    resolved?.customerRespondedAt != null
      ? new Date(resolved.customerRespondedAt)
      : quote.customerRespondedAt
        ? new Date(quote.customerRespondedAt as unknown as string | Date)
        : null;
  const customerResponseMessage =
    resolved?.customerResponseMessage ?? quote.customerResponseMessage;

  const headingCopy = useMemo(() => {
    if (isActionable) {
      return {
        title: "Ready to respond?" as const,
        description:
          "Accept to confirm, or decline with an optional note." as const,
      };
    }

    if (displayStatus === "accepted") {
      return {
        title: "Quote accepted" as const,
        description:
          "This quote has already been accepted and recorded." as const,
      };
    }

    if (displayStatus === "rejected") {
      return {
        title: "Quote declined" as const,
        description: "This quote has already been declined." as const,
      };
    }

    if (displayStatus === "voided") {
      return {
        title: "Quote voided" as const,
        description:
          "This quote was voided and is no longer accepting online responses." as const,
      };
    }

    return {
      title: "Quote no longer active" as const,
      description: "This quote is no longer accepting online responses." as const,
    };
  }, [displayStatus, isActionable]);

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <div className="flex flex-col gap-4">
        <span className="eyebrow">Customer quote</span>
        <div className="flex flex-wrap items-center gap-3">
          <QuoteStatusBadge status={displayStatus} />
        </div>
        <div className="flex flex-col gap-3">
          <h1 className="max-w-2xl font-heading text-4xl font-semibold leading-tight tracking-tight text-balance sm:text-5xl">
            {quote.title}
          </h1>
          <p className="max-w-xl text-base leading-8 text-muted-foreground sm:text-lg">
            {quote.businessShortDescription?.trim() ||
              `${quote.businessName} prepared this quote for ${quote.customerName}. Review the details and respond when you're ready.`}
          </p>
        </div>
      </div>

      <Card className="gap-0 bg-background/94">
        <CardHeader className="gap-3 pb-5">
          <CardTitle>Quote summary</CardTitle>
          <CardDescription className="leading-7">
            Review the scope, total, and validity date.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 pt-0 sm:grid-cols-2">
          <Stat label="Prepared by" value={quote.businessName} />
          <Stat label="Prepared for" value={quote.customerName} />
          <Stat
            label="Total"
            value={formatQuoteMoney(quote.totalInCents, quote.currency)}
          />
          <Stat label="Valid until" value={formatQuoteDate(quote.validUntil)} />
        </CardContent>
      </Card>

      <Card className="gap-0 bg-background/94">
        <CardHeader className="gap-3 pb-5">
          <CardTitle>{headingCopy.title}</CardTitle>
          <CardDescription className="leading-7">
            {headingCopy.description}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 pt-0">
          {isActionable ? (
            <PublicQuoteResponseForm
              action={respondAction}
              onResolved={setResolved}
            />
          ) : (
            <div className="soft-panel p-4 text-sm leading-7 text-muted-foreground">
              {customerRespondedAt ? (
                <>
                  Response recorded on{" "}
                  {formatQuoteDateTime(customerRespondedAt)}.
                </>
              ) : displayStatus === "voided" ? (
                "This quote was voided by the business and is now read-only."
              ) : displayStatus === "expired" ? (
                <>
                  This quote expired on {formatQuoteDate(quote.validUntil)}.
                </>
              ) : (
                "This quote is already closed."
              )}
            </div>
          )}

          {customerResponseMessage ? (
            <div className="soft-panel p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                Message on file
              </p>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-foreground">
                {customerResponseMessage}
              </p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card className="gap-0 bg-background/94">
        <CardHeader className="gap-3 pb-5">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-accent text-accent-foreground">
              <ShieldCheck className="size-4" />
            </div>
            <div className="flex flex-col gap-1">
              <CardTitle>Secure customer view</CardTitle>
              <CardDescription className="leading-7">
                This page only exposes the quote details needed to review and
                respond.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        {quote.businessContactEmail ? (
          <CardContent className="pt-0">
            <Button asChild className="w-full sm:w-auto">
              <a href={`mailto:${quote.businessContactEmail}`}>
                <Mail data-icon="inline-start" />
                Contact {quote.businessName}
              </a>
            </Button>
          </CardContent>
        ) : null}
      </Card>
    </div>
  );
}
