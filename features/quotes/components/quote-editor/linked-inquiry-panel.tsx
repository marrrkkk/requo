"use client";

import Link from "next/link";
import { ChevronDown, ExternalLink } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/prompt-kit/collapsible";
import { InquiryRecordStateBadge } from "@/features/inquiries/components/inquiry-record-state-badge";
import { InquiryStatusBadge } from "@/features/inquiries/components/inquiry-status-badge";
import {
  inquiryContactMethodLabels,
  type InquiryContactMethod,
} from "@/features/inquiries/form-config";
import { formatInquiryBudget } from "@/features/inquiries/utils";
import { getBusinessInquiryPath } from "@/features/businesses/routes";
import type { QuoteLinkedInquirySummary } from "@/features/quotes/types";
import { cn } from "@/lib/utils";

type LinkedInquiryPanelProps = {
  businessSlug: string;
  inquiry: QuoteLinkedInquirySummary;
};

function getContactLabel(method: string) {
  const normalized = method.trim().toLowerCase();

  if (normalized in inquiryContactMethodLabels) {
    return inquiryContactMethodLabels[normalized as InquiryContactMethod];
  }

  return "Contact";
}

function getContactValue(inquiry: QuoteLinkedInquirySummary) {
  if (inquiry.customerContactMethod.trim().toLowerCase() === "email") {
    return inquiry.customerContactHandle || inquiry.customerEmail;
  }

  return inquiry.customerContactHandle;
}

export function LinkedInquiryPanel({
  businessSlug,
  inquiry,
}: LinkedInquiryPanelProps) {
  const contactValue = getContactValue(inquiry);
  const budgetLabel = formatInquiryBudget(inquiry.budgetText);
  const hasDetails = Boolean(inquiry.details?.trim());

  return (
    <Collapsible
      className="rounded-xl border border-border/70 bg-muted/20"
      defaultOpen={false}
    >
      <CollapsibleTrigger
        className={cn(
          "group flex w-full items-start justify-between gap-3 px-4 py-3 text-left",
          "transition-colors hover:bg-muted/30",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
        )}
        type="button"
      >
        <div className="min-w-0 flex-1">
          <p className="meta-label">Linked inquiry</p>
          <p className="mt-1 truncate font-medium text-foreground">
            {inquiry.serviceCategory}
          </p>
          <p className="mt-0.5 truncate text-sm text-muted-foreground">
            {contactValue ?? inquiry.customerName}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2 pt-0.5">
          <InquiryStatusBadge status={inquiry.status} />
          <ChevronDown className="size-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
        </div>
      </CollapsibleTrigger>

      <CollapsibleContent className="border-t border-border/60 px-4 pb-4 pt-3">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            {inquiry.recordState !== "active" ? (
              <InquiryRecordStateBadge state={inquiry.recordState} />
            ) : null}
          </div>

          <dl className="grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="meta-label">Customer</dt>
              <dd className="mt-1 text-sm text-foreground">
                {inquiry.customerName}
              </dd>
            </div>
            <div>
              <dt className="meta-label">Category</dt>
              <dd className="mt-1 text-sm text-foreground">
                {inquiry.serviceCategory}
              </dd>
            </div>
            <div>
              <dt className="meta-label">{getContactLabel(inquiry.customerContactMethod)}</dt>
              <dd className="mt-1 text-sm text-foreground">
                {contactValue ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="meta-label">Deadline</dt>
              <dd className="mt-1 text-sm text-foreground">
                {inquiry.requestedDeadline ?? "No deadline"}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="meta-label">Budget</dt>
              <dd className="mt-1 text-sm text-foreground">{budgetLabel}</dd>
            </div>
          </dl>

          {hasDetails ? (
            <div>
              <p className="meta-label">Request details</p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                {inquiry.details?.trim()}
              </p>
            </div>
          ) : null}

          <Button asChild className="w-full sm:w-auto" size="sm" variant="outline">
            <Link href={getBusinessInquiryPath(businessSlug, inquiry.id)}>
              <ExternalLink data-icon="inline-start" />
              Open full inquiry
            </Link>
          </Button>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
