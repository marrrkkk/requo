import "server-only";

import { z } from "zod";

import { getInquiryAssistantContextForBusiness } from "@/features/ai/queries";
import { sanitizeAiInput } from "@/lib/ai/input-sanitizer";
import { filterAiOutput } from "@/lib/ai/output-filter";
import { logAiSecurityEvent } from "@/lib/ai/security-events";
import {
  aiQuoteDraftItemConfidenceLevels,
  aiQuoteDraftItemPricingSources,
  aiQuoteDraftItemReviewStatuses,
  type AiQuoteDraft,
  type AiQuoteDraftItem,
  type AiQuoteDraftItemConfidence,
  type AiQuoteDraftItemPricingSource,
  type AiQuoteDraftItemReviewStatus,
  type InquiryAssistantContext,
} from "@/features/ai/types";
import {
  normalizeAiQuoteClarificationMessage,
  normalizeAiQuoteMissingInfo,
} from "@/features/ai/quote-missing-info";
import { buildBusinessMemoryContext } from "@/features/memory/queries";
import type { DashboardQuoteLibraryEntry } from "@/features/quotes/types";
import { formatQuoteMoney } from "@/features/quotes/utils";
import { db } from "@/lib/db/client";
import { businesses } from "@/lib/db/schema";
import {
  generateWithFallback,
  logAiInvocation,
  recordUsage,
  startCooldown,
  TASK_WEIGHTS,
  setCachedOutput,
  getCachedOutput,
} from "@/lib/ai";
import type {
  AiCompletionRequest,
  AiQualityTier,
  AiProviderName,
  CacheKeyComponents,
  CachedAiOutput,
} from "@/lib/ai";
import { getTaskConfig } from "@/features/ai/task-registry";
import { buildTaskContext } from "@/features/ai/context-builder";
import { retrieveRelevantPricing } from "@/features/ai/pricing-retriever";
import { retrieveRelevantContext } from "@/features/ai/context-retriever";
import { saveDraft } from "@/features/ai/draft-store";
import { buildQuoteDraftPrompt } from "@/features/ai/prompts/quote-draft";
import { buildQuoteImprovementPrompt } from "@/features/ai/prompts/quote-improvement";
import { hashPromptVersion } from "@/features/ai/pipeline";
import { eq } from "drizzle-orm";

const MAX_DRAFT_ITEMS = 30;
const MAX_UNIT_PRICE_CENTS = 100_000_000; // $1,000,000 cap per line.
const MAX_QUANTITY = 999_999;
const MAX_REASON_LENGTH = 280;
const MAX_NAME_LENGTH = 120;
const MAX_PRICING_SOURCE_LABEL_LENGTH = 160;

const PRICED_REVIEW_STATUSES = new Set<AiQuoteDraftItemReviewStatus>([
  "matched",
  "calculated",
]);

function coerceAiQuoteDraftItemReviewStatus(
  value: unknown,
): AiQuoteDraftItemReviewStatus {
  if (typeof value !== "string") return "needs_review";

  const normalized = value
    .trim()
    .toLowerCase()
    // Common AI variations: "needs review" vs "needs_review"
    .replace(/\s+/g, "_");

  switch (normalized) {
    case "matched":
      return "matched";
    case "calculated":
      return "calculated";
    case "needs_review":
      return "needs_review";
    case "no_pricing_found":
      return "no_pricing_found";
    default:
      return "needs_review";
  }
}

const quoteDraftResponseSchema = z.object({
  title: z.string().trim().min(2).max(160),
  notes: z
    .union([z.string(), z.null()])
    .transform((value) => (typeof value === "string" ? value.trim() : null))
    .optional()
    .default(null),
  rationale: z
    .union([z.string(), z.null()])
    .transform((value) => (typeof value === "string" ? value.trim() : null))
    .optional()
    .default(null),
  pricingLibraryEntryId: z
    .union([z.string(), z.null()])
    .transform((value) => (typeof value === "string" ? value.trim() : null))
    .optional()
    .default(null),
  items: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(MAX_NAME_LENGTH).optional(),
        description: z.string().trim().min(1).max(400),
        quantity: z.coerce.number().finite().positive(),
        unitPriceInCents: z.coerce.number().finite().nonnegative().nullable().optional(),
        pricingSource: z
          .enum(aiQuoteDraftItemPricingSources)
          .optional()
          .default("none"),
        pricingSourceLabel: z
          .union([z.string(), z.null()])
          .transform((value) =>
            typeof value === "string" ? value.trim() : null,
          )
          .optional()
          .default(null),
        confidence: z
          .enum(aiQuoteDraftItemConfidenceLevels)
          .optional()
          .default("low"),
        reviewStatus: z
          .preprocess(
            (value) => coerceAiQuoteDraftItemReviewStatus(value),
            z.enum(aiQuoteDraftItemReviewStatuses),
          )
          .optional()
          .default("needs_review"),
        reason: z.string().trim().min(1).max(600).optional().default(""),
      }),
    )
    .min(1)
    .max(MAX_DRAFT_ITEMS),
  missingInfo: z
    .array(
      z.object({
        label: z.string().trim().min(2).max(120),
        question: z.string().trim().min(2).max(320),
      }),
    )
    .max(12)
    .optional()
    .default([]),
  clarificationMessage: z
    .union([z.string(), z.null()])
    .transform((value) => (typeof value === "string" ? value.trim() : null))
    .optional()
    .default(null),
});

function truncate(value: string | null | undefined, limit: number) {
  const normalized = value?.replace(/\r\n?/g, "\n").trim() ?? "";

  if (!normalized) return "";

  if (normalized.length <= limit) return normalized;

  return `${normalized.slice(0, limit).trimEnd()}...`;
}

function formatMemoryLines(
  memory: Awaited<ReturnType<typeof buildBusinessMemoryContext>>,
) {
  if (!memory.memories.length) {
    return "- No saved business knowledge.";
  }

  return memory.memories
    .slice(0, 12)
    .map((item) => `- ${item.title}: ${truncate(item.content, 800)}`)
    .join("\n");
}

function formatPricingLibrary(
  entries: DashboardQuoteLibraryEntry[],
  currency: string,
) {
  if (!entries.length) {
    return "- No saved pricing entries.";
  }

  return entries
    .map((entry) => {
      const itemLines = entry.items.length
        ? entry.items
            .map(
              (item) =>
                `  ${item.description} x${item.quantity} @${formatQuoteMoney(item.unitPriceInCents, currency)}`,
            )
            .join("\n")
        : "";

      const header = `- "${entry.name}" (${entry.kind})${entry.description ? ` — ${truncate(entry.description, 150)}` : ""}`;

      return itemLines ? `${header}\n${itemLines}` : header;
    })
    .join("\n");
}

function formatPastQuotes(context: InquiryAssistantContext, currency: string) {
  if (!context.relatedQuotes.length) {
    return "- No past quotes.";
  }

  return context.relatedQuotes
    .slice(0, 3)
    .map((quote) => {
      const items = quote.items
        .slice(0, 6)
        .map(
          (item) =>
            `  ${item.description} x${item.quantity} @${formatQuoteMoney(item.unitPriceInCents, quote.currency)}`,
        )
        .join("\n");
      const total = formatQuoteMoney(quote.totalInCents, quote.currency);

      return `- ${quote.quoteNumber} "${truncate(quote.title, 60)}" [${quote.status}] total:${total}${items ? "\n" + items : ""}`;
    })
    .join("\n");
}

function formatInquiryContextLines(
  context: InquiryAssistantContext,
  currency: string,
) {
  // Compact inquiry header — only non-null fields
  const headerFields: string[] = [
    `Customer: ${context.inquiry.customerName}`,
  ];
  if (context.inquiry.customerEmail) headerFields.push(`email: ${context.inquiry.customerEmail}`);
  if (context.inquiry.serviceCategory) headerFields.push(`category: ${context.inquiry.serviceCategory}`);
  if (context.inquiry.subject) headerFields.push(`subject: ${context.inquiry.subject}`);
  if (context.inquiry.requestedDeadline) headerFields.push(`deadline: ${context.inquiry.requestedDeadline}`);
  if (context.inquiry.budgetText) headerFields.push(`budget: ${context.inquiry.budgetText}`);

  const sections: string[] = [
    `Inquiry: ${headerFields.join("; ")}`,
  ];

  // Submitted fields (compact)
  const snapshot = context.inquiry.submittedFieldSnapshot;
  if (snapshot?.fields.length) {
    const fieldLines = snapshot.fields
      .map((field) => `- ${truncate(field.label, 80)}: ${truncate(field.displayValue, 300)}`)
      .join("\n");
    sections.push("", "Submitted fields", fieldLines);
  }

  // Customer details
  sections.push("", "Details", truncate(context.inquiry.details, 2000));

  // Conversation messages (inquiry thread)
  if (context.messages.length > 0) {
    const messageLines = context.messages
      .slice(0, 10)
      .map((msg) => `[${msg.role}]: ${truncate(msg.content, 400)}`)
      .join("\n");
    sections.push("", "Conversation", messageLines);
  }

  // Notes (compact)
  if (context.notes.length) {
    sections.push(
      "",
      "Notes",
      context.notes
        .slice(0, 4)
        .map((note) => `- ${truncate(note.body, 200)}`)
        .join("\n"),
    );
  }

  // Past quotes
  sections.push("", "Past quotes", formatPastQuotes(context, currency));

  return sections.join("\n");
}

function extractJsonObject(text: string): string | null {
  const trimmed = text.trim();

  if (!trimmed) return null;

  // Strip markdown code fences if present.
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenceMatch ? fenceMatch[1].trim() : trimmed;

  let jsonStr: string | null = null;

  if (candidate.startsWith("{") && candidate.endsWith("}")) {
    jsonStr = candidate;
  } else {
    // Try to locate the first JSON object.
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");

    if (start >= 0 && end > start) {
      jsonStr = candidate.slice(start, end + 1);
    }
  }

  if (!jsonStr) return null;

  // Attempt repair of common LLM JSON issues before returning
  return repairJson(jsonStr);
}

/**
 * Attempts to fix common JSON issues produced by LLMs:
 * - Trailing commas before ] or }
 * - Single-quoted strings → double-quoted
 * - Unescaped newlines inside string values
 * - JavaScript-style comments
 */
function repairJson(json: string): string {
  let result = json;

  // Remove single-line comments (// ...)
  result = result.replace(/\/\/[^\n]*/g, "");

  // Remove multi-line comments (/* ... */)
  result = result.replace(/\/\*[\s\S]*?\*\//g, "");

  // Remove trailing commas before } or ]
  result = result.replace(/,\s*([}\]])/g, "$1");

  // Replace unescaped newlines inside strings (heuristic: between quotes)
  // This handles the case where the model puts literal newlines in string values
  result = result.replace(
    /"([^"\\]*(?:\\.[^"\\]*)*)"/g,
    (match) => match.replace(/\n/g, "\\n").replace(/\r/g, "\\r"),
  );

  return result;
}

/**
 * Attempts to parse a JSON string with progressive repair strategies.
 * Returns the parsed object or null if all attempts fail.
 */
function parseJsonSafe(jsonStr: string): unknown | null {
  // Attempt 1: direct parse (already repaired by extractJsonObject)
  try {
    return JSON.parse(jsonStr);
  } catch {
    // continue to repair attempts
  }

  // Attempt 2: more aggressive trailing comma and whitespace cleanup
  try {
    const cleaned = jsonStr
      .replace(/,\s*([}\]])/g, "$1")
      .replace(/\r\n/g, "\n");
    return JSON.parse(cleaned);
  } catch {
    // continue
  }

  // Attempt 3: replace single quotes with double quotes, fix unquoted keys
  try {
    const aggressive = jsonStr
      .replace(/'/g, '"')
      .replace(/([{,]\s*)(\w+)\s*:/g, '$1"$2":')
      .replace(/,\s*([}\]])/g, "$1");
    return JSON.parse(aggressive);
  } catch {
    // continue
  }

  // Attempt 4: strip everything outside the outermost { }
  try {
    const start = jsonStr.indexOf("{");
    const end = jsonStr.lastIndexOf("}");
    if (start >= 0 && end > start) {
      const inner = jsonStr.slice(start, end + 1).replace(/,\s*([}\]])/g, "$1");
      return JSON.parse(inner);
    }
  } catch {
    // all attempts failed
  }

  return null;
}

type RawDraftItem = z.infer<typeof quoteDraftResponseSchema>["items"][number];

function fallbackNameFromDescription(description: string) {
  const firstLine = description.split(/[\n.;:]/)[0] ?? description;

  return truncate(firstLine, MAX_NAME_LENGTH) || truncate(description, MAX_NAME_LENGTH);
}

/**
 * Resolve any source-label string the AI returns to a friendly, owner-visible
 * label. The model sometimes echoes a raw id (e.g. `qle_abc...` or `qte_...`)
 * instead of the entry name. We replace those with the actual library entry
 * name or past-quote number so the editor badge never shows an opaque id.
 */
function resolveSourceLabel(
  rawLabel: string | null,
  source: AiQuoteDraftItemPricingSource,
  maps: {
    libraryNameById: Map<string, string>;
    libraryIdsByName: Map<string, string>;
    quoteLabelById: Map<string, string>;
  },
): string | null {
  const trimmed = rawLabel?.trim() ?? "";

  if (source === "pricing_library_block" || source === "pricing_library_package") {
    if (!trimmed) return null;
    // Direct id hit.
    const byId = maps.libraryNameById.get(trimmed);
    if (byId) return byId;
    // The model already returned the name; keep it as-is.
    if (maps.libraryIdsByName.has(trimmed.toLowerCase())) return trimmed;
    // Looks like an id-ish prefix we don't know about; drop it so the badge
    // doesn't surface a bare id.
    if (/^[a-z]{2,4}_/i.test(trimmed)) return null;
    return trimmed;
  }

  if (source === "past_quote") {
    if (!trimmed) return null;
    const byId = maps.quoteLabelById.get(trimmed);
    if (byId) return byId;
    if (/^[a-z]{2,4}_/i.test(trimmed)) return null;
    return trimmed;
  }

  return trimmed || null;
}

/**
 * Normalise a single draft item and enforce the "no invented prices" rule.
 *
 * - If the AI claims `matched`/`calculated` but the price isn't supported by an
 *   approved pricing source, we downgrade the item to `needs_review` and zero
 *   the price so the editor can flag it.
 * - If the AI provides a price but no pricing source, the price is dropped.
 */
function normaliseDraftItem(
  item: RawDraftItem,
  context: {
    pricingLibraryIds: Set<string>;
    pastQuoteIds: Set<string>;
    libraryNameById: Map<string, string>;
    libraryIdsByName: Map<string, string>;
    quoteLabelById: Map<string, string>;
    hasMemory?: boolean;
  },
): AiQuoteDraftItem {
  let description = truncate(item.description, 400);
  const name = truncate(
    item.name?.trim() ? item.name : fallbackNameFromDescription(description),
    MAX_NAME_LENGTH,
  );
  const quantity = Math.min(
    MAX_QUANTITY,
    Math.max(1, Math.trunc(item.quantity)),
  );

  const reason =
    truncate(item.reason, MAX_REASON_LENGTH) ||
    "No reason provided by the assistant.";

  const rawPricingSource: AiQuoteDraftItemPricingSource =
    item.pricingSource ?? "none";
  const rawConfidence: AiQuoteDraftItemConfidence = item.confidence ?? "low";
  let reviewStatus: AiQuoteDraftItemReviewStatus =
    item.reviewStatus ?? "needs_review";
  let pricingSource: AiQuoteDraftItemPricingSource = rawPricingSource;
  let pricingSourceLabel = resolveSourceLabel(
    item.pricingSourceLabel,
    pricingSource,
    {
      libraryNameById: context.libraryNameById,
      libraryIdsByName: context.libraryIdsByName,
      quoteLabelById: context.quoteLabelById,
    },
  );
  if (pricingSourceLabel) {
    pricingSourceLabel = truncate(
      pricingSourceLabel,
      MAX_PRICING_SOURCE_LABEL_LENGTH,
    );
  }
  const rawPriceCents =
    typeof item.unitPriceInCents === "number" && Number.isFinite(item.unitPriceInCents)
      ? Math.max(0, Math.round(item.unitPriceInCents))
      : 0;
  let unitPriceInCents = Math.min(MAX_UNIT_PRICE_CENTS, rawPriceCents);

  // The AI must use one of the approved sources before we accept a price.
  const pricingSourceLooksApproved =
    pricingSource === "pricing_library_block" ||
    pricingSource === "pricing_library_package" ||
    pricingSource === "past_quote" ||
    pricingSource === "business_memory";

  if (PRICED_REVIEW_STATUSES.has(reviewStatus)) {
    if (!pricingSourceLooksApproved || unitPriceInCents <= 0) {
      // The AI claimed a price but couldn't justify it from approved data.
      // Force the owner to review.
      reviewStatus = "needs_review";
      unitPriceInCents = 0;
      pricingSource = pricingSource === "owner_brief" ? "owner_brief" : "none";
      pricingSourceLabel = pricingSourceLabel ?? null;
    }
  } else {
    // For needs_review / no_pricing_found we never accept a price.
    unitPriceInCents = 0;
    if (
      reviewStatus === "no_pricing_found" &&
      pricingSource !== "none"
    ) {
      pricingSource = "none";
    }
  }

  // Cross-check that the cited pricing-library / past-quote ids actually exist
  // in the provided context. If they don't, downgrade to needs_review.
  if (
    PRICED_REVIEW_STATUSES.has(reviewStatus) &&
    pricingSource === "pricing_library_block"
  ) {
    // Verify the cited label actually matches a real pricing library entry name.
    const labelMatchesEntry = pricingSourceLabel &&
      context.pricingLibraryIds.size > 0 &&
      context.libraryNameById &&
      Array.from(context.libraryNameById.values()).some(
        (name) => name.toLowerCase() === pricingSourceLabel!.toLowerCase(),
      );

    if (!labelMatchesEntry) {
      reviewStatus = "needs_review";
      unitPriceInCents = 0;
      pricingSource = "none";
      pricingSourceLabel = null;
    }
  }

  if (
    PRICED_REVIEW_STATUSES.has(reviewStatus) &&
    pricingSource === "pricing_library_package"
  ) {
    // Verify the cited label actually matches a real package entry name.
    const labelMatchesEntry = pricingSourceLabel &&
      context.pricingLibraryIds.size > 0 &&
      context.libraryNameById &&
      Array.from(context.libraryNameById.values()).some(
        (name) => name.toLowerCase() === pricingSourceLabel!.toLowerCase(),
      );

    if (!labelMatchesEntry) {
      reviewStatus = "needs_review";
      unitPriceInCents = 0;
      pricingSource = "none";
      pricingSourceLabel = null;
    }
  }

  if (
    PRICED_REVIEW_STATUSES.has(reviewStatus) &&
    pricingSource === "past_quote"
  ) {
    // Verify past quotes actually exist and the label references one.
    const labelMatchesQuote = pricingSourceLabel &&
      context.pastQuoteIds.size > 0 &&
      context.quoteLabelById &&
      Array.from(context.quoteLabelById.values()).some(
        (label) => label.toLowerCase() === pricingSourceLabel!.toLowerCase(),
      );

    if (!context.pastQuoteIds.size || !labelMatchesQuote) {
      reviewStatus = "needs_review";
      unitPriceInCents = 0;
      pricingSource = "none";
      pricingSourceLabel = null;
    }
  }

  if (
    PRICED_REVIEW_STATUSES.has(reviewStatus) &&
    pricingSource === "business_memory"
  ) {
    // Business memory is the weakest source — if there's no memory context at all, reject.
    if (!context.hasMemory) {
      reviewStatus = "needs_review";
      unitPriceInCents = 0;
      pricingSource = "none";
      pricingSourceLabel = null;
    }
  }

  const confidence: AiQuoteDraftItemConfidence = PRICED_REVIEW_STATUSES.has(
    reviewStatus,
  )
    ? rawConfidence
    : "low";

  // For matched/calculated items pulled from the pricing library, use the
  // library entry's title as the customer-facing description so the line item
  // matches what the owner saved (and keeps wording consistent across quotes).
  if (
    PRICED_REVIEW_STATUSES.has(reviewStatus) &&
    (pricingSource === "pricing_library_block" ||
      pricingSource === "pricing_library_package") &&
    pricingSourceLabel
  ) {
    description = truncate(pricingSourceLabel, 400);
  }

  return {
    name: name || truncate(description, MAX_NAME_LENGTH),
    description,
    quantity,
    unitPriceInCents,
    pricingSource,
    pricingSourceLabel,
    confidence,
    reviewStatus,
    reason,
  };
}

type GenerateQuoteDraftInput = {
  businessId: string;
  userId: string;
  inquiryId?: string | null;
  brief?: string | null;
  revisionComment?: string | null;
  currentItems?: string | null;
  /** Structured current items for revision merging. */
  currentItemsData?: Array<{
    description: string;
    quantity: number;
    unitPriceInCents: number;
  }> | null;
};

/**
 * For revisions: start with the original current items as the base, then
 * apply the AI's quantity/price changes on top. Filter out package summary
 * rows and duplicates of existing items.
 */
function mergeRevisionWithCurrentItems(
  aiItems: AiQuoteDraftItem[],
  currentItemsData: Array<{
    description: string;
    quantity: number;
    unitPriceInCents: number;
  }>,
  packageNames: Set<string>,
  revisionComment: string | null,
  libraryEntryByName?: Map<string, DashboardQuoteLibraryEntry>,
): AiQuoteDraftItem[] {
  // Build lookup of current items
  const currentItemsByDesc = new Map<
    string,
    { description: string; quantity: number; unitPriceInCents: number }
  >();
  for (const item of currentItemsData) {
    const key = item.description.trim().toLowerCase();
    if (key) currentItemsByDesc.set(key, item);
  }

  // Try to parse quantity changes from revision comment
  // Patterns: "add 3 more X", "change X to 4", "X qty 3", "3 X", "3 more X"
  const quantityOverrides = new Map<string, number>();
  if (revisionComment) {
    const comment = revisionComment.toLowerCase();
    for (const [desc] of currentItemsByDesc) {
      const descLower = desc.toLowerCase();
      // "add N more <item>"
      const addMoreMatch = comment.match(
        new RegExp(`add\\s+(\\d+)\\s+more\\s+${escapeRegex(descLower)}`, "i"),
      );
      if (addMoreMatch) {
        const currentQty = currentItemsByDesc.get(desc)?.quantity ?? 1;
        quantityOverrides.set(desc, currentQty + parseInt(addMoreMatch[1], 10));
        continue;
      }
      // "N more <item>"
      const nMoreMatch = comment.match(
        new RegExp(`(\\d+)\\s+more\\s+${escapeRegex(descLower)}`, "i"),
      );
      if (nMoreMatch) {
        const currentQty = currentItemsByDesc.get(desc)?.quantity ?? 1;
        quantityOverrides.set(desc, currentQty + parseInt(nMoreMatch[1], 10));
        continue;
      }
      // "<item> to N" or "<item> qty N"
      const toNMatch = comment.match(
        new RegExp(`${escapeRegex(descLower)}\\s+(?:to|qty|quantity|=)\\s+(\\d+)`, "i"),
      );
      if (toNMatch) {
        quantityOverrides.set(desc, parseInt(toNMatch[1], 10));
      }
    }
  }

  // Start with current items, apply overrides
  const result: AiQuoteDraftItem[] = [];
  const seenDescriptions = new Set<string>();

  for (const currentItem of currentItemsData) {
    const key = currentItem.description.trim().toLowerCase();
    if (seenDescriptions.has(key)) continue;
    seenDescriptions.add(key);

    const overriddenQty = quantityOverrides.get(key);
    const finalQty = overriddenQty ?? currentItem.quantity;

    // Verify item actually matches a pricing library entry before marking as "matched".
    // Check if the item description matches any library entry name or any item within
    // a library entry. Without a verified match, mark as "needs_review".
    let verifiedSource: AiQuoteDraftItemPricingSource = "none";
    let verifiedSourceLabel: string | null = null;
    let verifiedReviewStatus: AiQuoteDraftItemReviewStatus = "needs_review";
    let verifiedConfidence: AiQuoteDraftItemConfidence = "low";

    if (libraryEntryByName) {
      // Check if the description matches a library entry name directly
      const directEntry = libraryEntryByName.get(key);
      if (directEntry) {
        verifiedSource = directEntry.kind === "package"
          ? "pricing_library_package"
          : "pricing_library_block";
        verifiedSourceLabel = directEntry.name;
        verifiedReviewStatus = "matched";
        verifiedConfidence = "high";
      } else {
        // Check if the description matches any item within any library entry
        for (const [, entry] of libraryEntryByName) {
          const matchingItem = entry.items.find(
            (item) => item.description.trim().toLowerCase() === key,
          );
          if (matchingItem) {
            verifiedSource = entry.kind === "package"
              ? "pricing_library_package"
              : "pricing_library_block";
            verifiedSourceLabel = entry.name;
            verifiedReviewStatus = "matched";
            verifiedConfidence = "high";
            break;
          }
        }
      }
    }

    result.push({
      name: currentItem.description.slice(0, 120),
      description: currentItem.description,
      quantity: finalQty,
      unitPriceInCents: verifiedReviewStatus === "matched"
        ? currentItem.unitPriceInCents
        : 0,
      pricingSource: verifiedSource,
      pricingSourceLabel: verifiedSourceLabel,
      confidence: verifiedConfidence,
      reviewStatus: verifiedReviewStatus,
      reason: overriddenQty
        ? `Quantity updated per customer revision request.`
        : "Carried over from previous version.",
    });
  }

  // Only add genuinely new AI items that:
  // 1. Don't duplicate existing items
  // 2. Aren't package summary rows
  // 3. Have a meaningful description
  for (const aiItem of aiItems) {
    const descLower = aiItem.description.trim().toLowerCase();
    const nameLower = (aiItem.name || "").trim().toLowerCase();

    // Skip empty
    if (!descLower) continue;
    // Skip duplicates
    if (seenDescriptions.has(descLower)) continue;
    // Skip package summary rows
    if (packageNames.has(descLower) || packageNames.has(nameLower)) continue;
    // Skip if it's too similar to an existing item (fuzzy match)
    let tooSimilar = false;
    for (const existing of seenDescriptions) {
      if (existing.includes(descLower) || descLower.includes(existing)) {
        tooSimilar = true;
        break;
      }
    }
    if (tooSimilar) continue;

    seenDescriptions.add(descLower);
    result.push(aiItem);
  }

  return result;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Replace any "matched" library-package line item with the package's actual
 * line items. The model often returns a mix of rows tagged with the same
 * `pricing_library_package` source — sometimes the saved package items,
 * sometimes a summary row priced at the package total — and the description
 * gets normalised back to the package name. To stay deterministic, we drop
 * every row that points to a known package and emit one canonical expansion
 * straight from the saved library.
 */
function expandPackageItems(
  items: AiQuoteDraftItem[],
  context: {
    libraryEntryById: Map<string, DashboardQuoteLibraryEntry>;
    libraryEntryByName: Map<string, DashboardQuoteLibraryEntry>;
  },
): AiQuoteDraftItem[] {
  function resolveEntry(item: AiQuoteDraftItem) {
    // Direct match via pricingSourceLabel
    if (
      item.pricingSource === "pricing_library_package" &&
      item.pricingSourceLabel
    ) {
      if (
        item.reviewStatus !== "matched" &&
        item.reviewStatus !== "calculated"
      ) {
        return null;
      }

      const labelLower = item.pricingSourceLabel.toLowerCase();
      const entry =
        context.libraryEntryById.get(item.pricingSourceLabel) ??
        context.libraryEntryByName.get(labelLower);

      if (!entry || entry.kind !== "package" || entry.items.length === 0) {
        return null;
      }

      return entry;
    }

    // Fallback: match by item name or description against known package names
    // This catches cases where the AI doesn't tag the source correctly
    const nameLower = (item.name || item.description).toLowerCase().trim();
    const descLower = item.description.toLowerCase().trim();

    const entryByName = context.libraryEntryByName.get(nameLower);
    if (entryByName && entryByName.kind === "package" && entryByName.items.length > 0) {
      return entryByName;
    }

    const entryByDesc = context.libraryEntryByName.get(descLower);
    if (entryByDesc && entryByDesc.kind === "package" && entryByDesc.items.length > 0) {
      return entryByDesc;
    }

    return null;
  }

  const referencedPackageIds = new Set<string>();
  for (const item of items) {
    const entry = resolveEntry(item);
    if (entry) {
      referencedPackageIds.add(entry.id);
    }
  }

  if (!referencedPackageIds.size) {
    return items;
  }

  // Build a set of normalised descriptions that belong to any referenced
  // package so we can drop the model's separate "scope rows" that re-list
  // package items individually with a different (or missing) source tag.
  const packageItemDescriptions = new Set<string>();
  for (const packageId of referencedPackageIds) {
    const entry =
      context.libraryEntryById.get(packageId) ??
      // Fallback: scan by id since libraryEntryById is keyed by id.
      undefined;

    if (!entry) continue;

    for (const packageItem of entry.items) {
      const key = packageItem.description.trim().toLowerCase();
      if (key) {
        packageItemDescriptions.add(key);
      }
    }
  }

  const expanded: AiQuoteDraftItem[] = [];
  const emittedPackageIds = new Set<string>();

  for (const item of items) {
    const entry = resolveEntry(item);

    if (entry && referencedPackageIds.has(entry.id)) {
      // Drop this row regardless of its description; the canonical expansion
      // is the single source of truth for the package contents.
      if (emittedPackageIds.has(entry.id)) {
        continue;
      }

      emittedPackageIds.add(entry.id);

      for (const packageItem of entry.items) {
        const safeQuantity = Math.min(
          MAX_QUANTITY,
          Math.max(1, Math.trunc(packageItem.quantity)),
        );
        const safeUnitPrice = Math.min(
          MAX_UNIT_PRICE_CENTS,
          Math.max(0, Math.round(packageItem.unitPriceInCents)),
        );

        expanded.push({
          name: truncate(packageItem.description, MAX_NAME_LENGTH),
          description: truncate(packageItem.description, 400),
          quantity: safeQuantity,
          unitPriceInCents: safeUnitPrice,
          pricingSource: "pricing_library_package",
          pricingSourceLabel: entry.name,
          confidence: "high",
          reviewStatus: "matched",
          reason: `From "${entry.name}" package.`,
        });
      }

      continue;
    }

    // Drop standalone rows whose description matches one of the package's
    // items. The model often lists the package contents both as a summary
    // row and as separate "scope" rows tagged differently, which produces
    // duplicates against the canonical expansion above.
    const descriptionKey = item.description.trim().toLowerCase();
    if (descriptionKey && packageItemDescriptions.has(descriptionKey)) {
      continue;
    }

    expanded.push(item);
  }

  return expanded;
}

type GenerateQuoteDraftResult =
  | { ok: true; draft: AiQuoteDraft }
  | { ok: false; error: string };

export async function generateQuoteDraftForBusiness(
  input: GenerateQuoteDraftInput,
): Promise<GenerateQuoteDraftResult> {
  const [businessRow] = await db
    .select({
      id: businesses.id,
      name: businesses.name,
      slug: businesses.slug,
      businessType: businesses.businessType,
      shortDescription: businesses.shortDescription,
      defaultCurrency: businesses.defaultCurrency,
      defaultQuoteNotes: businesses.defaultQuoteNotes,
      aiTonePreference: businesses.aiTonePreference,
    })
    .from(businesses)
    .where(eq(businesses.id, input.businessId))
    .limit(1);

  if (!businessRow) {
    return {
      ok: false,
      error: "That business could not be found.",
    };
  }

  // --- AI Input Sanitization ---
  // Sanitize user-provided text inputs before they reach the AI provider.
  const userInputText = [input.brief ?? "", input.revisionComment ?? ""]
    .filter(Boolean)
    .join(" ");

  if (userInputText.trim()) {
    const sanitization = sanitizeAiInput(userInputText);

    if (sanitization.status === "rejected") {
      logAiSecurityEvent({
        eventType: "injection_rejected",
        patternMatched: sanitization.patterns.join(", "),
        userId: input.userId,
        businessId: input.businessId,
        rawInput: userInputText,
      });
      return {
        ok: false,
        error: "Your input could not be processed. Please rephrase your request.",
      };
    }

    if (sanitization.status === "sanitized") {
      logAiSecurityEvent({
        eventType: "injection_detected",
        patternMatched: sanitization.patterns.join(", "),
        userId: input.userId,
        businessId: input.businessId,
        rawInput: userInputText,
      });
      // Use sanitized versions of the inputs
      if (input.brief) {
        const briefSanitization = sanitizeAiInput(input.brief);
        if (briefSanitization.status !== "rejected") {
          input = { ...input, brief: briefSanitization.output };
        }
      }
      if (input.revisionComment) {
        const revisionSanitization = sanitizeAiInput(input.revisionComment);
        if (revisionSanitization.status !== "rejected") {
          input = { ...input, revisionComment: revisionSanitization.output };
        }
      }
    }
  }

  const currency = businessRow.defaultCurrency;

  // Fetch inquiry context (needed for inquiry text and related quotes)
  const inquiryContext = input.inquiryId
    ? await getInquiryAssistantContextForBusiness({
        businessId: input.businessId,
        inquiryId: input.inquiryId,
      })
    : null;

  if (input.inquiryId && !inquiryContext) {
    return {
      ok: false,
      error: "That linked inquiry could not be found.",
    };
  }

  // Assemble the inquiry text for pricing retrieval and context
  const inquiryText = inquiryContext
    ? [
        inquiryContext.inquiry.subject ?? "",
        inquiryContext.inquiry.details ?? "",
        inquiryContext.inquiry.serviceCategory ?? "",
      ]
        .filter(Boolean)
        .join(" ")
    : input.brief ?? "";

  // Use pricing retriever to get only relevant pricing blocks (Requirement 3.1)
  // Also retrieve relevant past inquiries/quotes for additional context
  const [pricingResult, memory, relevantContext] = await Promise.all([
    retrieveRelevantPricing({
      inquiryText,
      businessId: input.businessId,
      currency,
    }),
    buildBusinessMemoryContext(input.businessId),
    retrieveRelevantContext({
      businessId: input.businessId,
      searchText: inquiryText,
      currency,
      excludeInquiryId: input.inquiryId ?? null,
    }),
  ]);

  const pricingLibrary = pricingResult.entries;

  const pricingLibraryIds = new Set(pricingLibrary.map((entry) => entry.id));
  const pastQuoteIds = new Set(
    (inquiryContext?.relatedQuotes ?? []).map((quote) => quote.id),
  );
  const libraryNameById = new Map(
    pricingLibrary.map((entry) => [entry.id, entry.name]),
  );
  const libraryIdsByName = new Map(
    pricingLibrary.map((entry) => [entry.name.toLowerCase(), entry.id]),
  );
  const libraryEntryById = new Map(
    pricingLibrary.map((entry) => [entry.id, entry]),
  );
  const libraryEntryByName = new Map(
    pricingLibrary.map((entry) => [entry.name.toLowerCase(), entry]),
  );
  const quoteLabelById = new Map(
    (inquiryContext?.relatedQuotes ?? []).map((quote) => [
      quote.id,
      quote.quoteNumber || quote.title,
    ]),
  );

  // Format pricing blocks as a string for context
  const pricingBlocksText = formatPricingLibrary(pricingLibrary, currency);

  // Format business memory summary (≤500 chars as per Requirement 2.3)
  const businessMemorySummaryText = truncate(formatMemoryLines(memory), 500);

  // Format inquiry text for context (include relevant past data if found)
  let inquiryContextText = inquiryContext
    ? formatInquiryContextLines(inquiryContext, currency)
    : input.brief?.trim()
      ? `Owner brief:\n${truncate(input.brief, 2000)}`
      : "";

  // Append relevant past inquiries/quotes from the database
  if (relevantContext.hasResults) {
    const pastDataLines: string[] = [];
    if (relevantContext.pastInquiries) {
      pastDataLines.push(`\nRelevant past inquiries from this business:\n${relevantContext.pastInquiries}`);
    }
    if (relevantContext.pastQuotes) {
      pastDataLines.push(`\nRelevant past quotes from this business:\n${relevantContext.pastQuotes}`);
    }
    if (pastDataLines.length > 0) {
      inquiryContextText += pastDataLines.join("\n");
    }
  }

  // Build context via context builder to enforce character budget (Requirement 2.2)
  const taskType = "quote_draft" as const;

  // Build revision-specific context if applicable
  const revisionContext = input.revisionComment?.trim() || null;
  const currentItemsText = input.currentItems?.trim() || null;

  const contextResult = buildTaskContext({
    taskType,
    availableData: {
      inquiryText: inquiryContextText || null,
      customerName: inquiryContext?.inquiry.customerName ?? null,
      customerEmail: inquiryContext?.inquiry.customerEmail ?? null,
      pricingBlocks: pricingBlocksText,
      tonePreference: businessRow.aiTonePreference,
      businessMemorySummary: businessMemorySummaryText,
      revisionContext,
      currentItems: currentItemsText,
    },
  });

  // Use the prompt template to build the system prompt
  const systemInstructions = buildQuoteDraftPrompt(contextResult.assembledContext);

  const userMessage = [
    "Business and inquiry context is below. Generate the quote draft now.",
    "Remember: only price items that match approved pricing sources. Mark everything else as needs_review or no_pricing_found with unitPriceInCents = 0.",
  ].join("\n");

  const taskConfig = getTaskConfig(taskType);
  const promptVersionHash = hashPromptVersion(systemInstructions);

  const completionRequest: AiCompletionRequest = {
    model: "",
    messages: [
      { role: "system", content: systemInstructions },
      { role: "user", content: userMessage },
    ],
    temperature: taskConfig.temperature,
    maxOutputTokens: taskConfig.maxOutputTokens,
    qualityTier: taskConfig.qualityTier as AiQualityTier,
  };

  // Build source data versions for cache key
  const sourceDataVersions: Record<string, string | null> = {
    inquiry: inquiryContext?.inquiry.createdAt.toISOString() ?? null,
    pricingLibrary: pricingLibrary.length > 0
      ? pricingLibrary.map((e) => e.id).sort().join(",")
      : null,
    brief: input.brief ?? null,
    revisionComment: input.revisionComment ?? null,
    currentItems: input.currentItems ?? null,
    currentItemsData: input.currentItemsData
      ? JSON.stringify(input.currentItemsData)
      : null,
  };

  // Check cache (non-streaming path for quote_draft uses cache)
  const cacheKey: CacheKeyComponents = {
    businessId: input.businessId,
    userId: input.userId,
    taskType,
    promptVersion: promptVersionHash,
    modelTier: taskConfig.qualityTier as AiQualityTier,
    sourceDataVersions,
  };

  const cachedOutput = await getCachedOutput(cacheKey);

  if (cachedOutput) {
    // Cache hit: log with zero tokens, skip usage deduction and cooldown
    const cacheStartTime = Date.now();

    await logAiInvocation({
      userId: input.userId,
      businessId: input.businessId,
      taskType,
      model: cachedOutput.model,
      provider: cachedOutput.provider,
      inputTokens: 0,
      outputTokens: 0,
      cacheHit: true,
      latencyMs: Date.now() - cacheStartTime,
      status: "success",
    }).catch((logError) => {
      console.warn("[quote-generator] Failed to log cache hit:", logError);
    });

    // Parse the cached text as a draft
    const cachedJson = extractJsonObject(cachedOutput.text);
    if (cachedJson) {
      try {
        const cachedParsed = JSON.parse(cachedJson);
        const cachedValidation = quoteDraftResponseSchema.safeParse(cachedParsed);
        if (cachedValidation.success) {
          const cachedItems = expandPackageItems(
            cachedValidation.data.items
              .map((item) =>
                normaliseDraftItem(item, {
                  pricingLibraryIds,
                  pastQuoteIds,
                  libraryNameById,
                  libraryIdsByName,
                  quoteLabelById,
                  hasMemory: memory.memories.length > 0,
                }),
              )
              .filter((item) => item.description.length > 0),
            { libraryEntryById, libraryEntryByName },
          ).slice(0, MAX_DRAFT_ITEMS);

          if (cachedItems.length > 0) {
            const cachedMissingInfo = normalizeAiQuoteMissingInfo(cachedValidation.data.missingInfo);
            const cachedClarification = normalizeAiQuoteClarificationMessage({
              message: cachedValidation.data.clarificationMessage,
              missingInfo: cachedMissingInfo,
            });

            const cachedDraft: AiQuoteDraft = {
              title: truncate(cachedValidation.data.title, 160),
              notes: cachedValidation.data.notes?.trim()
                ? truncate(cachedValidation.data.notes, 4000)
                : null,
              items: cachedItems,
              missingInfo: cachedMissingInfo,
              clarificationMessage: cachedClarification,
              pricingLibraryEntryId: cachedValidation.data.pricingLibraryEntryId
                ? pricingLibrary.find(
                    (entry) => entry.id === cachedValidation.data.pricingLibraryEntryId && entry.currency === currency,
                  )?.id ?? null
                : null,
              rationale: cachedValidation.data.rationale?.trim()
                ? truncate(cachedValidation.data.rationale, 600)
                : null,
              model: cachedOutput.model,
              provider: cachedOutput.provider as AiProviderName,
              itemsNeedingReview: cachedItems.filter(
                (item) => !PRICED_REVIEW_STATUSES.has(item.reviewStatus),
              ).length,
            };

            return { ok: true, draft: cachedDraft };
          }
        }
      } catch {
        // Cached data is corrupt — fall through to fresh generation
      }
    }
  }

  // Cache miss: invoke AI
  const startTime = Date.now();

  try {
    const response = await generateWithFallback(completionRequest);
    const latencyMs = Date.now() - startTime;
    const inputTokens = response.usage?.promptTokens ?? 0;
    const outputTokens = response.usage?.completionTokens ?? 0;

    // --- AI Output Filtering ---
    const outputFilterResult = filterAiOutput(response.text, [
      "quote draft",
      "approved pricing sources",
      "needs_review",
      "no_pricing_found",
      "unitPriceInCents",
    ]);
    if (outputFilterResult.status === "redacted") {
      logAiSecurityEvent({
        eventType: "output_redacted",
        patternMatched: outputFilterResult.redactedPatterns.join(", "),
        userId: input.userId,
        businessId: input.businessId,
        rawInput: response.text.slice(0, 200),
      });
    }
    const filteredResponseText = outputFilterResult.output;

    const rawJson = extractJsonObject(filteredResponseText);

    if (!rawJson) {
      console.error("[quote-generator] No JSON found in response. Raw text:", filteredResponseText.slice(0, 500));
      return {
        ok: false,
        error: "The assistant did not return a valid draft. Try again.",
      };
    }

    const parsedJson = parseJsonSafe(rawJson);
    if (parsedJson === null) {
      console.error("[quote-generator] JSON parse failed. Extracted JSON:", rawJson.slice(0, 500));
      return {
        ok: false,
        error: "The assistant returned malformed draft data. Try again.",
      };
    }

    const validation = quoteDraftResponseSchema.safeParse(parsedJson);

    if (!validation.success) {
      console.error("[quote-generator] Zod validation failed:", JSON.stringify(validation.error.issues.slice(0, 5)));
      return {
        ok: false,
        error: "The assistant returned an incomplete draft. Try again.",
      };
    }

    const normalisedItems = validation.data.items
      .map((item) =>
        normaliseDraftItem(item, {
                  pricingLibraryIds,
                  pastQuoteIds,
                  libraryNameById,
                  libraryIdsByName,
                  quoteLabelById,
                  hasMemory: memory.memories.length > 0,
                }),
      )
      .filter((item) => item.description.length > 0);

    // For revisions: merge AI's changes against current items (delta-merge approach).
    // For fresh drafts: use the standard expansion which uses library quantities.
    const items =
      revisionContext && input.currentItemsData && input.currentItemsData.length > 0
        ? mergeRevisionWithCurrentItems(
            normalisedItems,
            input.currentItemsData,
            new Set([...libraryEntryByName.keys()]),
            input.revisionComment ?? null,
            libraryEntryByName,
          ).slice(0, MAX_DRAFT_ITEMS)
        : expandPackageItems(
            normalisedItems,
            { libraryEntryById, libraryEntryByName },
          ).slice(0, MAX_DRAFT_ITEMS);

    if (!items.length) {
      return {
        ok: false,
        error: "The assistant returned no usable line items. Try again.",
      };
    }

    // Cache the raw AI output for future requests
    if (taskConfig.cacheTTL > 0) {
      const cachedResult: CachedAiOutput = {
        text: response.text,
        model: response.model,
        provider: response.provider,
        createdAt: new Date().toISOString(),
        usage: response.usage,
      };

      await setCachedOutput(cacheKey, cachedResult, taskConfig.cacheTTL);
    }

    // Record usage and start cooldown
    const weight = TASK_WEIGHTS[taskType];
    await recordUsage(input.userId, input.businessId, taskType, weight);
    startCooldown(input.userId, taskType);

    // Log tokens
    await logAiInvocation({
      userId: input.userId,
      businessId: input.businessId,
      taskType,
      model: response.model,
      provider: response.provider,
      inputTokens,
      outputTokens,
      cacheHit: false,
      latencyMs,
      status: "success",
    }).catch((logError) => {
      console.warn("[quote-generator] Failed to log invocation:", logError);
    });

    const libraryEntryId = validation.data.pricingLibraryEntryId;
    const knownEntryId = libraryEntryId
      ? pricingLibrary.find(
          (entry) => entry.id === libraryEntryId && entry.currency === currency,
        )?.id ?? null
      : null;
    const missingInfo = normalizeAiQuoteMissingInfo(
      validation.data.missingInfo,
    );
    const clarificationMessage = normalizeAiQuoteClarificationMessage({
      message: validation.data.clarificationMessage,
      missingInfo,
    });

    const itemsNeedingReview = items.filter(
      (item) => !PRICED_REVIEW_STATUSES.has(item.reviewStatus),
    ).length;

    const draft: AiQuoteDraft = {
      title: truncate(validation.data.title, 160),
      notes: validation.data.notes?.trim()
        ? truncate(validation.data.notes, 4000)
        : null,
      items,
      missingInfo,
      clarificationMessage,
      pricingLibraryEntryId: knownEntryId,
      rationale: validation.data.rationale?.trim()
        ? truncate(validation.data.rationale, 600)
        : null,
      model: response.model,
      provider: response.provider,
      itemsNeedingReview,
    };

    // Save draft to draft store
    if (input.inquiryId) {
      await saveDraft({
        businessId: input.businessId,
        userId: input.userId,
        entityId: input.inquiryId,
        entityType: "inquiry",
        taskType,
        content: draft as unknown as Record<string, unknown>,
        sourceDataTimestamp: inquiryContext?.inquiry.createdAt ?? new Date(),
      }).catch((draftError) => {
        console.warn("[quote-generator] Failed to save draft:", draftError);
      });
    }

    return { ok: true, draft };
  } catch (error) {
    const latencyMs = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : "AI provider error";

    // Log the failed invocation
    await logAiInvocation({
      userId: input.userId,
      businessId: input.businessId,
      taskType,
      model: "unknown",
      provider: "unknown",
      inputTokens: 0,
      outputTokens: 0,
      cacheHit: false,
      latencyMs,
      status: "error",
      errorMessage,
    }).catch((logError) => {
      console.warn("[quote-generator] Failed to log error:", logError);
    });

    console.error("Failed to generate quote draft.", error);

    return {
      ok: false,
      error:
        "The assistant could not generate a quote draft right now. Try again in a moment.",
    };
  }
}

// ---------------------------------------------------------------------------
// Quote Improvement
// ---------------------------------------------------------------------------

type GenerateQuoteImprovementInput = {
  businessId: string;
  userId: string;
  inquiryId: string;
  existingQuoteDraft: string;
};

type GenerateQuoteImprovementResult =
  | { ok: true; draft: AiQuoteDraft }
  | { ok: false; error: string };

export async function generateQuoteImprovementForBusiness(
  input: GenerateQuoteImprovementInput,
): Promise<GenerateQuoteImprovementResult> {
  const [businessRow] = await db
    .select({
      id: businesses.id,
      name: businesses.name,
      slug: businesses.slug,
      businessType: businesses.businessType,
      shortDescription: businesses.shortDescription,
      defaultCurrency: businesses.defaultCurrency,
      defaultQuoteNotes: businesses.defaultQuoteNotes,
      aiTonePreference: businesses.aiTonePreference,
    })
    .from(businesses)
    .where(eq(businesses.id, input.businessId))
    .limit(1);

  if (!businessRow) {
    return {
      ok: false,
      error: "That business could not be found.",
    };
  }

  // --- AI Input Sanitization ---
  // The existingQuoteDraft is user-provided content that goes into the AI prompt.
  if (input.existingQuoteDraft.trim()) {
    const sanitization = sanitizeAiInput(input.existingQuoteDraft);

    if (sanitization.status === "rejected") {
      logAiSecurityEvent({
        eventType: "injection_rejected",
        patternMatched: sanitization.patterns.join(", "),
        userId: input.userId,
        businessId: input.businessId,
        rawInput: input.existingQuoteDraft,
      });
      return {
        ok: false,
        error: "Your input could not be processed. Please rephrase your request.",
      };
    }

    if (sanitization.status === "sanitized") {
      logAiSecurityEvent({
        eventType: "injection_detected",
        patternMatched: sanitization.patterns.join(", "),
        userId: input.userId,
        businessId: input.businessId,
        rawInput: input.existingQuoteDraft,
      });
      input = { ...input, existingQuoteDraft: sanitization.output };
    }
  }

  const currency = businessRow.defaultCurrency;

  // Fetch inquiry context
  const inquiryContext = await getInquiryAssistantContextForBusiness({
    businessId: input.businessId,
    inquiryId: input.inquiryId,
  });

  if (!inquiryContext) {
    return {
      ok: false,
      error: "That linked inquiry could not be found.",
    };
  }

  // Assemble the inquiry text for pricing retrieval
  const inquiryText = [
    inquiryContext.inquiry.subject ?? "",
    inquiryContext.inquiry.details ?? "",
    inquiryContext.inquiry.serviceCategory ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  // Use pricing retriever to get only relevant pricing blocks (Requirement 3.1)
  const [pricingResult, memory, relevantContext] = await Promise.all([
    retrieveRelevantPricing({
      inquiryText,
      businessId: input.businessId,
      currency,
    }),
    buildBusinessMemoryContext(input.businessId),
    retrieveRelevantContext({
      businessId: input.businessId,
      searchText: inquiryText,
      currency,
      excludeInquiryId: input.inquiryId,
    }),
  ]);

  const pricingLibrary = pricingResult.entries;

  const pricingLibraryIds = new Set(pricingLibrary.map((entry) => entry.id));
  const pastQuoteIds = new Set(
    (inquiryContext.relatedQuotes ?? []).map((quote) => quote.id),
  );
  const libraryNameById = new Map(
    pricingLibrary.map((entry) => [entry.id, entry.name]),
  );
  const libraryIdsByName = new Map(
    pricingLibrary.map((entry) => [entry.name.toLowerCase(), entry.id]),
  );
  const libraryEntryById = new Map(
    pricingLibrary.map((entry) => [entry.id, entry]),
  );
  const libraryEntryByName = new Map(
    pricingLibrary.map((entry) => [entry.name.toLowerCase(), entry]),
  );
  const quoteLabelById = new Map(
    (inquiryContext.relatedQuotes ?? []).map((quote) => [
      quote.id,
      quote.quoteNumber || quote.title,
    ]),
  );

  // Format pricing blocks as a string for context
  const pricingBlocksText = formatPricingLibrary(pricingLibrary, currency);

  // Format business memory summary (≤500 chars as per Requirement 2.3)
  const businessMemorySummaryText = truncate(formatMemoryLines(memory), 500);

  // Format inquiry text for context (include relevant past data if found)
  let inquiryContextText = formatInquiryContextLines(inquiryContext, currency);

  // Append relevant past inquiries/quotes from the database
  if (relevantContext.hasResults) {
    const pastDataLines: string[] = [];
    if (relevantContext.pastInquiries) {
      pastDataLines.push(`\nRelevant past inquiries from this business:\n${relevantContext.pastInquiries}`);
    }
    if (relevantContext.pastQuotes) {
      pastDataLines.push(`\nRelevant past quotes from this business:\n${relevantContext.pastQuotes}`);
    }
    if (pastDataLines.length > 0) {
      inquiryContextText += pastDataLines.join("\n");
    }
  }

  // Build context via context builder to enforce character budget (Requirement 2.2, 2.4)
  const taskType = "quote_improvement" as const;
  const contextResult = buildTaskContext({
    taskType,
    availableData: {
      inquiryText: inquiryContextText || null,
      customerName: inquiryContext.inquiry.customerName ?? null,
      customerEmail: inquiryContext.inquiry.customerEmail ?? null,
      pricingBlocks: pricingBlocksText,
      tonePreference: businessRow.aiTonePreference,
      businessMemorySummary: businessMemorySummaryText,
      existingQuoteDraft: input.existingQuoteDraft,
    },
  });

  // Use the prompt template to build the system prompt
  const systemInstructions = buildQuoteImprovementPrompt(contextResult.assembledContext);

  const userMessage = [
    "Improve the existing quote draft based on the context above.",
    "Remember: only price items that match approved pricing sources. Mark everything else as needs_review or no_pricing_found with unitPriceInCents = 0.",
  ].join("\n");

  const taskConfig = getTaskConfig(taskType);
  const promptVersionHash = hashPromptVersion(systemInstructions);

  const completionRequest: AiCompletionRequest = {
    model: "",
    messages: [
      { role: "system", content: systemInstructions },
      { role: "user", content: userMessage },
    ],
    temperature: taskConfig.temperature,
    maxOutputTokens: taskConfig.maxOutputTokens,
    qualityTier: taskConfig.qualityTier as AiQualityTier,
  };

  // Build source data versions for cache key
  const sourceDataVersions: Record<string, string | null> = {
    inquiry: inquiryContext.inquiry.createdAt.toISOString(),
    pricingLibrary: pricingLibrary.length > 0
      ? pricingLibrary.map((e) => e.id).sort().join(",")
      : null,
    existingDraft: input.existingQuoteDraft.slice(0, 64),
  };

  // Check cache
  const cacheKey: CacheKeyComponents = {
    businessId: input.businessId,
    userId: input.userId,
    taskType,
    promptVersion: promptVersionHash,
    modelTier: taskConfig.qualityTier as AiQualityTier,
    sourceDataVersions,
  };

  const cachedOutput = await getCachedOutput(cacheKey);

  if (cachedOutput) {
    const cacheStartTime = Date.now();

    await logAiInvocation({
      userId: input.userId,
      businessId: input.businessId,
      taskType,
      model: cachedOutput.model,
      provider: cachedOutput.provider,
      inputTokens: 0,
      outputTokens: 0,
      cacheHit: true,
      latencyMs: Date.now() - cacheStartTime,
      status: "success",
    }).catch((logError) => {
      console.warn("[quote-generator] Failed to log cache hit:", logError);
    });

    const cachedJson = extractJsonObject(cachedOutput.text);
    if (cachedJson) {
      try {
        const cachedParsed = JSON.parse(cachedJson);
        const cachedValidation = quoteDraftResponseSchema.safeParse(cachedParsed);
        if (cachedValidation.success) {
          const cachedItems = expandPackageItems(
            cachedValidation.data.items
              .map((item) =>
                normaliseDraftItem(item, {
                  pricingLibraryIds,
                  pastQuoteIds,
                  libraryNameById,
                  libraryIdsByName,
                  quoteLabelById,
                  hasMemory: memory.memories.length > 0,
                }),
              )
              .filter((item) => item.description.length > 0),
            { libraryEntryById, libraryEntryByName },
          ).slice(0, MAX_DRAFT_ITEMS);

          if (cachedItems.length > 0) {
            const cachedMissingInfo = normalizeAiQuoteMissingInfo(cachedValidation.data.missingInfo);
            const cachedClarification = normalizeAiQuoteClarificationMessage({
              message: cachedValidation.data.clarificationMessage,
              missingInfo: cachedMissingInfo,
            });

            const cachedDraft: AiQuoteDraft = {
              title: truncate(cachedValidation.data.title, 160),
              notes: cachedValidation.data.notes?.trim()
                ? truncate(cachedValidation.data.notes, 4000)
                : null,
              items: cachedItems,
              missingInfo: cachedMissingInfo,
              clarificationMessage: cachedClarification,
              pricingLibraryEntryId: cachedValidation.data.pricingLibraryEntryId
                ? pricingLibrary.find(
                    (entry) => entry.id === cachedValidation.data.pricingLibraryEntryId && entry.currency === currency,
                  )?.id ?? null
                : null,
              rationale: cachedValidation.data.rationale?.trim()
                ? truncate(cachedValidation.data.rationale, 600)
                : null,
              model: cachedOutput.model,
              provider: cachedOutput.provider as AiProviderName,
              itemsNeedingReview: cachedItems.filter(
                (item) => !PRICED_REVIEW_STATUSES.has(item.reviewStatus),
              ).length,
            };

            return { ok: true, draft: cachedDraft };
          }
        }
      } catch {
        // Cached data is corrupt — fall through to fresh generation
      }
    }
  }

  // Cache miss: invoke AI
  const startTime = Date.now();

  try {
    const response = await generateWithFallback(completionRequest);
    const latencyMs = Date.now() - startTime;
    const inputTokens = response.usage?.promptTokens ?? 0;
    const outputTokens = response.usage?.completionTokens ?? 0;

    // --- AI Output Filtering ---
    const outputFilterResult = filterAiOutput(response.text, [
      "quote improvement",
      "approved pricing sources",
      "needs_review",
      "no_pricing_found",
      "unitPriceInCents",
    ]);
    if (outputFilterResult.status === "redacted") {
      logAiSecurityEvent({
        eventType: "output_redacted",
        patternMatched: outputFilterResult.redactedPatterns.join(", "),
        userId: input.userId,
        businessId: input.businessId,
        rawInput: response.text.slice(0, 200),
      });
    }
    const filteredResponseText = outputFilterResult.output;

    const rawJson = extractJsonObject(filteredResponseText);

    if (!rawJson) {
      return {
        ok: false,
        error: "The assistant did not return a valid improved draft. Try again.",
      };
    }

    const parsedJson = parseJsonSafe(rawJson);
    if (parsedJson === null) {
      return {
        ok: false,
        error: "The assistant returned malformed draft data. Try again.",
      };
    }

    const validation = quoteDraftResponseSchema.safeParse(parsedJson);

    if (!validation.success) {
      return {
        ok: false,
        error: "The assistant returned an incomplete draft. Try again.",
      };
    }

    const items = expandPackageItems(
      validation.data.items
        .map((item) =>
          normaliseDraftItem(item, {
                  pricingLibraryIds,
                  pastQuoteIds,
                  libraryNameById,
                  libraryIdsByName,
                  quoteLabelById,
                  hasMemory: memory.memories.length > 0,
                }),
        )
        .filter((item) => item.description.length > 0),
      { libraryEntryById, libraryEntryByName },
    ).slice(0, MAX_DRAFT_ITEMS);

    if (!items.length) {
      return {
        ok: false,
        error: "The assistant returned no usable line items. Try again.",
      };
    }

    // Cache the raw AI output
    if (taskConfig.cacheTTL > 0) {
      const cachedResult: CachedAiOutput = {
        text: response.text,
        model: response.model,
        provider: response.provider,
        createdAt: new Date().toISOString(),
        usage: response.usage,
      };

      await setCachedOutput(cacheKey, cachedResult, taskConfig.cacheTTL);
    }

    // Record usage and start cooldown
    const weight = TASK_WEIGHTS[taskType];
    await recordUsage(input.userId, input.businessId, taskType, weight);
    startCooldown(input.userId, taskType);

    // Log tokens
    await logAiInvocation({
      userId: input.userId,
      businessId: input.businessId,
      taskType,
      model: response.model,
      provider: response.provider,
      inputTokens,
      outputTokens,
      cacheHit: false,
      latencyMs,
      status: "success",
    }).catch((logError) => {
      console.warn("[quote-generator] Failed to log invocation:", logError);
    });

    const libraryEntryId = validation.data.pricingLibraryEntryId;
    const knownEntryId = libraryEntryId
      ? pricingLibrary.find(
          (entry) => entry.id === libraryEntryId && entry.currency === currency,
        )?.id ?? null
      : null;
    const missingInfo = normalizeAiQuoteMissingInfo(
      validation.data.missingInfo,
    );
    const clarificationMessage = normalizeAiQuoteClarificationMessage({
      message: validation.data.clarificationMessage,
      missingInfo,
    });

    const itemsNeedingReview = items.filter(
      (item) => !PRICED_REVIEW_STATUSES.has(item.reviewStatus),
    ).length;

    const draft: AiQuoteDraft = {
      title: truncate(validation.data.title, 160),
      notes: validation.data.notes?.trim()
        ? truncate(validation.data.notes, 4000)
        : null,
      items,
      missingInfo,
      clarificationMessage,
      pricingLibraryEntryId: knownEntryId,
      rationale: validation.data.rationale?.trim()
        ? truncate(validation.data.rationale, 600)
        : null,
      model: response.model,
      provider: response.provider,
      itemsNeedingReview,
    };

    // Save draft to draft store
    await saveDraft({
      businessId: input.businessId,
      userId: input.userId,
      entityId: input.inquiryId,
      entityType: "inquiry",
      taskType,
      content: draft as unknown as Record<string, unknown>,
      sourceDataTimestamp: inquiryContext.inquiry.createdAt,
    }).catch((draftError) => {
      console.warn("[quote-generator] Failed to save draft:", draftError);
    });

    return { ok: true, draft };
  } catch (error) {
    const latencyMs = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : "AI provider error";

    await logAiInvocation({
      userId: input.userId,
      businessId: input.businessId,
      taskType,
      model: "unknown",
      provider: "unknown",
      inputTokens: 0,
      outputTokens: 0,
      cacheHit: false,
      latencyMs,
      status: "error",
      errorMessage,
    }).catch((logError) => {
      console.warn("[quote-generator] Failed to log error:", logError);
    });

    console.error("Failed to generate quote improvement.", error);

    return {
      ok: false,
      error:
        "The assistant could not improve the quote draft right now. Try again in a moment.",
    };
  }
}
