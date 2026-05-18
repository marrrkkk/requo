/**
 * Prompt template for the quote_draft task.
 *
 * Complex task — structured output, system prompt ≤1600 tokens.
 * Context fields: inquiryText, customerName, customerEmail, pricingBlocks,
 *                 tonePreference, businessMemorySummary
 */
export function buildQuoteDraftPrompt(
  context: Record<string, string>,
): string {
  const tone = context.tonePreference ?? "professional";

  const lines = [
    "Generate a quote draft for the customer inquiry below.",
    `Use a ${tone} tone. All prices in cents (integer). No currency symbols.`,
    "",
    "PRICING RULES:",
    "- Only include unitPriceInCents > 0 when taken directly from the provided pricing blocks or business memory.",
    "- If no approved pricing exists for an item, set unitPriceInCents to 0 and reviewStatus to \"needs_review\".",
    "- Never invent, interpolate, or guess prices.",
    "- For entries marked (package): list EACH line item from the package as a SEPARATE item in the items array. Use the exact unitPriceInCents and quantity from each package line item. Set pricingSource to \"pricing_library_package\" and pricingSourceLabel to the package name. Do NOT create a single summary row for the whole package.",
    "- For entries marked (block): use the block's price directly. Set pricingSource to \"pricing_library_block\" and pricingSourceLabel to the block name.",
    "",
    "Output JSON matching this shape:",
    `{`,
    `  "title": "string (2-160 chars, quote title)",`,
    `  "notes": "string or null (customer-facing notes)",`,
    `  "rationale": "string or null (internal rationale, ≤240 chars)",`,
    `  "items": [`,
    `    {`,
    `      "name": "string (≤120 chars)",`,
    `      "description": "string (≤400 chars)",`,
    `      "quantity": "integer ≥ 1",`,
    `      "unitPriceInCents": "integer ≥ 0",`,
    `      "pricingSource": "pricing_library_block" | "pricing_library_package" | "past_quote" | "business_memory" | "owner_brief" | "none",`,
    `      "pricingSourceLabel": "string or null",`,
    `      "confidence": "high" | "medium" | "low",`,
    `      "reviewStatus": "matched" | "calculated" | "needs_review" | "no_pricing_found",`,
    `      "reason": "string (why this item was added, where price came from)"`,
    `    }`,
    `  ],`,
    `  "missingInfo": [{ "label": "string", "question": "string" }],`,
    `  "clarificationMessage": "string or null"`,
    `}`,
    "",
    "Do not wrap in markdown. Return JSON only.",
    "",
    `Customer: ${context.customerName ?? "Unknown"}`,
    context.customerEmail ? `Email: ${context.customerEmail}` : "",
    "",
    "Inquiry:",
    context.inquiryText ?? "",
    "",
    "Approved pricing blocks:",
    context.pricingBlocks ?? "None available.",
    "",
    "Business memory:",
    context.businessMemorySummary ?? "None available.",
  ];

  return lines.filter(Boolean).join("\n");
}
