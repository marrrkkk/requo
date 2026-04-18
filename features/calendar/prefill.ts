import { getPublicQuoteUrl } from "@/features/quotes/utils";

import type { CalendarEventPrefill } from "./types";

type InquiryContext = {
  customerName: string;
  customerEmail: string;
  serviceCategory: string;
  subject: string | null;
  details: string;
};

type QuoteContext = {
  title: string;
  customerName: string;
  customerEmail: string;
  publicToken: string;
};

type BusinessContext = {
  name: string;
  contactEmail: string | null;
};

/**
 * Prefill event fields from an inquiry context.
 *
 * The description is conservative and does NOT include:
 * - Internal notes
 * - Budget/pricing details
 * - Attachment contents
 */
export function prefillFromInquiry(
  inquiry: InquiryContext,
  business: BusinessContext,
): CalendarEventPrefill {
  const title = inquiry.subject
    ? `${inquiry.serviceCategory} - ${inquiry.subject}`
    : `${inquiry.serviceCategory} - ${inquiry.customerName}`;

  const descriptionParts: string[] = [
    `Customer: ${inquiry.customerName}`,
    `Email: ${inquiry.customerEmail}`,
    `Category: ${inquiry.serviceCategory}`,
  ];

  if (inquiry.subject) {
    descriptionParts.push(`Subject: ${inquiry.subject}`);
  }

  descriptionParts.push("", `Business: ${business.name}`);

  return {
    title,
    description: descriptionParts.join("\n"),
    location: "",
    attendeeEmail: inquiry.customerEmail,
    attendeeName: inquiry.customerName,
  };
}

/**
 * Prefill event fields from a quote context.
 *
 * Includes the public quote link so the customer can review.
 * Does NOT include pricing, internal notes, or discount details.
 */
export function prefillFromQuote(
  quote: QuoteContext,
  business: BusinessContext,
  baseUrl: string,
): CalendarEventPrefill {
  const title = `${quote.title} - ${quote.customerName}`;
  const publicQuoteUrl = `${baseUrl}${getPublicQuoteUrl(quote.publicToken)}`;

  const descriptionParts: string[] = [
    `Customer: ${quote.customerName}`,
    `Email: ${quote.customerEmail}`,
    `Quote: ${quote.title}`,
    `View quote: ${publicQuoteUrl}`,
    "",
    `Business: ${business.name}`,
  ];

  return {
    title,
    description: descriptionParts.join("\n"),
    location: "",
    attendeeEmail: quote.customerEmail,
    attendeeName: quote.customerName,
  };
}

/**
 * Prefill event fields for a post-acceptance follow-up.
 * Uses the quote context with a "Follow-up" prefix.
 */
export function prefillFromAcceptedQuote(
  quote: QuoteContext,
  business: BusinessContext,
  baseUrl: string,
): CalendarEventPrefill {
  const prefill = prefillFromQuote(quote, business, baseUrl);

  return {
    ...prefill,
    title: `Follow-up: ${quote.title} - ${quote.customerName}`,
  };
}
