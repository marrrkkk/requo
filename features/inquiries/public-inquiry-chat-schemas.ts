import { z } from "zod";

// ---------------------------------------------------------------------------
// Public Inquiry Chat — Request / Response schemas
//
// These schemas validate the public (unauthenticated) conversational inquiry
// chat API. The client sends the full message history on each request; the
// server is stateless.
// ---------------------------------------------------------------------------

const MAX_MESSAGE_HISTORY = 30;
const MAX_MESSAGE_LENGTH = 2000;

export const publicInquiryChatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().max(MAX_MESSAGE_LENGTH),
}).refine(
  (msg) => msg.role === "assistant" || msg.content.length >= 1,
  { message: "User messages cannot be empty." },
);

export type PublicInquiryChatMessage = z.infer<
  typeof publicInquiryChatMessageSchema
>;

export const publicInquiryChatRequestSchema = z.object({
  businessSlug: z.string().trim().min(1).max(120),
  formSlug: z.string().trim().max(120).optional(),
  messages: z
    .array(publicInquiryChatMessageSchema)
    .max(MAX_MESSAGE_HISTORY, "Conversation is too long. Please submit your inquiry."),
});

export type PublicInquiryChatRequest = z.infer<
  typeof publicInquiryChatRequestSchema
>;

// -- Stream events sent back to the client via SSE --

export type PublicInquiryChatDebugInfo = {
  model: string;
  provider: string;
  latencyMs: number;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  steps?: number;
  toolCalls?: Array<{ name: string }>;
};

export type PublicInquiryChatStreamEvent =
  | { type: "delta"; value: string }
  | {
      type: "done";
      /** Populated when the AI has collected enough data to extract fields. */
      extracted: PublicInquiryChatExtractedFields | null;
    }
  | { type: "debug"; info: PublicInquiryChatDebugInfo }
  | { type: "error"; message: string };

/**
 * Structured fields extracted from the conversation.
 * Maps to the same shape expected by `submitPublicInquiryAction`.
 */
export type PublicInquiryChatExtractedFields = {
  customerName: string;
  customerContactMethod: string;
  customerContactHandle: string;
  serviceCategory: string;
  details: string;
  requestedDeadline?: string;
  budgetText?: string;
  /** Custom field values keyed by field id. */
  customFields?: Record<string, string | string[] | boolean>;
};

export const publicInquiryChatExtractedFieldsSchema = z.object({
  customerName: z.string().trim().min(1).max(120),
  customerContactMethod: z.string().trim().min(1).max(40),
  customerContactHandle: z.string().trim().min(1).max(320),
  serviceCategory: z.string().trim().min(1).max(120),
  details: z.string().trim().min(1).max(4000),
  requestedDeadline: z.string().trim().max(40).optional(),
  budgetText: z.string().trim().max(120).optional(),
  customFields: z.record(z.string(), z.union([
    z.string(),
    z.array(z.string()),
    z.boolean(),
  ])).optional(),
});
