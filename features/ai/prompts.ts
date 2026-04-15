import type {
  AiAssistantIntent,
  InquiryAssistantContext,
} from "@/features/ai/types";
import { getAdditionalInquirySubmittedFields } from "@/features/inquiries/form-config";
import type { AiAssistantRequestInput } from "@/features/ai/schemas";
import { formatInquiryDateTime } from "@/features/inquiries/utils";

const replyLikeIntents = new Set<AiAssistantIntent>([
  "draft-first-reply",
  "rewrite-draft",
  "generate-follow-up-message",
]);

function truncateText(value: string, maxLength: number) {
  const normalized = value.replace(/\r\n?/g, "\n").trim();

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength).trimEnd()}...`;
}

function formatMemoryContext(context: InquiryAssistantContext["memory"]) {
  const memoryLines = context.memories.length
    ? context.memories
        .slice(0, 10)
        .map((m) => `- ${m.title}: ${truncateText(m.content, 800)}`)
        .join("\n")
    : "- No knowledge saved yet.";

  return [
    "Business Knowledge",
    memoryLines,
  ].join("\n");
}

function formatNotesContext(notes: InquiryAssistantContext["notes"]) {
  if (!notes.length) {
    return "- No internal notes yet.";
  }

  return notes
    .map(
      (note) =>
        `- ${note.authorName ?? "Business owner"} on ${formatInquiryDateTime(
          note.createdAt,
        )}: ${truncateText(note.body, 320)}`,
    )
    .join("\n");
}

function buildContextBlock(context: InquiryAssistantContext) {
  const additionalFields = getAdditionalInquirySubmittedFields(
    context.inquiry.submittedFieldSnapshot,
  );

  return [
    "Business settings",
    `- Business name: ${context.business.name}`,
    `- Business slug: ${context.business.slug}`,
    `- Business description: ${context.business.shortDescription ?? "Not set"}`,
    `- Contact email: ${context.business.contactEmail ?? "Not set"}`,
    `- Default currency: ${context.business.defaultCurrency}`,
    `- Preferred AI tone: ${context.business.aiTonePreference}`,
    `- Default email signature: ${context.business.defaultEmailSignature ?? "Not set"}`,
    `- Default quote notes: ${context.business.defaultQuoteNotes ?? "Not set"}`,
    `- Inquiry page headline: ${context.business.inquiryPageHeadline}`,
    `- Inquiry page template: ${context.business.inquiryPageTemplate}`,
    `- Public inquiry enabled: ${context.business.publicInquiryEnabled ? "Yes" : "No"}`,
    "",
    "Inquiry details",
    `- Inquiry ID: ${context.inquiry.id}`,
    `- Inquiry form: ${context.inquiry.inquiryFormName}`,
    `- Inquiry form slug: ${context.inquiry.inquiryFormSlug}`,
    `- Inquiry form business type: ${context.inquiry.inquiryFormBusinessType}`,
    `- Customer name: ${context.inquiry.customerName}`,
    `- Customer email: ${context.inquiry.customerEmail}`,
    `- Customer phone: ${context.inquiry.customerPhone ?? "Not provided"}`,
    `- Company name: ${context.inquiry.companyName ?? "Not provided"}`,
    `- Service category: ${context.inquiry.serviceCategory}`,
    `- Subject: ${context.inquiry.subject ?? "Not provided"}`,
    `- Requested deadline: ${context.inquiry.requestedDeadline ?? "Not provided"}`,
    `- Budget: ${context.inquiry.budgetText ?? "Not provided"}`,
    `- Status: ${context.inquiry.status}`,
    `- Source: ${context.inquiry.source ?? "Unknown"}`,
    `- Submitted at: ${formatInquiryDateTime(context.inquiry.submittedAt)}`,
    "",
    "Customer message",
    truncateText(context.inquiry.details, 3000),
    "",
    "Additional submitted fields",
    additionalFields.length
      ? additionalFields
          .map((field) => `- ${field.label}: ${field.displayValue}`)
          .join("\n")
      : "- None.",
    "",
    "Internal notes",
    formatNotesContext(context.notes),
    "",
    formatMemoryContext(context.memory),
  ].join("\n");
}

export function getAiAssistantTitle(intent: AiAssistantIntent) {
  switch (intent) {
    case "draft-first-reply":
      return "First reply draft";
    case "summarize-inquiry":
      return "Inquiry summary";
    case "suggest-follow-up-questions":
      return "Follow-up questions";
    case "suggest-quote-line-items":
      return "Quote line item ideas";
    case "rewrite-draft":
      return "Professional rewrite";
    case "generate-follow-up-message":
      return "Follow-up message";
    case "custom":
      return "Custom AI result";
  }
}

export function isReplyLikeIntent(intent: AiAssistantIntent) {
  return replyLikeIntents.has(intent);
}

function getIntentInstructions(intent: AiAssistantIntent) {
  switch (intent) {
    case "draft-first-reply":
      return [
        "Draft a concise first reply the business owner can send to the customer.",
        "Acknowledge the request, briefly restate the job, and ask only the most necessary follow-up questions.",
        "If exact pricing, timing, or policy information is missing, say that clearly instead of inventing it.",
        "Return customer-ready email text only.",
      ].join("\n");
    case "summarize-inquiry":
      return [
        "Summarize the inquiry for the owner.",
        "Use three short sections: Summary, Missing info, Suggested next step.",
        "Keep it concise and internal-facing.",
      ].join("\n");
    case "suggest-follow-up-questions":
      return [
        "Suggest the best follow-up questions for the owner to ask next.",
        "Prioritize questions that unblock quoting, scheduling, or scope clarity.",
        "Return 4 to 8 short bullet points.",
      ].join("\n");
    case "suggest-quote-line-items":
      return [
        "Suggest quote line items for this inquiry.",
        "Do not invent or suggest exact prices, discounts, or policies.",
        "Return a concise bullet list where each bullet includes the proposed line item and a short rationale.",
      ].join("\n");
    case "rewrite-draft":
      return [
        "Rewrite the provided draft so it sounds professional, clear, and helpful.",
        "Preserve the original meaning and any real constraints. Do not add pricing or policy claims that are not in context.",
        "Return the revised customer-ready draft only.",
      ].join("\n");
    case "generate-follow-up-message":
      return [
        "Generate a concise follow-up message for an inquiry that has not been resolved yet.",
        "Keep it polite and actionable, and mention any missing details still needed.",
        "Return customer-ready message text only.",
      ].join("\n");
    case "custom":
      return [
        "Follow the owner request while staying within the provided business context.",
        "If the request requires information not present in context, say what is missing.",
        "Keep the answer concise and business-usable.",
      ].join("\n");
  }
}

export function buildAiAssistantInstructions(intent: AiAssistantIntent) {
  return [
    "You are Requo's internal AI assistant for a small service business owner.",
    "Use only the provided business, inquiry, notes, FAQ, and knowledge context.",
    "Never fabricate exact pricing, turnaround times, policies, guarantees, or availability unless they are explicitly present in the provided context.",
    "If something needed for a good answer is missing, state the missing information clearly.",
    "Keep outputs concise, practical, and ready for real business use.",
    "Do not mention that you are an AI assistant.",
    "Do not output markdown tables.",
    "",
    getIntentInstructions(intent),
  ].join("\n");
}

export function buildAiAssistantInput(
  context: InquiryAssistantContext,
  request: AiAssistantRequestInput,
) {
  const sections = [
    `Requested task: ${getAiAssistantTitle(request.intent)}`,
    "",
    buildContextBlock(context),
  ];

  if (request.sourceDraft) {
    sections.push("", "Working draft", truncateText(request.sourceDraft, 5000));
  }

  if (request.customPrompt) {
    sections.push(
      "",
      "Owner custom instruction",
      truncateText(request.customPrompt, 1200),
    );
  }

  return sections.join("\n");
}
