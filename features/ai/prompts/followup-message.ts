/**
 * Prompt template for the followup_message task.
 *
 * Simple task — text output, system prompt ≤800 tokens.
 * Context fields: inquiryText, customerName, followUpReason
 */
export function buildFollowupMessagePrompt(
  context: Record<string, string>,
): string {
  const lines = [
    "Write a short follow-up message to the customer. Use a professional tone.",
    "Keep it under 3 paragraphs. Be direct and action-oriented.",
    "Do not include subject lines, greetings like \"Dear\", or sign-offs like \"Best regards\".",
    "The message should reference the original inquiry context and clearly state the follow-up purpose.",
    "",
    `Customer: ${context.customerName ?? "Unknown"}`,
    `Follow-up reason: ${context.followUpReason ?? "General check-in"}`,
    "",
    "Original inquiry:",
    context.inquiryText ?? "",
  ];

  return lines.join("\n");
}
