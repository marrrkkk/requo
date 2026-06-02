import "server-only";

import { and, count, desc, eq, isNull } from "drizzle-orm";

import { getInquiryAssistantContextForBusiness } from "@/features/ai/queries";
import type {
  AiChatStreamEvent,
  AiSurface,
  InquiryAssistantContext,
} from "@/features/ai/types";
import {
  getFollowUpsForQuote,
} from "@/features/follow-ups/queries";
import type { FollowUpOverviewData, FollowUpView } from "@/features/follow-ups/types";
import { getAdditionalInquirySubmittedFields } from "@/features/inquiries/form-config";
import { retrieveRelevantMemories } from "@/features/memory/rag-retriever";
import {
  getQuoteDetailForBusiness,
} from "@/features/quotes/queries";
import { formatQuoteMoney } from "@/features/quotes/utils";
import { streamWithFallback } from "@/lib/ai";
import type { AiChatMessage, AiCompletionRequest } from "@/lib/ai";
import { summarizeDroppedMessages } from "@/lib/ai/history-summarizer";
import {
  classifyMessageComplexity,
  getContextBudgetForComplexity,
} from "@/lib/ai/message-complexity";
import type { AiModelSelection } from "@/lib/ai/model-options";
import { db } from "@/lib/db/client";
import {
  businesses,
  inquiries,
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
  /** User message for RAG-based memory retrieval */
  userMessage?: string;
}) {
  const context = await getInquiryAssistantContextForBusiness({
    businessId: input.businessId,
    inquiryId: input.entityId,
  });

  if (!context) {
    return null;
  }

  // Use RAG for memory retrieval — only load relevant memories
  const queryText = input.userMessage
    ? `${input.userMessage} ${context.inquiry.serviceCategory} ${context.inquiry.customerName}`
    : `${context.inquiry.details} ${context.inquiry.serviceCategory}`;

  const memoryResult = await retrieveRelevantMemories({
    businessId: input.businessId,
    queryText,
    topK: 3,
  });

  const additionalFields = getAdditionalInquirySubmittedFields(
    context.inquiry.submittedFieldSnapshot,
  );

  // Compact business lines
  const businessLine = `Business: ${context.business.name} (${context.business.businessType}); slug: ${context.business.slug}; currency ${context.business.defaultCurrency}`;
  const businessExtras = [
    context.business.industryCategory ? `Industry: ${context.business.industryCategory}` : null,
    context.business.defaultQuoteTerms ? `Default terms: ${truncateText(context.business.defaultQuoteTerms, 200)}` : null,
    context.business.inquiryHeadline ? `Inquiry headline: ${context.business.inquiryHeadline}` : null,
  ].filter(Boolean);

  // Compact inquiry header — only include non-null fields
  const inquiryFields = compactFields([
    ["", context.inquiry.customerName],
    ["email", context.inquiry.customerEmail],
    ["category", context.inquiry.serviceCategory],
    ["status", context.inquiry.status],
    ["subject", context.inquiry.subject],
    ["deadline", context.inquiry.requestedDeadline],
    ["budget", context.inquiry.budgetText],
    ["submitted", formatDateOrNull(context.inquiry.submittedAt)],
  ]);

  return [
    "Surface: inquiry",
    "",
    businessLine,
    context.business.shortDescription ? `Description: ${context.business.shortDescription}` : null,
    ...businessExtras,
    "",
    `Inquiry: ${inquiryFields}`,
    "",
    "Customer message",
    truncateText(context.inquiry.details, 3000),
    additionalFields.length
      ? [
          "",
          "Additional fields",
          ...additionalFields.map((field) => `- ${field.label}: ${field.displayValue}`),
        ].join("\n")
      : null,
    context.attachments.length
      ? [
          "",
          "Attachments",
          ...context.attachments.map(
            (a) => `- ${a.fileName} (${a.contentType}, ${formatFileSize(a.fileSize)})`,
          ),
        ].join("\n")
      : null,
    context.notes.length
      ? [
          "",
          "Internal notes",
          ...context.notes.map((note) => `- ${note.authorName ?? "Owner"}: ${truncateText(note.body, 280)}`),
        ].join("\n")
      : null,
    "",
    "Follow-ups",
    formatFollowUpLines(context.followUps),
    "",
    "Related quotes",
    formatRelatedQuoteLines(context.relatedQuotes),
    context.activities.length
      ? [
          "",
          "Activity",
          ...context.activities.slice(0, 8).map(
            (a) => `- ${formatDateOrNull(a.createdAt)} ${a.summary}`,
          ),
        ].join("\n")
      : null,
    "",
    "Business knowledge",
    memoryResult.combinedText
      ? memoryResult.memories.map((m) => `- ${m.title}: ${truncateText(m.content, 400)}`).join("\n")
      : "- No saved business knowledge.",
  ].filter((line): line is string => line !== null).join("\n");
}

async function buildQuoteContext(input: {
  businessId: string;
  entityId: string;
  /** User message for RAG-based memory retrieval */
  userMessage?: string;
}) {
  const [businessRows, quote, quoteFollowUps] = await Promise.all([
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
        defaultQuoteTerms: businesses.defaultQuoteTerms,
        industryCategory: businesses.industryCategory,
        inquiryHeadline: businesses.inquiryHeadline,
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
  ]);
  const business = businessRows[0];

  if (!business || !quote) {
    return null;
  }

  // Use RAG for memory retrieval — only load relevant memories
  const queryText = input.userMessage
    ? `${input.userMessage} ${quote.title} ${quote.customerName}`
    : `${quote.title} ${quote.customerName} ${quote.notes ?? ""}`;

  const [memoryResult, linkedInquiryContext] = await Promise.all([
    retrieveRelevantMemories({
      businessId: input.businessId,
      queryText,
      topK: 3,
    }),
    quote.inquiryId
      ? getInquiryAssistantContextForBusiness({
          businessId: input.businessId,
          inquiryId: quote.inquiryId,
        })
      : Promise.resolve(null),
  ]);

  const quoteBusinessExtras = [
    business.industryCategory ? `Industry: ${business.industryCategory}` : null,
    business.defaultQuoteTerms ? `Default terms: ${truncateText(business.defaultQuoteTerms, 200)}` : null,
    business.defaultQuoteNotes ? `Default notes: ${truncateText(business.defaultQuoteNotes, 200)}` : null,
    business.defaultEmailSignature ? `Email signature: ${truncateText(business.defaultEmailSignature, 150)}` : null,
    business.inquiryHeadline ? `Inquiry headline: ${business.inquiryHeadline}` : null,
  ].filter(Boolean);

  return [
    "Surface: quote",
    "",
    `Business: ${business.name} (${business.businessType}); slug: ${business.slug}; currency ${business.defaultCurrency}`,
    business.shortDescription ? `Description: ${business.shortDescription}` : null,
    ...quoteBusinessExtras,
    "",
    `Quote: ${quote.quoteNumber} "${quote.title}"`,
    `Customer: ${compactFields([
      ["", quote.customerName],
      ["email", quote.customerEmail],
    ])}`,
    `Status: ${compactFields([
      ["", quote.status],
      ["total", formatQuoteMoney(quote.totalInCents, quote.currency)],
      ["valid-until", quote.validUntil],
      ["sent", formatDateOrNull(quote.sentAt)],
      ["accepted", formatDateOrNull(quote.acceptedAt)],
      ["post-acceptance", quote.postAcceptanceStatus === "none" ? null : quote.postAcceptanceStatus],
    ])}`,
    quote.customerResponseMessage
      ? `Customer response: ${truncateText(quote.customerResponseMessage, 400)}`
      : null,
    quote.notes ? `Notes: ${truncateText(quote.notes, 800)}` : null,
    "",
    "Line items",
    quote.items.length
      ? quote.items
          .map(
            (item) =>
              `- ${item.description} x${item.quantity} @${formatQuoteMoney(item.unitPriceInCents, quote.currency)} = ${formatQuoteMoney(item.lineTotalInCents, quote.currency)}`,
          )
          .join("\n")
      : "- No line items.",
    "",
    "Follow-ups",
    formatFollowUpViewLines(quoteFollowUps),
    "",
    "Linked inquiry",
    formatLinkedInquiryContext(linkedInquiryContext),
    quote.activities.length
      ? [
          "",
          "Activity",
          ...quote.activities.slice(0, 6).map(
            (a) => `- ${formatDate(a.createdAt)}: ${a.summary}`,
          ),
        ].join("\n")
      : null,
    "",
    "Business knowledge",
    memoryResult.combinedText
      ? memoryResult.memories.map((m) => `- ${m.title}: ${truncateText(m.content, 400)}`).join("\n")
      : "- No saved business knowledge.",
  ].filter((line): line is string => line !== null).join("\n");
}

async function buildDashboardContext(input: {
  businessId: string;
  /** User message for RAG-based memory retrieval */
  userMessage?: string;
  /** Pre-retrieved memory results from the orchestrator — skips own retrieval when provided (Requirement 12.2) */
  preRetrievedMemories?: {
    combinedText: string;
    memories: Array<{ title: string; content: string; similarity: number; confidenceTier: "HIGH" | "MEDIUM" | "LOW"; category?: string }>;
    usedRag: boolean;
  };
}) {
  // Query-aware context pruning: classify message complexity to determine
  // how much context to load. Simple messages get only business identity +
  // knowledge; complex messages get full context including service categories
  // and extended business profile extras.
  const complexity = classifyMessageComplexity(input.userMessage ?? "");
  const isSimple = complexity === "simple";

  // Always load business identity and knowledge. Only load service categories
  // for complex messages (Requirement 11.1, 11.2, 11.3).
  // When preRetrievedMemories is provided, skip own retrieval (Requirement 12.2, 12.3).
  const basePromises = [
    db
      .select({
        id: businesses.id,
        name: businesses.name,
        slug: businesses.slug,
        businessType: businesses.businessType,
        shortDescription: businesses.shortDescription,
        contactEmail: businesses.contactEmail,
        defaultCurrency: businesses.defaultCurrency,
        industryCategory: businesses.industryCategory,
        defaultQuoteNotes: businesses.defaultQuoteNotes,
        defaultQuoteTerms: businesses.defaultQuoteTerms,
        defaultEmailSignature: businesses.defaultEmailSignature,
        inquiryHeadline: businesses.inquiryHeadline,
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
    input.preRetrievedMemories
      ? Promise.resolve(input.preRetrievedMemories)
      : retrieveRelevantMemories({
          businessId: input.businessId,
          queryText: input.userMessage ?? "",
          topK: 3,
        }),
  ] as const;

  // For complex messages, also load top service categories
  const topCategoriesPromise = isSimple
    ? Promise.resolve([] as Array<{ category: string; inquiryCount: number }>)
    : db
        .select({
          category: inquiries.serviceCategory,
          inquiryCount: count(),
        })
        .from(inquiries)
        .where(
          and(
            eq(inquiries.businessId, input.businessId),
            isNull(inquiries.deletedAt),
          ),
        )
        .groupBy(inquiries.serviceCategory)
        .orderBy(desc(count()))
        .limit(5);

  const [businessRow, memoryResult, topCategories] = await Promise.all([
    ...basePromises,
    topCategoriesPromise,
  ]);
  const business = businessRow[0];

  if (!business) {
    return null;
  }

  const memoryLines = memoryResult.combinedText
    ? memoryResult.memories.map((m) => `- ${m.title}: ${truncateText(m.content, 400)}`).join("\n")
    : "- No saved business knowledge.";

  // For simple messages: minimal context — business identity + knowledge only
  if (isSimple) {
    return [
      "Surface: dashboard",
      "",
      `Business: ${business.name} (${business.businessType}); slug: /${business.slug}; currency ${business.defaultCurrency}`,
      business.shortDescription ? `Description: ${business.shortDescription}` : null,
      "",
      "Business knowledge",
      memoryLines,
      "",
      "IMPORTANT: You MUST call tools to answer any question about data. Do NOT use the business profile and knowledge above to answer count/status/detail questions — it is background context only. When giving examples or suggestions, use the business's actual services and industry rather than generic placeholders.",
      `Use this slug for building links: ${business.slug}`,
      "Link format for inquiries: /businesses/{slug}/inquiries/{INQUIRY_ID} — MUST start with /",
      "Link format for quotes: /businesses/{slug}/quotes/{QUOTE_ID} — MUST start with /",
    ].filter((line): line is string => line !== null).join("\n");
  }

  // For complex messages: full context including service categories and extras
  const dashboardExtras = [
    business.industryCategory ? `Industry: ${business.industryCategory}` : null,
    topCategories.length
      ? `Services offered: ${topCategories.map((c) => c.category).join(", ")}`
      : null,
    business.defaultQuoteTerms ? `Default terms: ${truncateText(business.defaultQuoteTerms, 200)}` : null,
    business.defaultQuoteNotes ? `Default notes: ${truncateText(business.defaultQuoteNotes, 200)}` : null,
    business.defaultEmailSignature ? `Email signature: ${truncateText(business.defaultEmailSignature, 150)}` : null,
    business.inquiryHeadline ? `Inquiry headline: ${business.inquiryHeadline}` : null,
  ].filter(Boolean);

  return [
    "Surface: dashboard",
    "",
    `Business: ${business.name} (${business.businessType}); slug: /${business.slug}; currency ${business.defaultCurrency}`,
    business.shortDescription ? `Description: ${business.shortDescription}` : null,
    business.contactEmail ? `Contact email: ${business.contactEmail}` : null,
    `Created: ${business.createdAt.toISOString().slice(0, 10)}`,
    ...dashboardExtras,
    "",
    "Business knowledge",
    memoryLines,
    "",
    "IMPORTANT: You MUST call tools to answer any question about data. Do NOT use the business profile and knowledge above to answer count/status/detail questions — it is background context only. When giving examples or suggestions, use the business's actual services and industry rather than generic placeholders.",
    `Use this slug for building links: ${business.slug}`,
    "Link format for inquiries: /businesses/{slug}/inquiries/{INQUIRY_ID} — MUST start with /",
    "Link format for quotes: /businesses/{slug}/quotes/{QUOTE_ID} — MUST start with /",
  ].filter((line): line is string => line !== null).join("\n");
}

export async function buildAiSurfaceContext(input: {
  surface: AiSurface;
  entityId: string;
  businessId: string | null;
  /** User message for RAG-based memory retrieval */
  userMessage?: string;
  /** Pre-retrieved memory results from the orchestrator — skips own retrieval when provided (Requirement 12.2) */
  preRetrievedMemories?: {
    combinedText: string;
    memories: Array<{ title: string; content: string; similarity: number; confidenceTier: "HIGH" | "MEDIUM" | "LOW"; category?: string }>;
    usedRag: boolean;
  };
}) {
  switch (input.surface) {
    case "inquiry":
      return input.businessId
        ? buildInquiryContext({
            businessId: input.businessId,
            entityId: input.entityId,
            userMessage: input.userMessage,
          })
        : null;
    case "quote":
      return input.businessId
        ? buildQuoteContext({
            businessId: input.businessId,
            entityId: input.entityId,
            userMessage: input.userMessage,
          })
        : null;
    case "dashboard":
      return input.businessId
        ? buildDashboardContext({
            businessId: input.businessId,
            userMessage: input.userMessage,
            preRetrievedMemories: input.preRetrievedMemories,
          })
        : null;
  }
}

export function getSurfaceInstructions(surface: AiSurface) {
  const shared = [
    "You are Requo's assistant for an owner-led service business.",
    "Use ONLY the provided context, tool results, and chat history. Never fabricate, invent, or assume data not present in these sources.",
    "Stay focused on inquiries, quotes, follow-ups, and operational summaries.",
    "Never claim you changed the database or sent a message. Modifications require app controls.",
    "If pricing/policy/terms are missing, say what's missing. Format as GitHub-flavored Markdown. Be concise.",
    "",
    "STRICT DATA RULES:",
    "- Every number, count, name, status, date, and amount MUST come from context or tool output. If unavailable, state that explicitly.",
    "- Use IDs from tool results to construct accurate links.",
    "",
    "RESPONSE RULES:",
    "- Simple factual questions: ONE sentence, no headers. E.g. 'The status of Q-1006 is **Draft**.'",
    "- Link inquiries: [Name](/businesses/{slug}/inquiries/ID) — full absolute path starting with /",
    "- Link quotes: [Q-XXXX](/businesses/{slug}/quotes/ID) — full absolute path starting with /",
    "",
    "TEMPLATES:",
    "Inquiry: **[Name](link)** — [Category] `[status]` with bullet details",
    "Quote: [**Q-XXXX**](link) — [Title] `[status]` | Customer | Total | line items table",
    "Follow-up: ⏰ **[Title]** — due [date] `[status]` — [reason]",
  ];

  if (surface === "inquiry") {
    return [
      ...shared,
      "",
      "Inquiry surface: help with the current inquiry, summaries, replies, follow-ups, notes, status, and quote preparation.",
    ].join("\n");
  }

  if (surface === "quote") {
    return [
      ...shared,
      "",
      "Quote surface: help with quote drafting, wording, terms, notes, follow-ups, linked inquiry context, and missing-info checks.",
      "Drafting text is allowed. Saving/sending/changing status requires app controls.",
    ].join("\n");
  }

  return [
    ...shared,
    "",
    "Dashboard surface: answer questions across the business using tools.",
    "ANTI-HALLUCINATION — TOOL-FIRST POLICY:",
    "- ALWAYS call a tool before answering any data question. Never guess counts, statuses, names, dates, or amounts without tool output.",
    "- Only reference IDs, URLs, and records returned by tools. If a tool returns empty or 'not found', report that honestly.",
    "- Use EXACT numbers from tool output — never round, estimate, or approximate. If no tool can answer, say so.",
    "- Available tools: count_inquiries, count_quotes, list_inquiries, list_quotes, search_inquiries, search_quotes, get_inquiry_details, get_quote_details, get_business_stats, get_analytics_overview, get_revenue_summary, get_follow_ups, get_recent_activity, get_stale_inquiries, get_expiring_quotes, get_customer_history, get_service_categories, get_pricing_library, get_inquiry_notes, get_inquiry_conversation, get_inquiry_attachments, get_job_pipeline, get_response_times, get_period_comparison, get_business_knowledge, get_quote_customer_response.",
    "",
    "ACTION TOOLS (write operations):",
    "- draft_inquiry: Use when the user asks to create/log/draft a new inquiry. Returns an action proposal the user must confirm.",
    "- draft_quote: Use when the user asks to create/prepare/draft a quote. Returns an action proposal the user must confirm.",
    "- schedule_follow_up: Use when the user asks to schedule a follow-up/reminder. Requires an inquiryId or quoteId. Returns an action proposal the user must confirm.",
    "- update_inquiry_status: Use when the user asks to change an inquiry's status. Returns an action proposal the user must confirm.",
    "",
    "ACTION TOOL CRITICAL RULES:",
    "- The action tool call itself IS the confirmation UI. When you call draft_quote, draft_inquiry, schedule_follow_up, or update_inquiry_status, a confirmation button automatically appears for the user. You do NOT need to write any [ACTION_PROPOSAL] text manually.",
    "- NEVER write [ACTION_PROPOSAL] blocks yourself. NEVER describe or simulate a confirmation dialog. Just call the tool — the UI handles the rest.",
    "- ALWAYS fetch real data first before calling an action tool. For draft_quote: call get_inquiry_details or search_inquiries first to get correct customer name, email, contact method, service details, and inquiry ID. For schedule_follow_up: call get_inquiry_details or get_quote_details first to get the correct entity ID.",
    "- Every action tool field (names, emails, prices, IDs) must come from tool output or explicit user instructions.",
    "- If the user says 'create a quote for [inquiry]', your steps are: (1) search/get the inquiry details, (2) use those details to fill the draft_quote tool call with real data.",
    "- For quotes, calculate unitPriceInCents as dollars × 100 (e.g. $50 = 5000 cents). If the user specifies prices, use those. If not, check get_pricing_library for standard pricing.",
    "- After calling an action tool, write a SHORT one-line confirmation like 'Here's the quote draft — confirm to create it.' Do NOT repeat all the details (the UI card shows them).",
    "- NEVER say 'the action proposal should appear' or 'you should see a confirmation button'. The tool output IS the button. Just say 'Confirm below to create it.'",
  ].join("\n");
}

export function buildAiSurfaceCompletionRequest(input: {
  surface: AiSurface;
  context: string;
  message: string;
  history?: AiChatMessage[];
  qualityTier?: AiCompletionRequest["qualityTier"];
  modelSelection?: AiModelSelection | null;
}): AiCompletionRequest {
  const systemContent = getSurfaceInstructions(input.surface);
  const userContent = [
    "Current Requo context",
    input.context,
    "",
    "User request",
    truncateText(input.message, 4000),
  ].join("\n");

  // Classify message complexity for dynamic budget allocation
  const complexity = classifyMessageComplexity(input.message);
  const maxInputChars = getContextBudgetForComplexity(complexity);

  const maxOutputTokens = input.surface === "quote" ? 2200 : 1700;
  const fixedChars = systemContent.length + userContent.length;
  const availableForHistory = Math.max(0, maxInputChars - fixedChars);

  const history = trimHistoryToFit(input.history ?? [], availableForHistory);

  return {
    provider: input.modelSelection?.provider,
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
    qualityTier: input.qualityTier ?? (complexity === "simple" ? "cheap" : "balanced"),
    ...(input.modelSelection ? { model: input.modelSelection.model } : {}),
  };
}

/**
 * Trims chat history to fit a character budget while preserving conversation coherence.
 *
 * Strategy:
 * 1. If everything fits, return as-is.
 * 2. Otherwise, keep the most recent messages (for continuity) and optionally the
 *    first user message (as a topic anchor), dropping messages from the middle.
 * 3. When messages are dropped from the middle, generate a heuristic summary
 *    so the model knows there was earlier context it didn't see.
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
  // Reserve room for the topic anchor + summary breadcrumb.
  const summaryBudget = 300; // chars for the summary message
  const anchorCost = firstUser ? Math.min(firstUser.content.length, 400) + 20 : 0;
  const recentBudget = Math.max(200, maxChars - anchorCost - summaryBudget);

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

  // Determine which messages were dropped
  const firstRecentIndex =
    recent.length > 0 ? history.indexOf(recent[0]) : history.length;
  const droppedStartIndex = firstUserIndex >= 0 ? firstUserIndex + 1 : 0;
  const droppedMessages = history.slice(droppedStartIndex, firstRecentIndex);

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

  if (droppedMessages.length > 0) {
    // Generate a heuristic summary of dropped messages instead of just "[omitted]"
    const summary = summarizeDroppedMessages(droppedMessages);
    if (summary) {
      result.push({
        role: "system",
        content: summary,
      });
    }
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
  modelSelection?: AiModelSelection | null;
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
    // Silently switch — no user-facing message needed
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
