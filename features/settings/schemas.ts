import { z } from "zod";

import { workspaceAiTonePreferences } from "@/features/settings/types";
import {
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
        workspaceLogoAllowedMimeTypes.some((mimeType) => mimeType === file.type),
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
  publicInquiryEnabled: formBoolean(),
  inquiryHeadline: optionalText(240),
  defaultEmailSignature: optionalText(1200),
  defaultQuoteNotes: optionalText(1600),
  aiTonePreference: z.enum(workspaceAiTonePreferences),
  notifyOnNewInquiry: formBoolean(),
  notifyOnQuoteSent: formBoolean(),
  defaultCurrency: z.string().length(3).default("USD"),
  logo: workspaceLogoSchema,
  removeLogo: formBoolean().default(false),
});

export type WorkspaceSettingsInput = z.infer<typeof workspaceSettingsSchema>;
