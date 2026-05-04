"use client";

import { useMemo, useState } from "react";
import { Mail } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PublicQuoteResponseForm } from "@/features/quotes/components/public-quote-response-form";
import type {
  PublicQuoteResolvedSnapshot,
  PublicQuoteResponseActionState,
  PublicQuoteView,
} from "@/features/quotes/types";
import {
  formatQuoteDate,
  formatQuoteDateTime,
} from "@/features/quotes/utils";

type PublicQuoteInteractiveColumnProps = {
  quote: PublicQuoteView;
  respondAction: (
    state: PublicQuoteResponseActionState,
    formData: FormData,
  ) => Promise<PublicQuoteResponseActionState>;
};

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
        title: "Quote response" as const,
        description:
          "Accept to confirm, or decline with an optional note." as const,
      };
    }

    if (displayStatus === "accepted") {
      return {
        title: "Quote accepted" as const,
        description:
          "This quote has been accepted." as const,
      };
    }

    if (displayStatus === "rejected") {
      return {
        title: "Quote declined" as const,
        description: "This quote has been declined." as const,
      };
    }

    if (displayStatus === "voided") {
      return {
        title: "Quote voided" as const,
        description:
          "This quote was voided." as const,
      };
    }

    return {
      title: "Quote no longer active" as const,
      description: "This quote is no longer accepting online responses." as const,
    };
  }, [displayStatus, isActionable]);

  return (
    <div className="flex w-full flex-col gap-6">
      <Card className="gap-0 bg-background/94 w-full">
        <CardHeader className="gap-2 pb-5">
          <CardTitle>{headingCopy.title}</CardTitle>
          <CardDescription className="leading-normal sm:leading-7">
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
            <div className="soft-panel p-4 text-sm leading-normal sm:leading-7 text-muted-foreground">
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
              <p className="mt-3 whitespace-pre-wrap text-sm leading-normal sm:leading-7 text-foreground">
                {customerResponseMessage}
              </p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {quote.businessContactEmail ? (
        <Card className="gap-0 bg-background/94 w-full">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Questions about this quote?</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <Button asChild className="w-full sm:w-auto" variant="outline">
              <a href={`mailto:${quote.businessContactEmail}`}>
                <Mail data-icon="inline-start" className="size-4" />
                Contact {quote.businessName}
              </a>
            </Button>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
