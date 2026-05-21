"use client";

import { useCallback, useMemo, useState } from "react";
import { CheckCircle2, CircleSlash, Clock, Edit, Mail, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PublicQuoteResponseForm } from "@/features/quotes/components/public-quote-response-form";
import { PublicQuoteRevisionForm } from "@/features/quotes/components/public-quote-revision-form";
import type {
  PublicQuoteResolvedSnapshot,
  PublicQuoteResponseActionState,
  PublicQuoteRevisionRequestActionState,
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
  revisionAction?: (
    state: PublicQuoteRevisionRequestActionState,
    formData: FormData,
  ) => Promise<PublicQuoteRevisionRequestActionState>;
};

export function PublicQuoteInteractiveColumn({
  quote,
  respondAction,
  revisionAction,
}: PublicQuoteInteractiveColumnProps) {
  const [resolved, setResolved] = useState<PublicQuoteResolvedSnapshot | null>(
    null,
  );
  const [revisionDialogOpen, setRevisionDialogOpen] = useState(false);
  const [revisionSubmitted, setRevisionSubmitted] = useState(false);

  const displayStatus = resolved?.status ?? (revisionSubmitted ? "revision_requested" : quote.status);
  const isActionable = displayStatus === "sent";
  const isRevisionRequested = displayStatus === "revision_requested";
  const customerRespondedAt =
    resolved?.customerRespondedAt != null
      ? new Date(resolved.customerRespondedAt)
      : quote.customerRespondedAt
        ? new Date(quote.customerRespondedAt as unknown as string | Date)
        : null;
  const customerResponseMessage =
    resolved?.customerResponseMessage ?? quote.customerResponseMessage;

  const statusInfo = useMemo(() => {
    if (displayStatus === "accepted") {
      return {
        icon: CheckCircle2,
        iconColor: "text-emerald-500",
        bgColor: "border-emerald-500/20 bg-emerald-500/5",
        title: "Quote accepted",
        description: "You accepted this quote. The business has been notified.",
      };
    }
    if (displayStatus === "rejected") {
      return {
        icon: XCircle,
        iconColor: "text-red-400",
        bgColor: "border-red-500/20 bg-red-500/5",
        title: "Quote declined",
        description: "You declined this quote. The business has been notified.",
      };
    }
    if (displayStatus === "revision_requested") {
      return {
        icon: Edit,
        iconColor: "text-amber-500",
        bgColor: "border-amber-500/20 bg-amber-500/5",
        title: "Revision requested",
        description: "You\u2019ve requested changes to this quote. The business will review and send an updated version.",
      };
    }
    if (displayStatus === "voided") {
      return {
        icon: CircleSlash,
        iconColor: "text-muted-foreground",
        bgColor: "border-border/60 bg-muted/30",
        title: "Quote voided",
        description:
          "This quote was voided by the business and is no longer active.",
      };
    }
    if (displayStatus === "expired") {
      return {
        icon: Clock,
        iconColor: "text-amber-500",
        bgColor: "border-amber-500/20 bg-amber-500/5",
        title: "Quote expired",
        description: `This quote expired on ${formatQuoteDate(quote.validUntil)}. Contact the business if you'd still like to proceed.`,
      };
    }
    return {
      icon: CircleSlash,
      iconColor: "text-muted-foreground",
      bgColor: "border-border/60 bg-muted/30",
      title: "Quote closed",
      description: "This quote is no longer accepting responses.",
    };
  }, [displayStatus, quote.validUntil]);

  const handleRevisionSuccess = useCallback(() => {
    setRevisionDialogOpen(false);
    setRevisionSubmitted(true);
  }, []);

  return (
    <div className="flex flex-col gap-5">
      {isActionable ? (
        <div className="rounded-xl border border-border/60 bg-background/95 px-4 py-5 shadow-sm sm:p-6">
          <p className="mb-4 text-sm font-medium text-muted-foreground">
            Ready to respond?
          </p>
          <PublicQuoteResponseForm
            action={respondAction}
            onResolved={setResolved}
          />

          {revisionAction ? (
            <div className="mt-4 border-t border-border/40 pt-4">
              <Dialog open={revisionDialogOpen} onOpenChange={setRevisionDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-full">
                    <Edit data-icon="inline-start" className="size-3.5" />
                    Request revision
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Request revision</DialogTitle>
                    <DialogDescription>
                      Let the business know what changes you&apos;d like. You can comment on
                      specific items or leave a general message.
                    </DialogDescription>
                  </DialogHeader>
                  <PublicQuoteRevisionForm
                    action={revisionAction}
                    onSuccess={handleRevisionSuccess}
                  />
                </DialogContent>
              </Dialog>
            </div>
          ) : null}
        </div>
      ) : isRevisionRequested ? (
        <div
          className={`flex items-start gap-3.5 rounded-xl border p-4 sm:p-5 ${statusInfo.bgColor}`}
        >
          <statusInfo.icon
            className={`mt-0.5 size-5 shrink-0 ${statusInfo.iconColor}`}
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">
              {statusInfo.title}
            </p>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              {statusInfo.description}
            </p>
          </div>
        </div>
      ) : (
        <div
          className={`flex items-start gap-3.5 rounded-xl border p-4 sm:p-5 ${statusInfo.bgColor}`}
        >
          <statusInfo.icon
            className={`mt-0.5 size-5 shrink-0 ${statusInfo.iconColor}`}
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">
              {statusInfo.title}
            </p>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              {statusInfo.description}
            </p>
            {customerRespondedAt ? (
              <p className="mt-2 text-xs text-muted-foreground/80">
                Responded {formatQuoteDateTime(customerRespondedAt)}
              </p>
            ) : null}
          </div>
        </div>
      )}

      {customerResponseMessage ? (
        <div className="rounded-xl border border-border/50 px-4 py-4 sm:px-5">
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
            Your message
          </p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
            {customerResponseMessage}
          </p>
        </div>
      ) : null}

      {quote.businessContactEmail ? (
        <div className="flex flex-col gap-3 rounded-xl border border-border/50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <p className="text-sm text-muted-foreground">
            Have questions? Reach out to {quote.businessName}.
          </p>
          <Button
            asChild
            size="sm"
            variant="outline"
            className="w-full shrink-0 sm:w-auto"
          >
            <a href={`mailto:${quote.businessContactEmail}`}>
              <Mail data-icon="inline-start" className="size-3.5" />
              Contact
            </a>
          </Button>
        </div>
      ) : null}
    </div>
  );
}
