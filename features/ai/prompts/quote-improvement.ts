/**
 * Prompt template for the quote_improvement task.
 *
 * Complex task — structured output, system prompt ≤1600 tokens.
 * Context fields: inquiryText, customerName, customerEmail, pricingBlocks,
 *                 tonePreference, businessMemorySummary, existingQuoteDraft
 */
export function buildQuoteImprovementPrompt(
  context: Record<string, string>,
): string {
  const tone = context.tonePreference ?? "professional";

  const lines = [
    "Improve the existing quote draft below based on the inquiry context and approved pricing.",
    `Use a ${tone} tone. All prices in cents (integer). No currency symbols.`,
    "",
    "IMPROVEMENT GOALS:",
    "- Fix pricing errors: match items to approved pricing blocks where possible.",
    "- Improve descriptions: make them clearer and more customer-friendly.",
    "- Add missing items that the inquiry implies but the draft omits.",
    "- Remove irrelevant items not supported by the inquiry.",
    "- Improve structure and ordering for clarity.",
    "",
    "PRICING RULES:",
    "- Only include unitPriceInCents > 0 when taken directly from provided pricing blocks or business memory.",
    "- If no approved pricing exists, set unitPriceInCents to 0 and reviewStatus to \"needs_review\".",
    "- Never invent, interpolate, or guess prices.",
    "- For entries marked (package): list EACH line item from the package as a SEPARATE item in the items array. Use the exact unitPriceInCents and quantity from each package line item. Set pricingSource to \"pricing_library_package\" and pricingSourceLabel to the package name. Do NOT create a single summary row for the whole package.",
    "- For entries marked (block): use the block's price directly. Set pricingSource to \"pricing_library_block\" and pricingSourceLabel to the block name.",
    "",
    "Output JSON matching this shape:",
    `{`,
    `  "title": "string (2-160 chars)",`,
    `  "notes": "string or null (customer-facing notes)",`,
    `  "rationale": "string or null (what was improved and why, ≤240 chars)",`,
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
    `      "reason": "string"`,
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
    "Existing quote draft:",
    context.existingQuoteDraft ?? "None.",
    "",
    "Approved pricing blocks:",
    context.pricingBlocks ?? "None available.",
    "",
    "Business memory:",
    context.businessMemorySummary ?? "None available.",
  ];

  return lines.filter(Boolean).join("\n");
}
