import { z } from "zod";

export const replySnippetIdSchema = z.string().trim().min(1).max(128);

export const replySnippetSchema = z.object({
  title: z
    .string()
    .trim()
    .min(2, "Enter a snippet title.")
    .max(120, "Snippet titles must be 120 characters or fewer."),
  body: z
    .string()
    .trim()
    .min(1, "Enter snippet content.")
    .max(2000, "Reply snippets must be 2,000 characters or fewer."),
});

export type ReplySnippetInput = z.infer<typeof replySnippetSchema>;
