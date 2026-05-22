/**
 * Prompt template for the inquiry_summary task.
 *
 * Simple task — JSON-only output, system prompt ≤800 tokens.
 * Context fields: inquiryDetails, customerName, serviceCategory
 */
export function buildInquirySummaryPrompt(
  context: Record<string, string>,
): string {
  const lines = [
    "Summarize the customer inquiry below into a structured JSON object.",
    "Extract the key details: what the customer needs, any constraints (timeline, budget, location), and the primary service requested.",
    "",
    "Output JSON matching this shape exactly:",
    `{`,
    `  "summary": "string (1-2 sentence overview of what the customer needs)",`,
    `  "serviceRequested": "string (primary service or product category)",`,
    `  "constraints": ["string (each constraint: deadline, budget, location, quantity, etc.)"],`,
    `  "urgency": "low" | "medium" | "high",`,
    `  "actionNeeded": "string (next step for the business owner)"`,
    `}`,
    "",
    "Do not wrap in markdown. Return JSON only.",
    "",
    `Customer: ${context.customerName ?? "Unknown"}`,
    `Service category: ${context.serviceCategory ?? "General"}`,
    "",
    "Inquiry details:",
    context.inquiryDetails ?? "",
  ];

  return lines.join("\n");
}
