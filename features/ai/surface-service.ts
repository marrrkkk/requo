import "server-only";

import { and, desc, eq, isNull } from "drizzle-orm";

import { getInquiryAssistantContextForBusiness } from "@/features/ai/queries";
import type {
  AiChatStreamEvent,
  AiSurface,
  InquiryAssistantContext,
} from "@/features/ai/types";
import {
  getFollowUpOverviewForBusinessUncached,
  getFollowUpsForQuote,
} from "@/features/follow-ups/queries";
import type { FollowUpOverviewData, FollowUpView } from "@/features/follow-ups/types";
import { getAdditionalInquirySubmittedFields } from "@/features/inquiries/form-config";
import { buildBusinessMemoryContext } from "@/features/memory/queries";
import {
  getEffectiveQuoteStatus,
  getQuoteDetailForBusiness,
} from "@/features/quotes/queries";
import { formatQuoteMoney } from "@/features/quotes/utils";
import { streamWithFallback } from "@/lib/ai";
import type { AiChatMessage, AiCompletionRequest } from "@/lib/ai";
import { db } from "@/lib/db/client";
import {
  activityLogs,
  businesses,
  inquiries,
  quotes,
  user,
} from "@/lib/db/schema";

function truncateText(value: string | null | undefined, maxLength: number) {
  const normalized = value?.replace(/\r\n?/g, "\n").trim() ?? "";

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength).trimEnd()}...`;
}

/**
 * Compact key/value formatter that drops empty or default values to save tokens.
 * Returns a semicolon-joined string like `k1 v1; k2 v2` or "" if all fields are empty.
 */
function compactFields(
  fields: Array<[string, string | number | null | undefined]>,
): string {
  return fields
    .filter(([, value]) => {
      if (value === null || value === undefined) return false;
      if (typeof value === "string") {
        const trimmed = value.trim();

        return trimmed.length > 0 && trimmed !== "Not set" && trimmed !== "None";
      }

      return true;
    })
    .map(([key, value]) => (key ? `${key} ${value}` : String(value)))
    .join("; ");
}

function formatDate(value: Date | string | null | undefined) {
  if (!value) {
    return "Not set";
  }

  if (typeof value === "string") {
    return value;
  }

  return value.toISOString();
}

/** Compact date formatter that returns null for missing dates (for compactFields filtering). */
function formatDateOrNull(value: Date | string | null | undefined): string | null {
  if (!value) return null;

  if (typeof value === "string") return value;

  // Shorter ISO: just the date part for compactness
  return value.toISOString().slice(0, 10);
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatMemoryLines(memory: Awaited<ReturnType<typeof buildBusinessMemoryContext>>) {
  if (!memory.memories.length) {
    return "- No saved business knowledge.";
  }

  return memory.memories
    .slice(0, 6)
    .map((item) => `- ${item.title}: ${truncateText(item.content, 400)}`)
    .join("\n");
}

function formatActivityLines(
  activities: Array<{
    summary: string;
    type: string;
    createdAt: Date;
    actorName: string | null;
  }>,
) {
  if (!activities.length) {
    return "- No activity yet.";
  }

  return activities
    .map(
      (activity) =>
        `- ${formatDate(activity.createdAt)}; ${activity.type}; ${activity.summary}; actor ${activity.actorName ?? "system"}`,
    )
    .join("\n");
}

function formatFollowUpLines(
  followUps: InquiryAssistantContext["followUps"],
) {
  if (!followUps.length) {
    return "- No follow-ups linked to this inquiry or its quotes.";
  }

  return followUps
    .map((followUp) => {
      const relatedQuote = followUp.quoteId
        ? `; related quote ${followUp.quoteNumber ?? followUp.quoteTitle ?? followUp.quoteId}`
        : "";
      const outcome =
        followUp.status === "completed"
          ? `; completed ${formatDate(followUp.completedAt)}`
          : followUp.status === "skipped"
            ? `; skipped ${formatDate(followUp.skippedAt)}`
            : "";

      return `- ${followUp.title}; status ${followUp.status}; due ${formatDate(
        followUp.dueAt,
      )}; channel ${followUp.channel}${relatedQuote}; reason ${truncateText(
        followUp.reason,
        260,
      )}${outcome}`;
    })
    .join("\n");
}

function formatRelatedQuoteLines(
  quotesForInquiry: InquiryAssistantContext["relatedQuotes"],
) {
  if (!quotesForInquiry.length) {
    return "- No quotes linked to this inquiry yet.";
  }

  return quotesForInquiry
    .map((quote) => {
      const lineItems = quote.items.length
        ? quote.items
            .map(
              (item) =>
                `  - ${item.description}; quantity ${item.quantity}; unit ${formatQuoteMoney(
                  item.unitPriceInCents,
                  quote.currency,
                )}; line total ${formatQuoteMoney(item.lineTotalInCents, quote.currency)}`,
            )
            .join("\n")
        : "  - No line items.";
      const activities = quote.activities.length
        ? quote.activities
            .slice(0, 8)
            .map(
              (activity) =>
                `  - ${formatDate(activity.createdAt)}; ${activity.summary}; actor ${activity.actorName ?? "system"}`,
            )
            .join("\n")
        : "  - No quote activity.";

      return [
        `- ${quote.quoteNumber}; ${quote.title}; status ${quote.status}; total ${formatQuoteMoney(
          quote.totalInCents,
          quote.currency,
        )}; subtotal ${formatQuoteMoney(
          quote.subtotalInCents,
          quote.currency,
        )}; discount ${formatQuoteMoney(
          quote.discountInCents,
          quote.currency,
        )}; valid until ${quote.validUntil}`,
        `  Customer: ${quote.customerName}; ${quote.customerEmail ?? "no email"}; ${quote.customerContactMethod} ${quote.customerContactHandle}`,
        `  Tracking: sent ${formatDate(quote.sentAt)}; viewed ${formatDate(
          quote.publicViewedAt,
        )}; accepted ${formatDate(
          quote.acceptedAt,
        )}; customer responded ${formatDate(quote.customerRespondedAt)}; post-acceptance ${quote.postAcceptanceStatus}`,
        `  Response: ${truncateText(quote.customerResponseMessage, 500) || "None"}`,
        `  Notes: ${truncateText(quote.notes, 900) || "Not set"}`,
        "  Line items",
        lineItems,
        "  Quote activity",
        activities,
      ].join("\n");
    })
    .join("\n");
}

function formatFollowUpViewLines(followUps: FollowUpView[]) {
  if (!followUps.length) {
    return "- No follow-ups.";
  }

  return followUps
    .map((followUp) =>
      `- ${compactFields([
        ["", followUp.title],
        ["status", followUp.status],
        ["due", formatDateOrNull(followUp.dueAt)],
        ["channel", followUp.channel],
        ["bucket", followUp.dueBucket],
        [
          followUp.status === "completed" ? "completed" : followUp.status === "skipped" ? "skipped" : "",
          followUp.status === "completed"
            ? formatDateOrNull(followUp.completedAt)
            : followUp.status === "skipped"
              ? formatDateOrNull(followUp.skippedAt)
              : null,
        ],
        ["customer", followUp.customerName],
        ["related", followUp.related.label],
        ["reason", truncateText(followUp.reason, 180) || null],
      ])}`,
    )
    .join("\n");
}

function formatFollowUpOverviewLines(overview: FollowUpOverviewData) {
  const sections: string[] = [
    `Counts: overdue ${overview.counts.overdue}; due today ${overview.counts.dueToday}; upcoming ${overview.counts.upcoming}`,
  ];

  if (overview.overdue.length) {
    sections.push("", "Overdue", formatFollowUpViewLines(overview.overdue));
  }

  if (overview.dueToday.length) {
    sections.push("", "Due today", formatFollowUpViewLines(overview.dueToday));
  }

  if (overview.upcoming.length) {
    sections.push("", "Upcoming", formatFollowUpViewLines(overview.upcoming));
  }

  return sections.join("\n");
}

function formatLinkedInquiryContext(context: InquiryAssistantContext | null) {
  if (!context) {
    return "- No linked inquiry context.";
  }

  const additionalFields = getAdditionalInquirySubmittedFields(
    context.inquiry.submittedFieldSnapshot,
  );

  return [
    `- ID: ${context.inquiry.id}`,
    `- Customer: ${context.inquiry.customerName}`,
    `- Email: ${context.inquiry.customerEmail ?? "Not provided"}`,
    `- Contact: ${context.inquiry.customerContactMethod} ${context.inquiry.customerContactHandle}`,
    `- Category: ${context.inquiry.serviceCategory}`,
    `- Subject: ${context.inquiry.subject ?? "Not provided"}`,
    `- Status: ${context.inquiry.status}`,
    `- Deadline: ${context.inquiry.requestedDeadline ?? "Not provided"}`,
    `- Budget: ${context.inquiry.budgetText ?? "Not provided"}`,
    `- Submitted: ${formatDate(context.inquiry.submittedAt)}`,
    "",
    "Customer message",
    truncateText(context.inquiry.details, 2200),
    "",
    "Additional submitted fields",
    additionalFields.length
      ? additionalFields
          .map((field) => `- ${field.label}: ${field.displayValue}`)
          .join("\n")
      : "- None.",
    "",
    "Attachments",
    context.attachments.length
      ? context.attachments
          .map(
            (attachment) =>
              `- ${attachment.fileName}; ${attachment.contentType}; ${formatFileSize(
                attachment.fileSize,
              )}; uploaded ${formatDate(attachment.createdAt)}`,
          )
          .join("\n")
      : "- No attachments.",
    "",
    "Internal notes",
    context.notes.length
      ? context.notes
          .map(
            (note) =>
              `- ${note.authorName ?? "Owner"}: ${truncateText(note.body, 320)}`,
          )
          .join("\n")
      : "- No notes yet.",
    "",
    "Linked inquiry follow-ups",
    formatFollowUpLines(context.followUps),
    "",
    "All quotes linked to linked inquiry",
    formatRelatedQuoteLines(context.relatedQuotes),
    "",
    "Linked inquiry activity timeline",
    formatActivityLines(context.activities),
  ].join("\n");
}

function formatBusinessActivityLines(
  activities: Array<{
    id: string;
    type: string;
    summary: string;
    createdAt: Date;
    actorName: string | null;
    inquiryId: string | null;
    quoteId: string | null;
  }>,
) {
  if (!activities.length) {
    return "- No recent business activity.";
  }

  return activities
    .map((activity) =>
      `- ${compactFields([
        ["", formatDateOrNull(activity.createdAt)],
        ["", activity.type],
        ["", activity.summary],
        ["by", activity.actorName && activity.actorName !== "system" ? activity.actorName : null],
        ["inq", activity.inquiryId],
        ["q", activity.quoteId],
      ])}`,
    )
    .join("\n");
}

function formatBusinessProfileLines(profile: {
  name: string;
  slug?: string | null;
  businessType?: string | null;
  shortDescription: string | null;
  contactEmail?: string | null;
  defaultCurrency: string;
  aiTonePreference: string;
  defaultEmailSignature?: string | null;
  defaultQuoteNotes?: string | null;
  createdAt?: Date | string | null;
}) {
  const lines: Array<string | null> = [
    "Business profile",
    `- Name: ${profile.name}`,
    profile.slug ? `- Slug: /${profile.slug}` : null,
    profile.businessType ? `- Business type: ${profile.businessType}` : null,
    profile.shortDescription ? `- Description: ${profile.shortDescription}` : null,
    profile.contactEmail ? `- Contact email: ${profile.contactEmail}` : null,
    `- Default currency: ${profile.defaultCurrency}`,
    `- Preferred tone: ${profile.aiTonePreference}`,
    profile.createdAt ? `- Created: ${formatDate(profile.createdAt)}` : null,
    profile.defaultEmailSignature
      ? `- Default email signature: ${truncateText(profile.defaultEmailSignature, 300)}`
      : null,
    profile.defaultQuoteNotes
      ? `- Default quote notes: ${truncateText(profile.defaultQuoteNotes, 300)}`
      : null,
  ];

  return lines.filter((line): line is string => Boolean(line)).join("\n");
}

async function buildInquiryContext(input: {
  businessId: string;
  entityId: string;
}) {
  const context = await getInquiryAssistantContextForBusiness({
    businessId: input.businessId,
    inquiryId: input.entityId,
  });

  if (!context) {
    return null;
  }

  const additionalFields = getAdditionalInquirySubmittedFields(
    context.inquiry.submittedFieldSnapshot,
  );

  return [
    "Surface: inquiry",
    "",
    formatBusinessProfileLines({
      name: context.business.name,
      slug: context.business.slug,
      businessType: context.business.businessType,
      shortDescription: context.business.shortDescription,
      contactEmail: context.business.contactEmail,
      defaultCurrency: context.business.defaultCurrency,
      aiTonePreference: context.business.aiTonePreference,
      defaultEmailSignature: context.business.defaultEmailSignature,
      defaultQuoteNotes: context.business.defaultQuoteNotes,
      createdAt: context.business.createdAt,
    }),
    "",
    "Inquiry",
    `- ID: ${context.inquiry.id}`,
    `- Customer: ${context.inquiry.customerName}`,
    `- Email: ${context.inquiry.customerEmail ?? "Not provided"}`,
    `- Contact: ${context.inquiry.customerContactMethod} ${context.inquiry.customerContactHandle}`,
    `- Category: ${context.inquiry.serviceCategory}`,
    `- Subject: ${context.inquiry.subject ?? "Not provided"}`,
    `- Status: ${context.inquiry.status}`,
    `- Deadline: ${context.inquiry.requestedDeadline ?? "Not provided"}`,
    `- Budget: ${context.inquiry.budgetText ?? "Not provided"}`,
    `- Submitted: ${formatDate(context.inquiry.submittedAt)}`,
    "",
    "Customer message",
    truncateText(context.inquiry.details, 3000),
    "",
    "Additional submitted fields",
    additionalFields.length
      ? additionalFields
          .map((field) => `- ${field.label}: ${field.displayValue}`)
          .join("\n")
      : "- None.",
    "",
    "Attachments",
    context.attachments.length
      ? context.attachments
          .map(
            (attachment) =>
              `- ${attachment.fileName}; ${attachment.contentType}; ${formatFileSize(
                attachment.fileSize,
              )}; uploaded ${formatDate(attachment.createdAt)}`,
          )
          .join("\n")
      : "- No attachments.",
    "",
    "Internal notes",
    context.notes.length
      ? context.notes
          .map((note) => `- ${note.authorName ?? "Owner"}: ${truncateText(note.body, 320)}`)
          .join("\n")
      : "- No notes yet.",
    "",
    "Follow-ups",
    formatFollowUpLines(context.followUps),
    "",
    "Related quotes",
    formatRelatedQuoteLines(context.relatedQuotes),
    "",
    "Inquiry activity timeline",
    formatActivityLines(context.activities),
    "",
    "Business knowledge",
    formatMemoryLines(context.memory),
  ].join("\n");
}

async function buildQuoteContext(input: {
  businessId: string;
  entityId: string;
}) {
  const [businessRows, quote, quoteFollowUps, memory] = await Promise.all([
    db
      .select({
        name: businesses.name,
        slug: businesses.slug,
        businessType: businesses.businessType,
        shortDescription: businesses.shortDescription,
        contactEmail: businesses.contactEmail,
        defaultCurrency: businesses.defaultCurrency,
        defaultEmailSignature: businesses.defaultEmailSignature,
        defaultQuoteNotes: businesses.defaultQuoteNotes,
        aiTonePreference: businesses.aiTonePreference,
        createdAt: businesses.createdAt,
      })
      .from(businesses)
      .where(eq(businesses.id, input.businessId))
      .limit(1),
    getQuoteDetailForBusiness({
      businessId: input.businessId,
      quoteId: input.entityId,
    }),
    getFollowUpsForQuote({
      businessId: input.businessId,
      quoteId: input.entityId,
    }),
    buildBusinessMemoryContext(input.businessId),
  ]);
  const business = businessRows[0];

  if (!business || !quote) {
    return null;
  }

  const linkedInquiryContext = quote.inquiryId
    ? await getInquiryAssistantContextForBusiness({
        businessId: input.businessId,
        inquiryId: quote.inquiryId,
      })
    : null;

  return [
    "Surface: quote",
    "",
    formatBusinessProfileLines({
      name: business.name,
      slug: business.slug,
      businessType: business.businessType,
      shortDescription: business.shortDescription,
      contactEmail: business.contactEmail,
      defaultCurrency: business.defaultCurrency,
      aiTonePreference: business.aiTonePreference,
      defaultEmailSignature: business.defaultEmailSignature,
      defaultQuoteNotes: business.defaultQuoteNotes,
      createdAt: business.createdAt,
    }),
    "",
    "Quote",
    `- ID: ${quote.id}`,
    `- Number: ${quote.quoteNumber}`,
    `- Title: ${quote.title}`,
    `- Customer: ${quote.customerName}`,
    `- Email: ${quote.customerEmail ?? "Not provided"}`,
    `- Contact: ${quote.customerContactMethod} ${quote.customerContactHandle}`,
    `- Status: ${quote.status}`,
    `- Subtotal: ${formatQuoteMoney(quote.subtotalInCents, quote.currency)}`,
    `- Discount: ${formatQuoteMoney(quote.discountInCents, quote.currency)}`,
    `- Valid until: ${quote.validUntil}`,
    `- Total: ${formatQuoteMoney(quote.totalInCents, quote.currency)}`,
    `- Sent: ${formatDate(quote.sentAt)}`,
    `- Viewed: ${formatDate(quote.publicViewedAt)}`,
    `- Accepted: ${formatDate(quote.acceptedAt)}`,
    `- Customer responded: ${formatDate(quote.customerRespondedAt)}`,
    `- Customer response: ${truncateText(quote.customerResponseMessage, 600) || "None"}`,
    `- Post-acceptance status: ${quote.postAcceptanceStatus}`,
    `- Archived: ${formatDate(quote.archivedAt)}`,
    `- Voided: ${formatDate(quote.voidedAt)}`,
    `- Notes: ${truncateText(quote.notes, 1600) || "Not set"}`,
    "",
    "Line items",
    quote.items.length
      ? quote.items
          .map(
            (item) =>
              `- ${item.description}; quantity ${item.quantity}; unit ${formatQuoteMoney(
                item.unitPriceInCents,
                quote.currency,
              )}; line total ${formatQuoteMoney(item.lineTotalInCents, quote.currency)}`,
          )
          .join("\n")
      : "- No line items.",
    "",
    "Quote follow-ups",
    formatFollowUpViewLines(quoteFollowUps),
    "",
    "Linked inquiry context",
    formatLinkedInquiryContext(linkedInquiryContext),
    "",
    "Recent quote activity",
    quote.activities.length
      ? quote.activities
          .slice(0, 8)
          .map((activity) => `- ${formatDate(activity.createdAt)}: ${activity.summary}`)
          .join("\n")
      : "- No activity yet.",
    "",
    "Business knowledge",
    formatMemoryLines(memory),
  ].join("\n");
}

async function buildDashboardContext(input: {
  businessId: string;
}) {
  const [
    businessRow,
    memory,
    recentInquiries,
    recentQuotes,
    followUpOverview,
    recentActivity,
  ] = await Promise.all([
    db
      .select({
        id: businesses.id,
        name: businesses.name,
        slug: businesses.slug,
        businessType: businesses.businessType,
        shortDescription: businesses.shortDescription,
        contactEmail: businesses.contactEmail,
        defaultCurrency: businesses.defaultCurrency,
        aiTonePreference: businesses.aiTonePreference,
        defaultEmailSignature: businesses.defaultEmailSignature,
        defaultQuoteNotes: businesses.defaultQuoteNotes,
        createdAt: businesses.createdAt,
      })
      .from(businesses)
      .where(
        and(
          eq(businesses.id, input.businessId),
          isNull(businesses.deletedAt),
        ),
      )
      .limit(1),
    buildBusinessMemoryContext(input.businessId),
    db
      .select({
        id: inquiries.id,
        customerName: inquiries.customerName,
        customerEmail: inquiries.customerEmail,
        customerContactMethod: inquiries.customerContactMethod,
        customerContactHandle: inquiries.customerContactHandle,
        serviceCategory: inquiries.serviceCategory,
        subject: inquiries.subject,
        status: inquiries.status,
        source: inquiries.source,
        submittedAt: inquiries.submittedAt,
        createdAt: inquiries.createdAt,
        requestedDeadline: inquiries.requestedDeadline,
        budgetText: inquiries.budgetText,
        details: inquiries.details,
      })
      .from(inquiries)
      .where(
        and(
          eq(inquiries.businessId, input.businessId),
          isNull(inquiries.deletedAt),
        ),
      )
      .orderBy(desc(inquiries.submittedAt))
      .limit(5),
    db
      .select({
        id: quotes.id,
        quoteNumber: quotes.quoteNumber,
        title: quotes.title,
        customerName: quotes.customerName,
        customerEmail: quotes.customerEmail,
        customerContactMethod: quotes.customerContactMethod,
        customerContactHandle: quotes.customerContactHandle,
        status: getEffectiveQuoteStatus,
        subtotalInCents: quotes.subtotalInCents,
        discountInCents: quotes.discountInCents,
        totalInCents: quotes.totalInCents,
        currency: quotes.currency,
        validUntil: quotes.validUntil,
        sentAt: quotes.sentAt,
        acceptedAt: quotes.acceptedAt,
        publicViewedAt: quotes.publicViewedAt,
        customerRespondedAt: quotes.customerRespondedAt,
        customerResponseMessage: quotes.customerResponseMessage,
        postAcceptanceStatus: quotes.postAcceptanceStatus,
        inquiryId: quotes.inquiryId,
        createdAt: quotes.createdAt,
      })
      .from(quotes)
      .where(
        and(
          eq(quotes.businessId, input.businessId),
          isNull(quotes.deletedAt),
        ),
      )
      .orderBy(desc(quotes.createdAt))
      .limit(5),
    getFollowUpOverviewForBusinessUncached(input.businessId),
    db
      .select({
        id: activityLogs.id,
        type: activityLogs.type,
        summary: activityLogs.summary,
        createdAt: activityLogs.createdAt,
        actorName: user.name,
        inquiryId: activityLogs.inquiryId,
        quoteId: activityLogs.quoteId,
      })
      .from(activityLogs)
      .leftJoin(user, eq(activityLogs.actorUserId, user.id))
      .where(eq(activityLogs.businessId, input.businessId))
      .orderBy(desc(activityLogs.createdAt))
      .limit(10),
  ]);
  const business = businessRow[0];

  if (!business) {
    return null;
  }

  return [
    "Surface: dashboard",
    "",
    formatBusinessProfileLines({
      name: business.name,
      slug: business.slug,
      businessType: business.businessType,
      shortDescription: business.shortDescription,
      contactEmail: business.contactEmail,
      defaultCurrency: business.defaultCurrency,
      aiTonePreference: business.aiTonePreference,
      defaultEmailSignature: business.defaultEmailSignature,
      defaultQuoteNotes: business.defaultQuoteNotes,
      createdAt: business.createdAt,
    }),
    "",
    `Recent inquiries (showing up to 5 most recent)`,
    recentInquiries.length
      ? [
          ...recentInquiries.map((inquiry) =>
            `- ${compactFields([
              ["", inquiry.customerName],
              ["email", inquiry.customerEmail],
              ["via", `${inquiry.customerContactMethod} ${inquiry.customerContactHandle}`.trim()],
              ["category", inquiry.serviceCategory],
              ["status", inquiry.status],
              ["subject", inquiry.subject],
              ["source", inquiry.source],
              ["submitted", formatDateOrNull(inquiry.submittedAt)],
              ["deadline", inquiry.requestedDeadline],
              ["budget", inquiry.budgetText],
              ["details", truncateText(inquiry.details, 180) || null],
            ])}`,
          ),
          ...(recentInquiries.length >= 5
            ? ["(More inquiries available in the Inquiries page)"]
            : []),
        ].join("\n")
      : "- No recent inquiries.",
    "",
    `Recent quotes (showing up to 5 most recent)`,
    recentQuotes.length
      ? [
          ...recentQuotes.map((quote) =>
            `- ${compactFields([
              ["", quote.quoteNumber],
              ["title", quote.title],
              ["customer", quote.customerName],
              ["email", quote.customerEmail],
              ["status", quote.status],
              ["total", formatQuoteMoney(quote.totalInCents, quote.currency)],
              ["valid-until", quote.validUntil],
              ["linked-inquiry", quote.inquiryId],
              ["sent", formatDateOrNull(quote.sentAt)],
              ["viewed", formatDateOrNull(quote.publicViewedAt)],
              ["accepted", formatDateOrNull(quote.acceptedAt)],
              ["responded", formatDateOrNull(quote.customerRespondedAt)],
              ["response", truncateText(quote.customerResponseMessage, 120) || null],
              ["post-acceptance", quote.postAcceptanceStatus === "none" ? null : quote.postAcceptanceStatus],
            ])}`,
          ),
          ...(recentQuotes.length >= 5
            ? ["(More quotes available in the Quotes page)"]
            : []),
        ].join("\n")
      : "- No recent quotes.",
    "",
    "Follow-up overview",
    formatFollowUpOverviewLines(followUpOverview),
    "",
    "Recent business activity",
    formatBusinessActivityLines(recentActivity),
    "",
    "Business knowledge",
    formatMemoryLines(memory),
  ].join("\n");
}

export async function buildAiSurfaceContext(input: {
  surface: AiSurface;
  entityId: string;
  businessId: string | null;
}) {
  switch (input.surface) {
    case "inquiry":
      return input.businessId
        ? buildInquiryContext({
            businessId: input.businessId,
            entityId: input.entityId,
          })
        : null;
    case "quote":
      return input.businessId
        ? buildQuoteContext({
            businessId: input.businessId,
            entityId: input.entityId,
          })
        : null;
    case "dashboard":
      return input.businessId
        ? buildDashboardContext({
            businessId: input.businessId,
          })
        : null;
  }
}

function getSurfaceInstructions(surface: AiSurface) {
  const shared = [
    "You are Requo's internal assistant for an owner-led service business.",
    "Use only the provided Requo business context and chat history.",
    "Resolve follow-up questions, pronouns, and omitted subjects from the recent chat history before asking the user to repeat themselves.",
    "If the last part of the conversation was about the current business profile, treat short follow-ups such as 'when was it created' or 'what is its email' as referring to that business unless the user redirects.",
    "Stay focused on inquiries, quotes, tickets, reports, cases, complaints, incidents, customer issues, support workflows, follow-ups, and operational summaries.",
    "Never claim that you changed the database, sent a message, or updated a record.",
    "If the user asks to create, update, save, send, close, reopen, assign, or otherwise modify app records, explain that chat can draft or guide the change but the saved change must be done with the app controls.",
    "If exact pricing, policy, availability, or terms are missing, say what is missing instead of inventing details.",
    "Do not include <think> or <thinking> tags, internal thought process, or reasoning blocks.",
    "Keep the answer concise and directly usable.",
  ];

  if (surface === "inquiry") {
    return [
      ...shared,
      "Inquiry surface: help with the current inquiry, related customer workflow, summaries, replies, follow-ups, notes, status explanations, and quote preparation.",
    ].join("\n");
  }

  if (surface === "quote") {
    return [
      ...shared,
      "Quote surface: prioritize quote drafting, wording improvements, terms, notes, exclusions, assumptions, customer-facing messages, follow-ups, linked inquiry context, and missing-information checks.",
      "Drafting quote text is allowed when it is only shown to the user.",
      "Saving quote text, changing quote status, sending externally, or changing quote totals must be done with the quote page controls.",
    ].join("\n");
  }

  return [
    ...shared,
    "Dashboard surface: help across the current business. Be read-heavy by default and summarize this business's inquiries, quotes, follow-ups, recent activity, and operational workload.",
    "Only the most recent items are included in context. If the user asks for a full list or more items than shown, tell them to check the Inquiries or Quotes page for the complete list.",
    "Avoid broad or destructive write guidance from dashboard. Any database modification must be done with the app controls.",
  ].join("\n");
}

export function buildAiSurfaceCompletionRequest(input: {
  surface: AiSurface;
  context: string;
  message: string;
  history?: AiChatMessage[];
  qualityTier?: AiCompletionRequest["qualityTier"];
}): AiCompletionRequest {
  const systemContent = getSurfaceInstructions(input.surface);
  const userContent = [
    "Current Requo context",
    input.context,
    "",
    "User request",
    truncateText(input.message, 4000),
  ].join("\n");

  // Rough token estimate: ~4 chars per token for English text.
  // Reserve budget for output tokens and leave headroom for model overhead.
  const maxOutputTokens = input.surface === "quote" ? 2200 : 1700;
  const maxInputChars = 16_000; // ~4000 tokens input budget for smaller models
  const fixedChars = systemContent.length + userContent.length;
  const availableForHistory = Math.max(0, maxInputChars - fixedChars);

  const history = trimHistoryToFit(input.history ?? [], availableForHistory);

  return {
    model: "",
    messages: [
      {
        role: "system",
        content: systemContent,
      },
      ...history,
      {
        role: "user",
        content: userContent,
      },
    ],
    temperature: 0.2,
    maxOutputTokens,
    qualityTier: input.qualityTier ?? "balanced",
  };
}

/**
 * Trims chat history to fit a character budget while preserving conversation coherence.
 *
 * Strategy:
 * 1. If everything fits, return as-is.
 * 2. Otherwise, keep the most recent messages (for continuity) and optionally the
 *    first user message (as a topic anchor), dropping messages from the middle.
 * 3. When messages are dropped from the middle, inject a system breadcrumb so the
 *    model knows there was earlier context it didn't see.
 * 4. As a last resort, truncate the oldest remaining message's content.
 */
function trimHistoryToFit(
  history: AiChatMessage[],
  maxChars: number,
): AiChatMessage[] {
  if (history.length === 0 || maxChars <= 0) {
    return [];
  }

  const totalChars = history.reduce((sum, msg) => sum + msg.content.length, 0);

  if (totalChars <= maxChars) {
    return history;
  }

  // Find the first user message to use as a topic anchor.
  const firstUserIndex = history.findIndex((msg) => msg.role === "user");
  const firstUser = firstUserIndex >= 0 ? history[firstUserIndex] : null;

  // Collect recent messages (from newest), stopping when we'd exceed budget.
  // Reserve room for the topic anchor + breadcrumb.
  const breadcrumbCost = 120; // approx chars for "[Earlier messages omitted...]"
  const anchorCost = firstUser ? Math.min(firstUser.content.length, 400) + 20 : 0;
  const recentBudget = Math.max(200, maxChars - anchorCost - breadcrumbCost);

  const recent: AiChatMessage[] = [];
  let recentChars = 0;

  for (let i = history.length - 1; i >= 0; i--) {
    if (i === firstUserIndex) continue; // don't double-count

    const msg = history[i];
    const cost = msg.content.length;

    if (recentChars + cost > recentBudget && recent.length >= 2) {
      break;
    }

    recent.unshift(msg);
    recentChars += cost;
  }

  // If we consumed everything after the anchor, no breadcrumb needed.
  const firstRecentIndex =
    recent.length > 0 ? history.indexOf(recent[0]) : history.length;
  const droppedCount =
    firstRecentIndex - (firstUserIndex >= 0 ? firstUserIndex + 1 : 0);

  const result: AiChatMessage[] = [];

  if (firstUser) {
    // Truncate the anchor content if it's very long.
    result.push({
      role: firstUser.role,
      content:
        firstUser.content.length > 400
          ? `${firstUser.content.slice(0, 400).trimEnd()}...`
          : firstUser.content,
    });
  }

  if (droppedCount > 0) {
    result.push({
      role: "system",
      content: `[Earlier ${droppedCount} message${droppedCount === 1 ? "" : "s"} omitted for brevity. Ask if you need earlier context.]`,
    });
  }

  result.push(...recent);

  return result;
}

/**
 * Converts a raw AI provider error into a user-friendly message.
 * Never leaks API keys, model names, org IDs, or billing links to users.
 */
function getErrorMessage(error: unknown): string {
  const rawMessage =
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
      ? error.message
      : "";

  const lower = rawMessage.toLowerCase();

  // Rate limit / capacity / quota — all fallbacks exhausted.
  if (
    lower.includes("rate_limit") ||
    lower.includes("rate limit") ||
    lower.includes("quota") ||
    lower.includes("tokens per minute") ||
    lower.includes("tpm") ||
    lower.includes("request too large") ||
    lower.includes("too many tokens") ||
    lower.includes("context length") ||
    lower.includes("context_length") ||
    lower.includes("capacity") ||
    lower.includes("overloaded")
  ) {
    return "The assistant is busy right now. Please try again in a moment.";
  }

  // Auth / config problems — user can't fix, but we shouldn't leak details.
  if (
    lower.includes("unauthorized") ||
    lower.includes("invalid api key") ||
    lower.includes("authentication") ||
    lower.includes("forbidden") ||
    lower.includes("not configured")
  ) {
    return "The assistant is temporarily unavailable. Please try again later.";
  }

  // Timeout / network.
  if (
    lower.includes("timeout") ||
    lower.includes("timed out") ||
    lower.includes("aborted") ||
    lower.includes("network") ||
    lower.includes("econnreset") ||
    lower.includes("fetch failed")
  ) {
    return "The assistant took too long to respond. Please try again.";
  }

  // Empty response.
  if (lower.includes("empty response")) {
    return "The assistant didn't produce a reply. Please try rephrasing your question.";
  }

  // Default generic message — never surface raw provider text.
  return "The assistant couldn't respond right now. Please try again in a moment.";
}

function getVisibleText(text: string): string {
  let result = text.replace(/<think(?:ing)?>[\s\S]*?<\/think(?:ing)?>/g, "");
  const openMatch = result.match(/<think(?:ing)?>/);

  if (openMatch && openMatch.index !== undefined) {
    result = result.slice(0, openMatch.index);
  }

  return result;
}

function isChatCompletionTruncated(finishReason: unknown) {
  return (
    finishReason === "length" ||
    finishReason === "MAX_TOKENS" ||
    finishReason === "max_tokens"
  );
}

export async function* createAiSurfaceAssistantStream(input: {
  surface: AiSurface;
  context: string;
  message: string;
  history?: AiChatMessage[];
  qualityTier?: AiCompletionRequest["qualityTier"];
}): AsyncGenerator<AiChatStreamEvent> {
  const title =
    input.surface === "inquiry"
      ? "Inquiry Assistant"
      : input.surface === "quote"
        ? "Quote Assistant"
        : "Dashboard Assistant";
  const completionRequest = buildAiSurfaceCompletionRequest(input);
  let streamResponse;
  let emittedFallbackStatus = false;

  try {
    streamResponse = await streamWithFallback(completionRequest, {
      onFallback: () => {
        emittedFallbackStatus = true;
      },
    });
  } catch (error) {
    yield {
      type: "meta",
      title,
      model: "unknown",
    };
    yield {
      type: "error",
      message: getErrorMessage(error),
    };
    return;
  }

  if (emittedFallbackStatus) {
    yield {
      type: "status",
      message: "Switching to another model, one moment...",
    };
  }

  yield {
    type: "meta",
    title,
    model: `${streamResponse.provider}/${streamResponse.model}`,
    provider: streamResponse.provider,
    providerModel: streamResponse.model,
  };

  try {
    let streamedText = "";
    let lastVisibleLength = 0;
    let truncated = false;

    for await (const chunk of streamResponse.stream) {
      if (isChatCompletionTruncated(chunk.finishReason)) {
        truncated = true;
      }

      if (!chunk.delta) {
        continue;
      }

      streamedText += chunk.delta;

      const visible = getVisibleText(streamedText);

      if (visible.length > lastVisibleLength) {
        yield {
          type: "delta",
          value: visible.slice(lastVisibleLength),
        };
        lastVisibleLength = visible.length;
      }
    }

    if (!getVisibleText(streamedText).trim()) {
      throw new Error("The AI assistant returned an empty response.");
    }

    yield {
      type: "done",
      truncated,
    };
  } catch (error) {
    yield {
      type: "error",
      message: getErrorMessage(error),
    };
  }
}
