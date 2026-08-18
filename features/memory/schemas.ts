import { z } from "zod";

import { businessMemoryCategories } from "@/lib/db/schema/memories";
import {
  MEMORY_CONTENT_MAX_LENGTH,
  MEMORY_TITLE_MAX_LENGTH,
} from "@/features/memory/types";

export const memoryEntryInputSchema = z.object({
  title: z
    .string()
    .trim()
    .min(2, "Give the entry a short title.")
    .max(
      MEMORY_TITLE_MAX_LENGTH,
      `Titles must be ${MEMORY_TITLE_MAX_LENGTH} characters or fewer.`,
    ),
  content: z
    .string()
    .trim()
    .min(10, "Add at least a sentence of detail.")
    .max(
      MEMORY_CONTENT_MAX_LENGTH,
      `Entries must be ${MEMORY_CONTENT_MAX_LENGTH} characters or fewer.`,
    ),
  category: z.enum(businessMemoryCategories).default("business_rules"),
});

export type MemoryEntryInput = z.infer<typeof memoryEntryInputSchema>;

export const memoryEntryUpdateSchema = z.object({
  title: memoryEntryInputSchema.shape.title.optional(),
  content: memoryEntryInputSchema.shape.content.optional(),
  category: memoryEntryInputSchema.shape.category.optional(),
  position: z.number().int().min(0).optional(),
});

export type MemoryEntryUpdate = z.infer<typeof memoryEntryUpdateSchema>;

export const knowledgeFileUploadSchema = z.object({
  fileName: z
    .string()
    .trim()
    .min(1, "Choose a file to upload.")
    .max(255, "File names must be 255 characters or fewer."),
  mimeType: z.string().trim().min(1).max(120),
  byteSize: z
    .number()
    .int("File size must be a whole number of bytes.")
    .min(1, "The file is empty.")
    .max(5 * 1024 * 1024, "Files must be 5 MB or smaller."),
  content: z.instanceof(ArrayBuffer).or(z.instanceof(Uint8Array)),
});

export type KnowledgeFileUploadInput = z.infer<typeof knowledgeFileUploadSchema>;
