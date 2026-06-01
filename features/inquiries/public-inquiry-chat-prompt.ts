import "server-only";

import type {
  InquiryFormConfig,
  InquiryFormFieldDefinition,
} from "@/features/inquiries/form-config";
import {
  inquiryContactMethodLabels,
  type InquiryContactMethod,
} from "@/features/inquiries/form-config";

// ---------------------------------------------------------------------------
// Public Inquiry Chat — System Prompt Builder
//
// Generates the system prompt that instructs the AI to act as a friendly
// intake assistant for the business's inquiry form. The prompt encodes all
// the form field definitions so the AI knows exactly what data to collect.
// ---------------------------------------------------------------------------

type BuildConversationalPromptInput = {
  businessName: string;
  businessDescription: string | null;
  formConfig: InquiryFormConfig;
  openingMessage?: string;
  assistantName?: string;
};

function describeFieldType(field: InquiryFormFieldDefinition): string {
  if (field.kind === "system") {
    switch (field.key) {
      case "serviceCategory":
        return "text";
      case "requestedDeadline":
        return "date YYYY-MM-DD";
      case "budgetText":
        return "text";
      case "details":
        return "long text";
      case "attachment":
        return "skip";
    }
  }

  if (field.kind === "custom") {
    switch (field.fieldType) {
      case "short_text":
        return "text";
      case "long_text":
        return "long text";
      case "number":
        return "number";
      case "date":
        return "date YYYY-MM-DD";
      case "boolean":
        return "true/false";
      case "select":
        return `one of: ${(field.options ?? []).map((o) => o.label).join(", ")}`;
      case "multi_select":
        return `multi: ${(field.options ?? []).map((o) => o.label).join(", ")}`;
    }
  }

  return "text";
}

function describeContactMethods(): string {
  return (Object.entries(inquiryContactMethodLabels) as [InquiryContactMethod, string][])
    .map(([key]) => key)
    .join("|");
}

function describeFormFields(config: InquiryFormConfig): string {
  const lines: string[] = [];

  lines.push("Contact (required): customerName (text), customerContactMethod (" + describeContactMethods() + "), customerContactHandle (text)");

  const projectFields = config.projectFields.filter(
    (f) => !(f.kind === "system" && f.key === "attachment"),
  );

  if (projectFields.length > 0) {
    lines.push("Project fields:");

    for (const field of projectFields) {
      if (field.kind === "system" && !field.enabled) {
        continue;
      }

      const id = field.kind === "system" ? field.key : field.id;
      const req = field.required ? "req" : "opt";
      const typeDesc = describeFieldType(field);

      lines.push(`  ${id}: ${field.label} — ${typeDesc} (${req})`);
    }
  }

  return lines.join("\n");
}

export function buildConversationalSystemPrompt({
  businessName,
  businessDescription,
  formConfig,
  openingMessage,
  assistantName,
}: BuildConversationalPromptInput): string {
  const fieldSpec = describeFormFields(formConfig);
  const businessContext = businessDescription
    ? `${businessName} — ${businessDescription}`
    : businessName;
  const displayName = assistantName || `${businessName} Assistant`;

  return `You are ${displayName}, intake assistant for ${businessContext}. Collect inquiry info through brief, natural conversation.

## Identity
- You are "${displayName}". Never use a human name.
${openingMessage ? `- Opening: "${openingMessage}"` : `- Greet briefly for ${businessName}, ask what they need.`}

## Fields
${fieldSpec}

## Flow
1. Greet (one sentence). Ask what they need.
2. They state their need → you have serviceCategory + partial details. Ask NAME.
3. After name → ask contact method and handle together.
4. You now have all required data. Write "details" yourself (1-3 sentences combining what they said). Present short confirmation, ask "Does this look correct?"
5. After confirm → call submit_inquiry with all data.

## Rules
- "details" is YOUR job. Combine their words into 1-3 sentences. Never ask them to write it.
- Once you have name + contact + need → go to confirmation. No extra questions.
- Max 2 sentences per message. Never repeat a question.
- Never ask for deliverables/brief/goals/audience unless explicitly required in fields above.
- Short answers are fine. Use what you have.
- Optional fields (deadline, budget): ask once after confirmation. Skip if no answer.
- Pricing questions: "${businessName} will review your inquiry and follow up."
- Max 5 exchanges before confirmation.

## submit_inquiry
Call only after customer confirms. Provide: customerName, customerContactMethod, customerContactHandle, serviceCategory, details (you write this). Optional: requestedDeadline, budgetText, customFields if given.`;
}
