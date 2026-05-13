import "server-only";

import { GoogleGenAI } from "@google/genai";

import { env, isGeminiConfigured } from "@/lib/env";
import type { ExtractedPayload } from "@/features/importer/extractors";
import type {
  ImporterDestination,
  ImporterKnowledgeItem,
  ImporterPricingEntry,
  ImporterPricingLineItem,
} from "@/features/importer/types";
import {
  importerMaxKnowledgeItems,
  importerMaxPricingEntries,
  importerMaxPricingItemsPerEntry,
} from "@/features/importer/types";

// ---------------------------------------------------------------------------
// File Importer → AI Extractor
//
// Uses Gemini directly (bypassing the shared router) because:
//   1. Extraction is a one-shot structured-output call — no streaming needed.
//   2. Gemini handles PDF input natively, so we don't need a PDF text parser.
//   3. Groq's TPM limits on Qwen cause failures on multi-page documents.
//
// We request JSON via `responseMimeType` rather than a full `responseSchema`
// because Gemini's schema constraint engine has a state-space cap that trips
// on nested arrays with maxItems (our pricing shape). The normalisers below
// are strict enough to handle any shape Gemini returns without schema help.
// ---------------------------------------------------------------------------

const GEMINI_TIMEOUT_MS = 30_000;

// "flash-lite" is cheap and accurate enough for extraction. We prefer the
// regular "flash" first for better table understanding and fall back to
// "flash-lite" if the first attempt fails.
const EXTRACTION_MODELS = ["gemini-2.5-flash", "gemini-2.5-flash-lite"] as const;

const KNOWLEDGE_JSON_SHAPE = `{
  "items": [
    { "title": "Short title", "content": "Knowledge content" }
  ],
  "warnings": ["Optional short warning strings"]
}`;

const PRICING_JSON_SHAPE = `{
  "entries": [
    {
      "kind": "block",
      "name": "Short name",
      "description": "Optional short description (may be omitted)",
      "items": [
        { "description": "Line item text", "quantity": 1, "unitPriceInCents": 4999 }
      ]
    }
  ],
  "warnings": ["Optional short warning strings"]
}`;

const KNOWLEDGE_INSTRUCTIONS = [
  "You extract saved business knowledge from an uploaded document.",
  "Return ONLY a JSON object matching this exact shape (no markdown fences, no prose):",
  KNOWLEDGE_JSON_SHAPE,
  "Each item has `title` (short, 3-8 words) and `content` (1-4 short paragraphs, under 800 chars).",
  "Split the document into logically distinct topics. One item per topic.",
  "Do not invent facts. If a section is ambiguous, skip it or note it in warnings.",
  "Ignore marketing boilerplate, page numbers, legal footers, and cover pages.",
  "Prefer owner-useful context: services, policies, pricing rules, scheduling, terms, FAQ answers.",
  "If the document contains no usable knowledge, return items: [] with a warning.",
  `Return at most ${importerMaxKnowledgeItems} items.`,
].join("\n");

const PRICING_INSTRUCTIONS = [
  "You extract pricing from an uploaded document into reusable library entries.",
  "Return ONLY a JSON object matching this exact shape (no markdown fences, no prose):",
  PRICING_JSON_SHAPE,
  "Each entry's `kind` must be either `block` (entry has exactly one line item) or `package` (entry has multiple line items).",
  "Each line item has: `description`, `quantity` (positive integer, default 1), `unitPriceInCents` (non-negative integer).",
  "Convert all prices to cents (e.g., $49.99 → 4999, $1,250 → 125000).",
  "Strip currency symbols, commas, and spaces from prices before converting.",
  "If a quantity is not specified, use 1.",
  "If a row is a discount, tax, or subtotal, skip it and add a warning.",
  "If prices appear in multiple currencies, add a warning and use the primary currency.",
  "If you cannot determine a price for a row, skip it and add a warning.",
  "Use `package` when multiple items are grouped (e.g., a service tier, a bundle).",
  "Use `block` for standalone pricing items (e.g., a single service with one price).",
  `Return at most ${importerMaxPricingEntries} entries, each with at most ${importerMaxPricingItemsPerEntry} items.`,
  "Do not invent prices. Skip rows where the price is unclear.",
].join("\n");

type ExtractionInput = {
  destination: ImporterDestination;
  payload: ExtractedPayload;
};

type KnowledgeResponse = {
  items?: Array<{ title?: unknown; content?: unknown }>;
  warnings?: unknown[];
};

type PricingResponse = {
  entries?: Array<{
    kind?: unknown;
    name?: unknown;
    description?: unknown;
    items?: Array<{
      description?: unknown;
      quantity?: unknown;
      unitPriceInCents?: unknown;
    }>;
  }>;
  warnings?: unknown[];
};

export type AiExtractionResult =
  | {
      ok: true;
      destination: "knowledge";
      items: ImporterKnowledgeItem[];
      warnings: string[];
    }
  | {
      ok: true;
      destination: "pricing";
      entries: ImporterPricingEntry[];
      warnings: string[];
    }
  | { ok: false; error: string };

function getClient(): GoogleGenAI | null {
  if (!isGeminiConfigured || !env.GEMINI_API_KEY) {
    return null;
  }

  return new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
}

function buildContents(payload: ExtractedPayload) {
  if (payload.kind === "pdf") {
    return [
      {
        role: "user" as const,
        parts: [
          {
            inlineData: {
              mimeType: "application/pdf",
              data: payload.base64,
            },
          },
          {
            text: `File name: ${payload.fileName}\nExtract structured data from this document as described by the system instructions.`,
          },
        ],
      },
    ];
  }

  return [
    {
      role: "user" as const,
      parts: [
        {
          text: `File name: ${payload.fileName}\n\nDocument content:\n${payload.text}`,
        },
      ],
    },
  ];
}

export async function aiExtractFromFile(
  input: ExtractionInput,
): Promise<AiExtractionResult> {
  const client = getClient();

  if (!client) {
    return {
      ok: false,
      error:
        "The AI importer is temporarily unavailable. Please try again later.",
    };
  }

  const systemInstruction =
    input.destination === "knowledge"
      ? KNOWLEDGE_INSTRUCTIONS
      : PRICING_INSTRUCTIONS;
  const contents = buildContents(input.payload);

  let lastError: unknown = null;

  for (const model of EXTRACTION_MODELS) {
    try {
      const response = await client.models.generateContent({
        model,
        contents,
        config: {
          systemInstruction,
          temperature: 0.1,
          responseMimeType: "application/json",
          abortSignal: AbortSignal.timeout(GEMINI_TIMEOUT_MS),
        },
      });

      const text = response.text ?? "";

      if (!text.trim()) {
        lastError = new Error("Empty response from AI extractor.");
        continue;
      }

      const parsed = tryParseJson(text);

      if (!parsed) {
        lastError = new Error("AI extractor returned non-JSON output.");
        continue;
      }

      if (input.destination === "knowledge") {
        return normaliseKnowledge(parsed as KnowledgeResponse);
      }

      return normalisePricing(parsed as PricingResponse);
    } catch (error) {
      lastError = error;
      console.warn(
        `[importer] Gemini extraction failed: model="${model}" message="${error instanceof Error ? error.message : String(error)}"`,
      );
    }
  }

  return {
    ok: false,
    error:
      lastError instanceof Error && lastError.message.toLowerCase().includes("timeout")
        ? "The document took too long to analyze. Try a smaller file."
        : "We couldn't analyze that file right now. Please try again in a moment.",
  };
}

function tryParseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    // Some models wrap JSON in ```json fences even when asked not to.
    const fenced = text.match(/```(?:json)?\s*([\s\S]+?)```/i);

    if (fenced) {
      try {
        return JSON.parse(fenced[1]);
      } catch {
        return null;
      }
    }

    return null;
  }
}

function toDraftId(prefix: string, index: number): string {
  return `${prefix}_${index}_${Math.random().toString(36).slice(2, 8)}`;
}

function normaliseKnowledge(
  parsed: KnowledgeResponse,
): AiExtractionResult {
  const rawItems = Array.isArray(parsed.items) ? parsed.items : [];
  const items: ImporterKnowledgeItem[] = [];
  let droppedForCap = 0;

  for (let i = 0; i < rawItems.length; i += 1) {
    const raw = rawItems[i];
    const title = typeof raw.title === "string" ? raw.title.trim() : "";
    const content = typeof raw.content === "string" ? raw.content.trim() : "";

    if (!title || !content) continue;

    if (items.length >= importerMaxKnowledgeItems) {
      droppedForCap += 1;
      continue;
    }

    items.push({
      draftId: toDraftId("k", i),
      title: title.slice(0, 200),
      content: content.slice(0, 4000),
    });
  }

  const warnings = extractWarnings(parsed.warnings);

  if (droppedForCap > 0) {
    warnings.unshift(
      `The file contained more content than we can import at once. ${droppedForCap} additional knowledge ${droppedForCap === 1 ? "item was" : "items were"} dropped. You can re-upload the remaining sections or add them manually.`,
    );
  }

  return {
    ok: true,
    destination: "knowledge",
    items,
    warnings,
  };
}

function normalisePricing(parsed: PricingResponse): AiExtractionResult {
  const rawEntries = Array.isArray(parsed.entries) ? parsed.entries : [];
  const entries: ImporterPricingEntry[] = [];
  let droppedEntriesForCap = 0;
  let droppedItemsForCap = 0;

  for (let i = 0; i < rawEntries.length; i += 1) {
    const raw = rawEntries[i];
    const kind = raw.kind === "block" || raw.kind === "package" ? raw.kind : "block";
    const name = typeof raw.name === "string" ? raw.name.trim() : "";
    const description =
      typeof raw.description === "string" ? raw.description.trim() : "";

    if (!name) continue;

    const rawItems = Array.isArray(raw.items) ? raw.items : [];
    const items: ImporterPricingLineItem[] = [];

    for (let j = 0; j < rawItems.length; j += 1) {
      const rawItem = rawItems[j];
      const itemDescription =
        typeof rawItem.description === "string" ? rawItem.description.trim() : "";

      if (!itemDescription) continue;

      if (items.length >= importerMaxPricingItemsPerEntry) {
        droppedItemsForCap += 1;
        continue;
      }

      const quantity = toPositiveInt(rawItem.quantity, 1);
      const unitPriceInCents = toNonNegativeInt(rawItem.unitPriceInCents, 0);

      items.push({
        draftId: toDraftId("p", j),
        description: itemDescription.slice(0, 400),
        quantity,
        unitPriceInCents,
      });
    }

    if (!items.length) continue;

    if (entries.length >= importerMaxPricingEntries) {
      droppedEntriesForCap += 1;
      continue;
    }

    const resolvedKind: "block" | "package" = items.length === 1 ? "block" : "package";

    entries.push({
      draftId: toDraftId("e", i),
      kind: kind === "package" && items.length === 1 ? "block" : resolvedKind,
      name: name.slice(0, 120),
      description: description.slice(0, 600),
      items,
    });
  }

  const warnings = extractWarnings(parsed.warnings);

  if (droppedEntriesForCap > 0) {
    warnings.unshift(
      `The file contained more entries than we can import at once. ${droppedEntriesForCap} additional pricing ${droppedEntriesForCap === 1 ? "entry was" : "entries were"} dropped. You can re-upload the remaining sections or add them manually.`,
    );
  }

  if (droppedItemsForCap > 0) {
    warnings.push(
      `Some entries had more line items than fit per entry. ${droppedItemsForCap} additional line ${droppedItemsForCap === 1 ? "item was" : "items were"} dropped.`,
    );
  }

  return {
    ok: true,
    destination: "pricing",
    entries,
    warnings,
  };
}

function extractWarnings(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];

  return raw
    .map((w) => (typeof w === "string" ? w.trim() : ""))
    .filter((w) => w.length > 0)
    .slice(0, 10);
}

function toPositiveInt(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    const rounded = Math.round(value);

    return rounded >= 1 ? Math.min(rounded, 100_000) : fallback;
  }

  if (typeof value === "string") {
    const parsed = Number.parseFloat(value.replace(/[^\d.-]/g, ""));

    if (Number.isFinite(parsed) && parsed >= 1) {
      return Math.min(Math.round(parsed), 100_000);
    }
  }

  return fallback;
}

function toNonNegativeInt(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    const rounded = Math.round(value);

    return rounded >= 0 ? Math.min(rounded, 100_000_000) : fallback;
  }

  if (typeof value === "string") {
    const cleaned = value.replace(/[^\d.-]/g, "");
    const parsed = Number.parseFloat(cleaned);

    if (Number.isFinite(parsed) && parsed >= 0) {
      return Math.min(Math.round(parsed), 100_000_000);
    }
  }

  return fallback;
}
