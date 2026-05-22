import {
  getBusinessInquiryPath,
  getBusinessNewQuotePath,
  getBusinessQuotePath,
} from "@/features/businesses/routes";
import type {
  InquiryRecordState,
  InquiryStatus,
} from "@/features/inquiries/types";
import type {
  QuotePostAcceptanceStatus,
  QuoteReminderKind,
  QuoteStatus,
} from "@/features/quotes/types";

export type WorkflowNextActionPriority = "high" | "medium" | "low";

export type WorkflowNextAction = {
  key: string;
  label: string;
  description: string;
  ctaLabel: string;
  href: string;
  badgeLabel: string;
  priority: WorkflowNextActionPriority;
};

type InquiryNextActionSource = {
  id: string;
  status: InquiryStatus;
  recordState?: InquiryRecordState | null;
  pendingFollowUpCount?: number | null;
  nextFollowUpDueAt?: Date | null;
  relatedQuote?: { id: string } | null;
};

type QuoteNextActionSource = {
  id: string;
  status: QuoteStatus;
  archivedAt?: Date | null;
  postAcceptanceStatus: QuotePostAcceptanceStatus;
  publicViewedAt?: Date | null;
  customerRespondedAt?: Date | null;
  pendingFollowUpCount?: number | null;
  nextFollowUpDueAt?: Date | null;
  reminders?: QuoteReminderKind[] | null;
};

export function getInquiryNextAction({
  businessSlug,
  inquiry,
  now = new Date(),
}: {
  businessSlug: string;
  inquiry: InquiryNextActionSource;
  now?: Date;
}): WorkflowNextAction | null {
  const inquiryHref = getBusinessInquiryPath(businessSlug, inquiry.id);

  if (
    inquiry.status === "archived" ||
    inquiry.recordState === "archived"
  ) {
    return null;
  }

  if ((inquiry.pendingFollowUpCount ?? 0) > 0) {
    return {
      key: "inquiry-follow-up",
      label: "Work follow-up",
      description:
        "A follow-up is already planned for this inquiry. Open it and keep the customer touchpoint moving.",
      ctaLabel: "Open follow-up",
      href: `${inquiryHref}#follow-ups`,
      badgeLabel: "Follow-up",
      priority: getFollowUpPriority(inquiry.nextFollowUpDueAt, now),
    };
  }

  if (inquiry.relatedQuote) {
    return {
      key: "inquiry-open-quote",
      label: "Open related quote",
      description:
        "This inquiry already has a quote. Continue from the quote so status, sharing, and follow-up stay together.",
      ctaLabel: "Open quote",
      href: getBusinessQuotePath(businessSlug, inquiry.relatedQuote.id),
      badgeLabel: "Quoted",
      priority: "medium",
    };
  }

  if (
    inquiry.status === "new" ||
    inquiry.status === "waiting" ||
    inquiry.status === "overdue"
  ) {
    return {
      key: "inquiry-create-quote",
      label: "Create quote",
      description:
        "Turn the request into a draft quote while the customer context is still fresh.",
      ctaLabel: "Create quote",
      href: getBusinessNewQuotePath(businessSlug, inquiry.id),
      badgeLabel: inquiry.status === "overdue" ? "Overdue" : "Quote next",
      priority: inquiry.status === "overdue" ? "high" : "medium",
    };
  }

  if (inquiry.status === "quoted") {
    return {
      key: "inquiry-review-quote",
      label: "Review quote status",
      description:
        "A quote has been created for this inquiry. Review the record and keep follow-up aligned.",
      ctaLabel: "Open inquiry",
      href: inquiryHref,
      badgeLabel: "Quoted",
      priority: "low",
    };
  }

  return null;
}

export function getQuoteNextAction({
  businessSlug,
  quote,
  now = new Date(),
}: {
  businessSlug: string;
  quote: QuoteNextActionSource;
  now?: Date;
}): WorkflowNextAction | null {
  const quoteHref = getBusinessQuotePath(businessSlug, quote.id);
  const reminders = quote.reminders ?? [];

  if (quote.archivedAt) {
    return null;
  }

  if (quote.status === "draft") {
    return {
      key: "quote-send",
      label: "Send quote",
      description:
        "Finish any edits, then share the customer quote page and set the next touchpoint.",
      ctaLabel: "Send quote",
      href: `${quoteHref}#send-quote`,
      badgeLabel: "Draft",
      priority: "high",
    };
  }

  if (quote.status === "sent") {
    if ((quote.pendingFollowUpCount ?? 0) > 0) {
      return {
        key: "quote-work-follow-up",
        label: "Work follow-up",
        description:
          "A follow-up is already planned for this quote. Open it and keep the customer response moving.",
        ctaLabel: "Open follow-up",
        href: `${quoteHref}#follow-ups`,
        badgeLabel: "Follow-up",
        priority: getFollowUpPriority(quote.nextFollowUpDueAt, now),
      };
    }

    if (quote.publicViewedAt && !quote.customerRespondedAt) {
      return {
        key: "quote-viewed-follow-up",
        label: "Follow up on viewed quote",
        description:
          "The customer viewed this quote but has not accepted or rejected it. Schedule the next customer touchpoint.",
        ctaLabel: "Set follow-up",
        href: `${quoteHref}#follow-ups`,
        badgeLabel: "Viewed",
        priority: "high",
      };
    }

    if (reminders.includes("follow_up_due")) {
      return {
        key: "quote-follow-up-due",
        label: "Set follow-up reminder",
        description:
          "This quote has been waiting long enough to need a customer touchpoint.",
        ctaLabel: "Set follow-up",
        href: `${quoteHref}#follow-ups`,
        badgeLabel: "Due",
        priority: "high",
      };
    }

    if (reminders.includes("expiring_soon")) {
      return {
        key: "quote-expiring-follow-up",
        label: "Follow up before expiry",
        description:
          "This quote expires soon. Follow up while the customer can still respond online.",
        ctaLabel: "Set follow-up",
        href: `${quoteHref}#follow-ups`,
        badgeLabel: "Expiring",
        priority: "high",
      };
    }

    return {
      key: "quote-set-follow-up",
      label: "Set follow-up reminder",
      description:
        "This quote is shared and waiting for a response. Schedule the next customer touchpoint.",
      ctaLabel: "Set follow-up",
      href: `${quoteHref}#follow-ups`,
      badgeLabel: "Sent",
      priority: "medium",
    };
  }

  if (
    quote.status === "accepted" &&
    quote.postAcceptanceStatus !== "completed" &&
    quote.postAcceptanceStatus !== "canceled"
  ) {
    return {
      key: "quote-post-win",
      label: "Track next work step",
      description:
        "The customer accepted this quote. Track the handoff so the job does not stall.",
      ctaLabel: "Open post-win",
      href: `${quoteHref}#post-acceptance`,
      badgeLabel: "Accepted",
      priority: "medium",
    };
  }

  return null;
}

function getFollowUpPriority(
  nextFollowUpDueAt: Date | null | undefined,
  now: Date,
): WorkflowNextActionPriority {
  if (!nextFollowUpDueAt) {
    return "medium";
  }

  return nextFollowUpDueAt.getTime() <= getEndOfToday(now).getTime()
    ? "high"
    : "medium";
}

function getEndOfToday(now: Date) {
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  return end;
}
