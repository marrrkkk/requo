import { z } from "zod";

import { inquiryPageCardSchema, inquiryPageTemplates } from "@/features/inquiries/page-config";
import { isAcceptedFileType } from "@/lib/files";
import { workspaceAiTonePreferences } from "@/features/settings/types";
import {
  workspaceCurrencyOptions,
  workspaceLogoAllowedExtensions,
  normalizeWorkspaceSlug,
  workspaceLogoAllowedMimeTypes,
  workspaceLogoMaxSize,
} from "@/features/settings/utils";

function emptyToUndefined(value: unknown) {
  if (value == null) {
    return undefined;
  }

  if (typeof value === "string" && value.trim() === "") {
    return undefined;
  }

  return value;
}

function optionalText(maxLength: number) {
  return z.preprocess(
    emptyToUndefined,
    z.string().trim().max(maxLength).optional(),
  );
}

function formBoolean() {
  return z.preprocess(
    (value) => value === true || value === "true" || value === "on",
    z.boolean(),
  );
}

function jsonField<T extends z.ZodTypeAny>(schema: T, emptyFallback: unknown) {
  return z.preprocess((value) => {
    if (typeof value !== "string") {
      return emptyFallback;
    }

    const trimmedValue = value.trim();

    if (!trimmedValue) {
      return emptyFallback;
    }

    try {
      return JSON.parse(trimmedValue);
    } catch {
      return Symbol.for("invalid-json-field");
    }
  }, schema);
}

const workspaceLogoSchema = z.preprocess(
  (value) => {
    if (!(value instanceof File)) {
      return undefined;
    }

    if (value.size === 0 || value.name.trim() === "") {
      return undefined;
    }

    return value;
  },
  z
    .instanceof(File)
    .refine(
      (file) => file.size <= workspaceLogoMaxSize,
      "Upload a logo that is 2 MB or smaller.",
    )
    .refine(
      (file) =>
        isAcceptedFileType(file, {
          allowedExtensions: workspaceLogoAllowedExtensions,
          allowedMimeTypes: workspaceLogoAllowedMimeTypes,
        }),
      "Upload a JPG, PNG, or WEBP logo.",
    )
    .optional(),
);

export const workspaceSettingsSchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(64)
    .transform(normalizeWorkspaceSlug)
    .refine(
      (value) => /^[a-z0-9-]+$/.test(value),
      "Use lowercase letters, numbers, and hyphens only.",
    ),
  shortDescription: optionalText(280),
  contactEmail: z.preprocess(emptyToUndefined, z.email().optional()),
  defaultEmailSignature: optionalText(1200),
  defaultQuoteNotes: optionalText(1600),
  aiTonePreference: z.enum(workspaceAiTonePreferences),
  notifyOnNewInquiry: formBoolean(),
  notifyOnQuoteSent: formBoolean(),
  defaultCurrency: z.enum(workspaceCurrencyOptions).default("USD"),
  logo: workspaceLogoSchema,
  removeLogo: formBoolean().default(false),
});

export type WorkspaceSettingsInput = z.infer<typeof workspaceSettingsSchema>;

export const workspaceInquiryPageSettingsSchema = z.object({
  publicInquiryEnabled: formBoolean(),
  template: z.enum(inquiryPageTemplates),
  eyebrow: optionalText(48),
  headline: z.string().trim().min(1).max(120),
  description: optionalText(280),
  brandTagline: optionalText(120),
  formTitle: z.string().trim().min(1).max(80),
  formDescription: optionalText(200),
  cards: jsonField(z.array(inquiryPageCardSchema).max(8), []),
});

export type WorkspaceInquiryPageSettingsInput = z.infer<
  typeof workspaceInquiryPageSettingsSchema
>;
