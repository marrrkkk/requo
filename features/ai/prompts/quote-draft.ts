/**
 * Prompt template for the quote_draft task.
 *
 * Complex task — structured output, system prompt ≤1600 tokens.
 * Context fields: inquiryText, customerName, customerEmail, pricingBlocks,
 *                 businessMemorySummary
 */
export function buildQuoteDraftPrompt(
  context: Record<string, string>,
): string {
  const isRevision = Boolean(context.revisionContext);

  const lines = [
    isRevision
      ? "Revise an existing quote based on the customer's feedback below."
      : "Generate a quote draft for the customer inquiry below.",
    "Use a professional tone. All prices in cents (integer). No currency symbols.",
    "",
    "PRICING RULES (CRITICAL — READ CAREFULLY):",
    "- ALWAYS check the \"Approved pricing blocks\" section below FIRST before creating any line item.",
    "- If a service or item closely matches an entry in the pricing library (even partial name match or related service), USE that entry's exact price. Set reviewStatus to \"matched\" and pricingSource to the appropriate library type.",
    "- Only include unitPriceInCents > 0 when taken directly from the provided pricing blocks, past quotes, or business memory.",
    "- If no approved pricing exists for an item and no close match is found, set unitPriceInCents to 0 and reviewStatus to \"needs_review\". Do NOT hallucinate or invent prices.",
    "- Never interpolate, extrapolate, or calculate new prices from existing ones (e.g. do NOT double a half-day rate to get a full-day rate).",
    "- Prefer using existing pricing library entries over inventing new line item descriptions. If the customer asks for something covered by an existing block/package, use that block/package.",
    "- For entries marked (package): list EACH line item from the package as a SEPARATE item in the items array. Use the exact unitPriceInCents and quantity from each package line item. Set pricingSource to \"pricing_library_package\" and pricingSourceLabel to the package name. Do NOT create a single summary row for the whole package.",
    "- For entries marked (block): use the block's price directly. Set pricingSource to \"pricing_library_block\" and pricingSourceLabel to the block name.",
    "",
  ];

  if (isRevision) {
    lines.push(
      "REVISION RULES (HIGHEST PRIORITY):",
      "- You are modifying an EXISTING quote. The current line items are listed below.",
      "- Output ALL current items with their original descriptions, prices, and quantities — unless the customer asked to change them.",
      "- To fulfill the customer's request, CHANGE the quantity/price of the specific item mentioned.",
      "- Do NOT output package names (like \"Starter package\"). Output EACH individual line item separately (e.g. \"Discovery and creative direction\", \"Design production\", \"Revision round\").",
      "- Do NOT add new items that duplicate existing items. If an item already exists in current items, just adjust its quantity.",
      "- Example: if current items has \"Revision round (qty: 1, unit price: $450.00)\" and customer says \"add 3 more revision round\", output \"Revision round\" with quantity=4 and unitPriceInCents=45000.",
      "",
      "CUSTOMER REVISION REQUEST:",
      context.revisionContext ?? "",
      "",
      "CURRENT QUOTE LINE ITEMS (output these with modifications):",
      context.currentItems ?? "None.",
      "",
    );
  }

  lines.push(
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
  );

  return lines.filter(Boolean).join("\n");
}
