import { z } from "zod";

import {
  isSupportedBusinessCountryCode,
  isSupportedBusinessCurrencyCode,
  normalizeBusinessCountryCode,
  normalizeBusinessCurrencyCode,
} from "@/features/businesses/locale";
import { businessTypes } from "@/features/inquiries/business-types";
import { inquiryFormConfigSchema } from "@/features/inquiries/form-config";
import { inquiryPageCardSchema, inquiryPageTemplates } from "@/features/inquiries/page-config";
import { isAcceptedFileType } from "@/lib/files";
import {
  normalizePublicSlugInput,
  publicSlugMaxLength,
  publicSlugRegex,
} from "@/lib/slugs";
import { businessAiTonePreferences } from "@/features/settings/types";
import {
  businessLogoAllowedExtensions,
  normalizeBusinessSlug,
  businessLogoAllowedMimeTypes,
  businessLogoMaxSize,
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

function optionalCountryCode() {
  return z.preprocess(
    emptyToUndefined,
    z
      .string()
      .trim()
      .transform(normalizeBusinessCountryCode)
      .refine(
        isSupportedBusinessCountryCode,
        "Choose a valid country.",
      )
      .optional(),
  );
}

function supportedCurrencyCode(defaultValue = "USD") {
  return z
    .string()
    .trim()
    .transform(normalizeBusinessCurrencyCode)
    .refine(
      isSupportedBusinessCurrencyCode,
      "Choose a supported currency.",
    )
    .default(defaultValue);
}

function optionalEmail(maxLength = 320) {
  return z.preprocess(
    emptyToUndefined,
    z.string().trim().max(maxLength).email().optional(),
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

const businessLogoSchema = z.preprocess(
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
      (file) => file.size <= businessLogoMaxSize,
      "Upload a logo that is 2 MB or smaller.",
    )
    .refine(
      (file) =>
        isAcceptedFileType(file, {
          allowedExtensions: businessLogoAllowedExtensions,
          allowedMimeTypes: businessLogoAllowedMimeTypes,
        }),
      "Upload a JPG, PNG, or WEBP logo.",
    )
    .optional(),
);

export const businessGeneralSettingsSchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(publicSlugMaxLength)
    .transform(normalizeBusinessSlug)
    .refine(
      (value) => publicSlugRegex.test(value),
      "Use lowercase letters, numbers, and hyphens only.",
  ),
  countryCode: optionalCountryCode(),
  shortDescription: optionalText(280),
  contactEmail: optionalEmail(),
  defaultCurrency: supportedCurrencyCode(),
  defaultEmailSignature: optionalText(1200),
  aiTonePreference: z.enum(businessAiTonePreferences),
  logo: businessLogoSchema,
  removeLogo: formBoolean().default(false),
});

export const businessNotificationSettingsSchema = z.object({
  notifyOnNewInquiry: formBoolean(),
  notifyOnQuoteSent: formBoolean(),
  notifyOnQuoteResponse: formBoolean(),
  notifyInAppOnNewInquiry: formBoolean(),
  notifyInAppOnQuoteResponse: formBoolean(),
});

export type BusinessGeneralSettingsInput = z.infer<
  typeof businessGeneralSettingsSchema
>;

export type BusinessNotificationSettingsInput = z.infer<
  typeof businessNotificationSettingsSchema
>;

export const businessQuoteSettingsSchema = z.object({
  defaultQuoteNotes: optionalText(1600),
  defaultQuoteValidityDays: z.preprocess(
    (value) => {
      if (typeof value === "number") {
        return value;
      }

      if (typeof value !== "string") {
        return value;
      }

      const normalized = value.trim();

      if (!normalized) {
        return Number.NaN;
      }

      return Number(normalized);
    },
    z.number().int().min(1).max(365),
  ),
});

export type BusinessQuoteSettingsInput = z.infer<
  typeof businessQuoteSettingsSchema
>;

export const businessDeleteSchema = z.object({
  confirmation: z.string().trim().min(1).max(120),
});

export type BusinessDeleteInput = z.infer<typeof businessDeleteSchema>;

export const businessInquiryPageSettingsSchema = z.object({
  formId: z.string().trim().min(1).max(128),
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

export type BusinessInquiryPageSettingsInput = z.infer<
  typeof businessInquiryPageSettingsSchema
>;

export const businessInquiryFormSettingsSchema = z.object({
  formId: z.string().trim().min(1).max(128),
  name: z.string().trim().min(2).max(80),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(publicSlugMaxLength)
    .transform(normalizePublicSlugInput)
    .refine(
      (value) => publicSlugRegex.test(value),
      "Use lowercase letters, numbers, and hyphens only.",
    ),
  businessType: z.enum(businessTypes),
  inquiryFormConfig: jsonField(inquiryFormConfigSchema, Symbol.for("invalid-json-field")),
});

export type BusinessInquiryFormSettingsInput = z.infer<
  typeof businessInquiryFormSettingsSchema
>;

export const businessInquiryFormPresetSchema = z.object({
  formId: z.string().trim().min(1).max(128),
  businessType: z.enum(businessTypes),
});

export type BusinessInquiryFormPresetInput = z.infer<
  typeof businessInquiryFormPresetSchema
>;

export const businessInquiryFormCreateSchema = z.object({
  name: z.string().trim().min(2).max(80),
  businessType: z.enum(businessTypes),
});

export type BusinessInquiryFormCreateInput = z.infer<
  typeof businessInquiryFormCreateSchema
>;

export const businessInquiryFormTargetSchema = z.object({
  targetFormId: z.string().trim().min(1).max(128),
});

export type BusinessInquiryFormTargetInput = z.infer<
  typeof businessInquiryFormTargetSchema
>;
