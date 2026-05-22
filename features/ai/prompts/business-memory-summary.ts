/**
 * Prompt template for the business_memory_summary task.
 *
 * Complex task — JSON-only output, system prompt ≤1600 tokens.
 * Context fields: memoryEntries, businessName, businessType
 */
export function buildBusinessMemorySummaryPrompt(
  context: Record<string, string>,
): string {
  const lines = [
    "Summarize the business memory entries below into a structured overview.",
    "Extract key business rules, pricing patterns, service constraints, and operational preferences.",
    "Group related entries and resolve contradictions by preferring the most recent information.",
    "",
    "Output JSON matching this shape exactly:",
    `{`,
    `  "summary": "string (2-4 sentence overview of the business's key rules and preferences)",`,
    `  "pricingRules": ["string (each pricing rule or pattern, e.g. 'Standard hourly rate: $150/hr')"],`,
    `  "serviceConstraints": ["string (each constraint, e.g. 'Minimum 2-week lead time')"],`,
    `  "toneAndStyle": "string (communication style preferences, or 'Not specified')",`,
    `  "keyFacts": ["string (other important business facts not covered above)"]`,
    `}`,
    "",
    "Rules:",
    "- Keep each array to 10 items maximum. Prioritize by relevance to quoting.",
    "- Use the exact values from memory entries. Do not invent rules or prices.",
    "- If no entries exist for a category, return an empty array.",
    "",
    "Do not wrap in markdown. Return JSON only.",
    "",
    `Business: ${context.businessName ?? "Unknown"}`,
    `Type: ${context.businessType ?? "General services"}`,
    "",
    "Memory entries:",
    context.memoryEntries ?? "None available.",
  ];

  return lines.join("\n");
}
