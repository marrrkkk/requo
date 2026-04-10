import { z } from "zod";

import { aiAssistantIntents } from "@/features/ai/types";

function emptyToUndefined(value: unknown) {
  if (typeof value === "string" && value.trim() === "") {
    return undefined;
  }

  return value ?? undefined;
}

function optionalTrimmedText(maxLength: number) {
  return z.preprocess(
    emptyToUndefined,
    z
      .string()
      .trim()
      .max(maxLength, `Use ${maxLength} characters or fewer.`)
      .optional(),
  );
}

export const aiAssistantIntentSchema = z.enum(aiAssistantIntents);

export const aiAssistantRequestSchema = z
  .object({
    intent: aiAssistantIntentSchema,
    customPrompt: optionalTrimmedText(1200),
    sourceDraft: optionalTrimmedText(6000),
  })
  .superRefine((value, ctx) => {
    if (value.intent === "custom" && !value.customPrompt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Add a custom prompt before running a custom request.",
        path: ["customPrompt"],
      });
    }

    if (value.intent === "rewrite-draft" && !value.sourceDraft) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Paste the draft you want rewritten.",
        path: ["sourceDraft"],
      });
    }
  });

export type AiAssistantRequestInput = z.infer<typeof aiAssistantRequestSchema>;
