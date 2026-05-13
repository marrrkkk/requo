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
