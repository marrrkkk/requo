import { z } from "zod";

import { aiSurfaces } from "@/features/ai/types";

export const aiSurfaceSchema = z.enum(aiSurfaces);

export const aiQualityTierSchema = z.enum([
  "best",
  "balanced",
  "cheap",
  "coding",
]);

export const aiConversationQuerySchema = z.object({
  businessSlug: z.preprocess(
    (value) => emptyToUndefined(firstString(value)),
    z.string().trim().min(1).max(120),
  ),
  surface: z.preprocess(
    (value) => firstString(value),
    aiSurfaceSchema,
  ),
  entityId: z.preprocess(
    (value) => emptyToUndefined(firstString(value)),
    z.string().trim().min(1).max(128),
  ),
});

export const aiConversationListQuerySchema = aiConversationQuerySchema.extend({
  limit: z
    .preprocess((value) => {
      const rawValue = firstString(value);

      if (typeof rawValue !== "string" || rawValue.trim() === "") {
        return 20;
      }

      return Number(rawValue);
    }, z.number().int().min(1).max(50))
    .catch(20),
});

export const aiCreateConversationSchema = z.object({
  businessSlug: z.string().trim().min(1).max(120),
  surface: aiSurfaceSchema,
  entityId: z.string().trim().min(1).max(128),
});

export const aiConversationMessagesQuerySchema = z.object({
  before: z.preprocess(
    (value) => emptyToUndefined(firstString(value)),
    z.string().trim().max(500).optional(),
  ),
  limit: z
    .preprocess((value) => {
      const rawValue = firstString(value);

      if (typeof rawValue !== "string" || rawValue.trim() === "") {
        return 30;
      }

      return Number(rawValue);
    }, z.number().int().min(1).max(50))
    .catch(30),
});

export const aiChatRequestSchema = z.object({
  businessSlug: z.string().trim().min(1).max(120).optional(),
  conversationId: z.string().trim().min(1).max(128),
  surface: aiSurfaceSchema,
  entityId: z.string().trim().min(1).max(128),
  message: z.string().trim().min(1).max(6000),
  qualityTier: aiQualityTierSchema.optional(),
  devModel: z.string().trim().min(1).max(240).optional(),
  /** When true, skips creating a new user message (used when replying to an already-persisted message). */
  replyToExisting: z.boolean().optional(),
});

/**
 * Schema for the Vercel AI SDK `useChat` hook request format (v6).
 * `DefaultChatTransport` sends `{ ...body, id, messages, trigger, messageId }`.
 */
export const aiChatUseChatRequestSchema = z.object({
  // DefaultChatTransport sends UIMessage[] with parts array
  messages: z.array(z.object({
    id: z.string().optional(),
    role: z.enum(["user", "assistant", "system"]),
    parts: z.array(z.object({
      type: z.string(),
      text: z.string().optional(),
    }).passthrough()).optional(),
    // Legacy format fallback (content string)
    content: z.string().optional(),
  })).min(1),
  // Chat transport metadata
  id: z.string().optional(),
  trigger: z.enum(["submit-message", "regenerate-message"]).optional(),
  messageId: z.string().optional().nullable(),
  // Custom body fields sent via transport's `body` option
  businessSlug: z.string().trim().min(1).max(120).optional(),
  conversationId: z.string().trim().min(1).max(128),
  surface: aiSurfaceSchema,
  entityId: z.string().trim().min(1).max(128),
  devModel: z.string().trim().min(1).max(240).optional(),
  /** When true, skips creating a new user message (used when replying to an already-persisted message). */
  replyToExisting: z.boolean().optional(),
});

/**
 * Input for the "Generate with AI" quote action.
 * - `inquiryId` is optional so manual quotes can still be generated from a short brief.
 * - `brief` is a short user note; optional when a linked inquiry already supplies context.
 */
export const aiGenerateQuoteDraftSchema = z
  .object({
    businessSlug: z.string().trim().min(1).max(120),
    inquiryId: z.preprocess(
      (value) => emptyToUndefined(firstString(value)),
      z.string().trim().min(1).max(128).optional(),
    ),
    brief: z.preprocess(
      (value) => emptyToUndefined(firstString(value)),
      z.string().trim().max(2000).optional(),
    ),
    revisionComment: z.preprocess(
      (value) => emptyToUndefined(firstString(value)),
      z.string().trim().max(2000).optional(),
    ),
    currentItems: z.preprocess(
      (value) => emptyToUndefined(firstString(value)),
      z.string().trim().max(4000).optional(),
    ),
    currentItemsJson: z.preprocess(
      (value) => emptyToUndefined(firstString(value)),
      z.string().trim().max(20_000).optional(),
    ),
  })
  .superRefine((value, ctx) => {
    if (!value.inquiryId && !value.brief) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["brief"],
        message:
          "Describe the job in a short brief or open this quote from a linked inquiry before generating.",
      });
    }
  });

export type AiGenerateQuoteDraftInput = z.infer<typeof aiGenerateQuoteDraftSchema>;

function emptyToUndefined(value: unknown) {
  if (typeof value === "string" && value.trim() === "") {
    return undefined;
  }

  return value ?? undefined;
}

function firstString(value: unknown) {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}
