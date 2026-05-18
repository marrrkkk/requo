import "server-only";

import { and, desc, eq, ilike, isNull, or, sql } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { inquiries, quotes, quoteItems } from "@/lib/db/schema";
import { formatQuoteMoney } from "@/features/quotes/utils";

// ---------------------------------------------------------------------------
// AI Context Retriever — searches business data for relevant records
//
// Given a search text (inquiry details, brief, customer name), this module
// queries the database for matching inquiries and quotes, returning compact
// summaries that can be included in the AI context without loading everything.
//
// This is NOT a vector search / RAG system. It uses simple ILIKE queries
// against existing indexed columns, keeping it fast and infrastructure-free.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ContextRetrieverInput = {
  businessId: string;
  /** The text to search against (inquiry details, brief, customer name, etc.) */
  searchText: string;
  /** Currency for formatting quote totals */
  currency: string;
  /** Max past inquiries to return (default 3) */
  maxInquiries?: number;
  /** Max past quotes to return (default 3) */
  maxQuotes?: number;
  /** Exclude this inquiry ID from results (the current one) */
  excludeInquiryId?: string | null;
};

export type ContextRetrieverOutput = {
  /** Formatted text block of relevant past inquiries */
  pastInquiries: string | null;
  /** Formatted text block of relevant past quotes */
  pastQuotes: string | null;
  /** Whether any relevant records were found */
  hasResults: boolean;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Extracts meaningful search terms from the input text.
 * Returns up to 5 terms that are likely names, services, or keywords.
 */
function extractSearchTerms(text: string): string[] {
  if (!text.trim()) return [];

  // Split into words, filter out very short/common words
  const stopWords = new Set([
    "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
    "have", "has", "had", "do", "does", "did", "will", "would", "could",
    "should", "may", "might", "shall", "can", "need", "dare", "ought",
    "used", "to", "of", "in", "for", "on", "with", "at", "by", "from",
    "as", "into", "through", "during", "before", "after", "above", "below",
    "between", "out", "off", "over", "under", "again", "further", "then",
    "once", "here", "there", "when", "where", "why", "how", "all", "each",
    "every", "both", "few", "more", "most", "other", "some", "such", "no",
    "nor", "not", "only", "own", "same", "so", "than", "too", "very",
    "just", "because", "but", "and", "or", "if", "while", "about", "up",
    "this", "that", "these", "those", "am", "it", "its", "my", "your",
    "his", "her", "our", "their", "what", "which", "who", "whom",
    "i", "me", "we", "you", "he", "she", "they", "them", "us",
    "want", "like", "get", "make", "know", "think", "take", "see",
    "come", "look", "give", "also", "new", "one", "two", "first",
  ]);

  const words = text
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !stopWords.has(w.toLowerCase()))
    .map((w) => w.toLowerCase());

  // Deduplicate and take top 5 most distinctive terms
  const unique = [...new Set(words)];
  return unique.slice(0, 5);
}

function truncate(value: string | null | undefined, limit: number): string {
  const normalized = value?.replace(/\r\n?/g, "\n").trim() ?? "";
  if (!normalized) return "";
  if (normalized.length <= limit) return normalized;
  return `${normalized.slice(0, limit).trimEnd()}...`;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Searches the business's inquiries and quotes for records matching the
 * search text. Returns compact formatted summaries suitable for AI context.
 *
 * Uses ILIKE queries against customerName, subject, details, serviceCategory
 * for inquiries, and customerName, title, notes for quotes.
 */
export async function retrieveRelevantContext(
  input: ContextRetrieverInput,
): Promise<ContextRetrieverOutput> {
  const {
    businessId,
    searchText,
    currency,
    maxInquiries = 3,
    maxQuotes = 3,
    excludeInquiryId,
  } = input;

  const terms = extractSearchTerms(searchText);

  if (terms.length === 0) {
    return { pastInquiries: null, pastQuotes: null, hasResults: false };
  }

  // Build ILIKE conditions for each term across searchable fields
  const inquiryConditions = terms.map((term) => {
    const pattern = `%${term}%`;
    return or(
      ilike(inquiries.customerName, pattern),
      ilike(inquiries.subject, pattern),
      ilike(inquiries.details, pattern),
      ilike(inquiries.serviceCategory, pattern),
    );
  });

  const quoteConditions = terms.map((term) => {
    const pattern = `%${term}%`;
    return or(
      ilike(quotes.customerName, pattern),
      ilike(quotes.title, pattern),
      ilike(quotes.notes, pattern),
    );
  });

  // Query matching inquiries and quotes in parallel
  const [matchingInquiries, matchingQuotes] = await Promise.all([
    db
      .select({
        id: inquiries.id,
        customerName: inquiries.customerName,
        customerEmail: inquiries.customerEmail,
        serviceCategory: inquiries.serviceCategory,
        subject: inquiries.subject,
        details: inquiries.details,
        status: inquiries.status,
        budgetText: inquiries.budgetText,
        submittedAt: inquiries.submittedAt,
      })
      .from(inquiries)
      .where(
        and(
          eq(inquiries.businessId, businessId),
          isNull(inquiries.deletedAt),
          // Match any term against any field
          or(...inquiryConditions),
          // Exclude the current inquiry
          excludeInquiryId
            ? sql`${inquiries.id} != ${excludeInquiryId}`
            : undefined,
        ),
      )
      .orderBy(desc(inquiries.submittedAt))
      .limit(maxInquiries * 2), // Fetch extra to filter duplicates

    db
      .select({
        id: quotes.id,
        quoteNumber: quotes.quoteNumber,
        title: quotes.title,
        customerName: quotes.customerName,
        customerEmail: quotes.customerEmail,
        currency: quotes.currency,
        totalInCents: quotes.totalInCents,
        status: quotes.status,
        notes: quotes.notes,
        createdAt: quotes.createdAt,
      })
      .from(quotes)
      .where(
        and(
          eq(quotes.businessId, businessId),
          isNull(quotes.deletedAt),
          // Match any term against any field
          or(...quoteConditions),
        ),
      )
      .orderBy(desc(quotes.createdAt))
      .limit(maxQuotes * 2),
  ]);

  // Fetch quote items for matched quotes
  const quoteIds = matchingQuotes.map((q) => q.id);
  const itemRows = quoteIds.length
    ? await db
        .select({
          quoteId: quoteItems.quoteId,
          description: quoteItems.description,
          quantity: quoteItems.quantity,
          unitPriceInCents: quoteItems.unitPriceInCents,
        })
        .from(quoteItems)
        .where(
          and(
            eq(quoteItems.businessId, businessId),
            sql`${quoteItems.quoteId} IN (${sql.join(
              quoteIds.map((id) => sql`${id}`),
              sql`, `,
            )})`,
          ),
        )
    : [];

  const itemsByQuoteId = new Map<string, typeof itemRows>();
  for (const item of itemRows) {
    const items = itemsByQuoteId.get(item.quoteId) ?? [];
    items.push(item);
    itemsByQuoteId.set(item.quoteId, items);
  }

  // Format results
  const topInquiries = matchingInquiries.slice(0, maxInquiries);
  const topQuotes = matchingQuotes.slice(0, maxQuotes);

  const pastInquiries =
    topInquiries.length > 0
      ? topInquiries
          .map((inq) =>
            `- [id:${inq.id}] ${inq.customerName} (${inq.serviceCategory}) [${inq.status}]${inq.customerEmail ? ` email:${inq.customerEmail}` : ""}${inq.subject ? ` "${truncate(inq.subject, 60)}"` : ""}${inq.budgetText ? ` budget:${inq.budgetText}` : ""} — ${truncate(inq.details, 150)}`,
          )
          .join("\n")
      : null;

  const pastQuotes =
    topQuotes.length > 0
      ? topQuotes
          .map((q) => {
            const items = itemsByQuoteId.get(q.id) ?? [];
            const itemLines = items
              .slice(0, 4)
              .map(
                (item) =>
                  `  ${truncate(item.description, 60)} x${item.quantity} @${formatQuoteMoney(item.unitPriceInCents, q.currency)}`,
              )
              .join("\n");

            return `- [id:${q.id}] ${q.quoteNumber} "${truncate(q.title, 50)}" for ${q.customerName}${q.customerEmail ? ` (${q.customerEmail})` : ""} [${q.status}] total:${formatQuoteMoney(q.totalInCents, q.currency)}${itemLines ? "\n" + itemLines : ""}`;
          })
          .join("\n")
      : null;

  return {
    pastInquiries,
    pastQuotes,
    hasResults: topInquiries.length > 0 || topQuotes.length > 0,
  };
}
