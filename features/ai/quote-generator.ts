import "server-only";

import { z } from "zod";

import { getInquiryAssistantContextForBusiness } from "@/features/ai/queries";
import type {
  AiQuoteDraft,
  AiQuoteDraftItem,
  InquiryAssistantContext,
} from "@/features/ai/types";
import { buildBusinessMemoryContext } from "@/features/memory/queries";
import { getQuoteLibraryForBusiness } from "@/features/quotes/quote-library-queries";
import type { DashboardQuoteLibraryEntry } from "@/features/quotes/types";
import { formatQuoteMoney } from "@/features/quotes/utils";
import { db } from "@/lib/db/client";
import { businesses } from "@/lib/db/schema";
import { generateWithFallback } from "@/lib/ai";
import type { AiCompletionRequest } from "@/lib/ai";
import { eq } from "drizzle-orm";

const MAX_DRAFT_ITEMS = 30;
const MAX_UNIT_PRICE_CENTS = 100_000_000; // $1,000,000 cap per line.
const MAX_QUANTITY = 999_999;

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
        description: z.string().trim().min(1).max(400),
        quantity: z.coerce.number().finite().positive(),
        unitPriceInCents: z.coerce.number().finite().nonnegative(),
      }),
    )
    .min(1)
    .max(MAX_DRAFT_ITEMS),
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

function formatPricingLibrary(entries: DashboardQuoteLibraryEntry[], currency: string) {
  const matchingEntries = entries.filter(
    (entry) => entry.currency === currency,
  );

  if (!matchingEntries.length) {
    return "- No saved pricing entries for this currency.";
  }

  return matchingEntries
    .map((entry) => {
      const itemLines = entry.items.length
        ? entry.items
            .map(
              (item) =>
                `  - ${item.description}; quantity ${item.quantity}; unit ${formatQuoteMoney(
                  item.unitPriceInCents,
                  currency,
                )}`,
            )
            .join("\n")
        : "  - (no line items)";

      return [
        `- Entry id ${entry.id}; kind ${entry.kind}; name "${entry.name}"`,
        entry.description
          ? `  Description: ${truncate(entry.description, 300)}`
          : null,
        itemLines,
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n");
}

function formatInquiryContextLines(context: InquiryAssistantContext) {
  return [
    "Linked inquiry",
    `- Customer: ${context.inquiry.customerName}`,
    `- Email: ${context.inquiry.customerEmail ?? "Not provided"}`,
    `- Category: ${context.inquiry.serviceCategory}`,
    `- Subject: ${context.inquiry.subject ?? "Not provided"}`,
    `- Status: ${context.inquiry.status}`,
    `- Deadline: ${context.inquiry.requestedDeadline ?? "Not provided"}`,
    `- Budget hint: ${context.inquiry.budgetText ?? "Not provided"}`,
    "",
    "Customer details",
    truncate(context.inquiry.details, 2500),
    context.notes.length
      ? `\nInternal notes\n${context.notes
          .slice(0, 6)
          .map((note) => `- ${truncate(note.body, 260)}`)
          .join("\n")}`
      : "",
    context.relatedQuotes.length
      ? `\nPast quotes for this inquiry\n${context.relatedQuotes
          .slice(0, 3)
          .map(
            (quote) =>
              `- ${quote.quoteNumber} ${quote.title} total ${formatQuoteMoney(quote.totalInCents, quote.currency)}`,
          )
          .join("\n")}`
      : "",
  ]
    .filter((value): value is string => Boolean(value))
    .join("\n");
}

function extractJsonObject(text: string): string | null {
  const trimmed = text.trim();

  if (!trimmed) return null;

  // Strip markdown code fences if present.
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenceMatch ? fenceMatch[1].trim() : trimmed;

  if (candidate.startsWith("{") && candidate.endsWith("}")) {
    return candidate;
  }

  // Try to locate the first JSON object.
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");

  if (start >= 0 && end > start) {
    return candidate.slice(start, end + 1);
  }

  return null;
}

function clampItem(item: {
  description: string;
  quantity: number;
  unitPriceInCents: number;
}): AiQuoteDraftItem {
  return {
    description: truncate(item.description, 400),
    quantity: Math.min(
      MAX_QUANTITY,
      Math.max(1, Math.trunc(item.quantity)),
    ),
    unitPriceInCents: Math.min(
      MAX_UNIT_PRICE_CENTS,
      Math.max(0, Math.round(item.unitPriceInCents)),
    ),
  };
}

type GenerateQuoteDraftInput = {
  businessId: string;
  inquiryId?: string | null;
  brief?: string | null;
};

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

  const currency = businessRow.defaultCurrency;
  const [memory, pricingLibrary, inquiryContext] = await Promise.all([
    buildBusinessMemoryContext(input.businessId),
    getQuoteLibraryForBusiness(input.businessId),
    input.inquiryId
      ? getInquiryAssistantContextForBusiness({
          businessId: input.businessId,
          inquiryId: input.inquiryId,
        })
      : Promise.resolve(null),
  ]);

  if (input.inquiryId && !inquiryContext) {
    return {
      ok: false,
      error: "That linked inquiry could not be found.",
    };
  }

  const contextText = [
    "Business profile",
    `- Name: ${businessRow.name}`,
    `- Slug: /${businessRow.slug}`,
    `- Type: ${businessRow.businessType}`,
    `- Description: ${businessRow.shortDescription ?? "Not set"}`,
    `- Default currency: ${currency}`,
    `- Preferred tone: ${businessRow.aiTonePreference}`,
    businessRow.defaultQuoteNotes
      ? `- Default quote notes: ${truncate(businessRow.defaultQuoteNotes, 800)}`
      : null,
    "",
    "Business knowledge",
    formatMemoryLines(memory),
    "",
    `Saved pricing library (currency ${currency})`,
    formatPricingLibrary(pricingLibrary, currency),
    inquiryContext ? "\n" + formatInquiryContextLines(inquiryContext) : "",
    input.brief?.trim()
      ? `\nOwner brief\n${truncate(input.brief, 2000)}`
      : "",
  ]
    .filter((value): value is string => Boolean(value))
    .join("\n");

  const systemInstructions = [
    "You are Requo's quote drafting assistant for an owner-led service business.",
    "Generate a complete quote draft using ONLY the provided business context.",
    `All prices are in ${currency} cents (integer). Do not include currency symbols.`,
    "Prefer line items copied or adapted from the saved pricing library when they match the scope.",
    "If nothing in the pricing library fits, propose reasonable line items that reflect the saved business knowledge.",
    "Never invent policies, turnaround times, or guarantees not present in the provided context.",
    "Keep notes concise and directly useful to the customer. Skip greetings or sign-offs.",
    "Do not include <think> or <thinking> blocks, explanations outside JSON, or markdown fences.",
    "Respond with a single JSON object matching this shape exactly:",
    `{
  "title": "string (2-160 chars)",
  "notes": "string or null (customer-facing notes, plain text)",
  "pricingLibraryEntryId": "string or null (id of the pricing library entry used, if any)",
  "rationale": "string or null (short internal rationale, <= 240 chars)",
  "items": [
    {
      "description": "string (<= 400 chars)",
      "quantity": integer >= 1,
      "unitPriceInCents": integer >= 0
    }
  ]
}`,
    "Do not wrap the JSON in markdown or prose. Return JSON only.",
  ].join("\n");

  const userMessage = [
    "Business and inquiry context is below. Generate the quote draft now.",
    "",
    contextText,
  ].join("\n");

  const completionRequest: AiCompletionRequest = {
    model: "",
    messages: [
      { role: "system", content: systemInstructions },
      { role: "user", content: userMessage },
    ],
    temperature: 0.1,
    maxOutputTokens: 2200,
    qualityTier: "balanced",
  };

  try {
    const response = await generateWithFallback(completionRequest);
    const rawJson = extractJsonObject(response.text);

    if (!rawJson) {
      return {
        ok: false,
        error: "The assistant did not return a valid draft. Try again.",
      };
    }

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(rawJson);
    } catch {
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

    const rawItems = validation.data.items.map(clampItem).filter(
      (item) => item.description.length > 0,
    );

    if (!rawItems.length) {
      return {
        ok: false,
        error: "The assistant returned no usable line items. Try again.",
      };
    }

    const libraryEntryId = validation.data.pricingLibraryEntryId;
    const knownEntryId = libraryEntryId
      ? pricingLibrary.find(
          (entry) => entry.id === libraryEntryId && entry.currency === currency,
        )?.id ?? null
      : null;

    const draft: AiQuoteDraft = {
      title: truncate(validation.data.title, 160),
      notes: validation.data.notes?.trim() ? truncate(validation.data.notes, 4000) : null,
      items: rawItems.slice(0, MAX_DRAFT_ITEMS),
      pricingLibraryEntryId: knownEntryId,
      rationale: validation.data.rationale?.trim()
        ? truncate(validation.data.rationale, 600)
        : null,
      model: response.model,
      provider: response.provider,
    };

    return { ok: true, draft };
  } catch (error) {
    console.error("Failed to generate quote draft.", error);

    return {
      ok: false,
      error:
        "The assistant could not generate a quote draft right now. Try again in a moment.",
    };
  }
}
