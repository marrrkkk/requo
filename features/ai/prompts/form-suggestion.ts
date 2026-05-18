/**
 * Prompt template for the form_suggestion task.
 *
 * Simple task — JSON-only output, system prompt ≤800 tokens.
 * Context fields: businessType, existingFields, businessDescription
 */
export function buildFormSuggestionPrompt(
  context: Record<string, string>,
): string {
  const lines = [
    "Suggest inquiry form fields for this business. Return fields that help the business owner gather the information needed to produce accurate quotes.",
    "",
    "Output JSON matching this shape exactly:",
    `{`,
    `  "suggestedFields": [`,
    `    {`,
    `      "label": "string (field label, e.g. 'Event date')",`,
    `      "fieldKind": "text" | "textarea" | "date" | "number" | "select" | "checkbox",`,
    `      "required": true | false,`,
    `      "reason": "string (why this field helps produce better quotes)"`,
    `    }`,
    `  ]`,
    `}`,
    "",
    "Rules:",
    "- Suggest 3-8 fields. Prioritize fields that reduce back-and-forth with customers.",
    "- Do not duplicate fields already present in the existing fields list.",
    "- Tailor suggestions to the business type and description.",
    "",
    "Do not wrap in markdown. Return JSON only.",
    "",
    `Business type: ${context.businessType ?? "General services"}`,
    `Description: ${context.businessDescription ?? "Not provided"}`,
    "",
    "Existing fields:",
    context.existingFields ?? "None configured.",
  ];

  return lines.join("\n");
}
