import { z } from "zod";

import {
  isSupportedBusinessCountryCode,
  isSupportedBusinessCurrencyCode,
  normalizeBusinessCountryCode,
  normalizeBusinessCurrencyCode,
} from "@/features/businesses/locale";
import { businessTypes } from "@/features/inquiries/business-types";
import { inquiryFormConfigSchema } from "@/features/inquiries/form-config";
import {
  inquiryPageCardSchema,
  inquiryPageImageUrlSchema,
  inquiryPageShowcaseImageFrames,
  inquiryPageShowcaseImageSizes,
  inquiryPageTemplateSchema,
  maxInquiryPageCards,
} from "@/features/inquiries/page-config";
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
    z
      .string()
      .trim()
      .max(maxLength, `Use ${maxLength} characters or fewer.`)
      .optional(),
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
    z
      .string()
      .trim()
      .max(maxLength, `Email must be ${maxLength} characters or fewer.`)
      .email("Enter a valid email address.")
      .optional(),
  );
}

function optionalExternalUrl(maxLength = 2000) {
  return z.preprocess(
    emptyToUndefined,
    z
      .string()
      .trim()
      .max(maxLength, `Use ${maxLength} characters or fewer.`)
      .refine((value) => {
        try {
          const parsed = new URL(value);
          return parsed.protocol === "http:" || parsed.protocol === "https:";
        } catch {
          return false;
        }
      }, "Enter a valid URL.")
      .optional(),
  );
}

function formBoolean() {
  return z.preprocess(
    (value) => value === true || value === "true" || value === "on",
    z.boolean(),
  );
}

function formNumber({
  invalidMessage,
  max,
  min,
}: {
  invalidMessage: string;
  max: number;
  min: number;
}) {
  return z.preprocess(
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
    z
      .number({
        error: invalidMessage,
      })
      .finite(invalidMessage)
      .min(min)
      .max(max),
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
  name: z
    .string()
    .trim()
    .min(2, "Enter a business name.")
    .max(120, "Use 120 characters or fewer."),
  slug: z
    .string()
    .trim()
    .min(2, "Use at least 2 characters.")
    .max(publicSlugMaxLength, `Use ${publicSlugMaxLength} characters or fewer.`)
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
  notifyOnNewInquiry: z.boolean(),
  notifyOnQuoteSent: z.boolean(),
  notifyOnQuoteResponse: z.boolean(),
  notifyOnMemberInviteResponse: z.boolean(),
  notifyInAppOnNewInquiry: z.boolean(),
  notifyInAppOnQuoteResponse: z.boolean(),
  notifyInAppOnMemberInviteResponse: z.boolean(),
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
    z
      .number()
      .int("Enter a whole number of days.")
      .min(1, "Use at least 1 day.")
      .max(365, "Use 365 days or fewer."),
  ),
});

export type BusinessQuoteSettingsInput = z.infer<
  typeof businessQuoteSettingsSchema
>;

export const businessEmailTemplateSettingsSchema = z.object({
  subject: optionalText(200),
  greeting: optionalText(200),
  introText: optionalText(400),
  ctaLabel: optionalText(60),
  closingText: optionalText(400),
});

export type BusinessEmailTemplateSettingsInput = z.infer<
  typeof businessEmailTemplateSettingsSchema
>;

export const businessDeleteSchema = z.object({
  confirmation: z
    .string()
    .trim()
    .min(1, "Type the confirmation text.")
    .max(120, "Use 120 characters or fewer."),
});

export type BusinessDeleteInput = z.infer<typeof businessDeleteSchema>;

export const businessInquiryPageSettingsSchema = z.object({
  formId: z
    .string()
    .trim()
    .min(1, "Choose a form.")
    .max(128, "Form id is too long."),
  name: z
    .string()
    .trim()
    .min(2, "Enter a form name.")
    .max(80, "Use 80 characters or fewer."),
  slug: z
    .string()
    .trim()
    .min(2, "Use at least 2 characters.")
    .max(publicSlugMaxLength, `Use ${publicSlugMaxLength} characters or fewer.`)
    .transform(normalizePublicSlugInput)
    .refine(
      (value) => publicSlugRegex.test(value),
      "Use lowercase letters, numbers, and hyphens only.",
    ),
  businessType: z.enum(businessTypes),
  publicInquiryEnabled: formBoolean(),
  template: inquiryPageTemplateSchema,
  showSupportingCards: formBoolean(),
  showShowcaseImage: formBoolean(),
  showBusinessContact: formBoolean(),
  eyebrow: optionalText(48),
  headline: z
    .string()
    .trim()
    .min(1, "Enter a headline.")
    .max(120, "Use 120 characters or fewer."),
  description: optionalText(280),
  brandTagline: optionalText(120),
  formTitle: z
    .string()
    .trim()
    .min(1, "Enter a form title.")
    .max(80, "Use 80 characters or fewer."),
  formDescription: optionalText(200),
  businessContactPhone: optionalText(40),
  businessContactEmail: optionalEmail(),
  businessFacebookUrl: optionalExternalUrl(),
  businessInstagramUrl: optionalExternalUrl(),
  businessTwitterXUrl: optionalExternalUrl(),
  businessLinkedinUrl: optionalExternalUrl(),
  showcaseImageUrl: inquiryPageImageUrlSchema,
  showcaseImageFrame: z.enum(inquiryPageShowcaseImageFrames),
  showcaseImageSize: z.enum(inquiryPageShowcaseImageSizes),
  showcaseImageCropX: formNumber({
    invalidMessage: "Save the page again after cropping the image.",
    min: -4,
    max: 4,
  }),
  showcaseImageCropY: formNumber({
    invalidMessage: "Save the page again after cropping the image.",
    min: -4,
    max: 4,
  }),
  showcaseImageCropZoom: formNumber({
    invalidMessage: "Save the page again after cropping the image.",
    min: 1,
    max: 4,
  }),
  cards: jsonField(
    z
      .array(inquiryPageCardSchema)
      .max(
        maxInquiryPageCards,
        `Use ${maxInquiryPageCards} supporting cards or fewer.`,
      ),
    [],
  ),
});

export type BusinessInquiryPageSettingsInput = z.infer<
  typeof businessInquiryPageSettingsSchema
>;

export const businessInquiryFormSettingsSchema = z.object({
  formId: z
    .string()
    .trim()
    .min(1, "Form id is required.")
    .max(128, "Form id is too long."),
  businessType: z.enum(businessTypes),
  inquiryFormConfig: jsonField(inquiryFormConfigSchema, Symbol.for("invalid-json-field")),
});

export type BusinessInquiryFormSettingsInput = z.infer<
  typeof businessInquiryFormSettingsSchema
>;

export const businessInquiryFormPresetSchema = z.object({
  formId: z
    .string()
    .trim()
    .min(1, "Form id is required.")
    .max(128, "Form id is too long."),
  businessType: z.enum(businessTypes),
});

export type BusinessInquiryFormPresetInput = z.infer<
  typeof businessInquiryFormPresetSchema
>;

export const businessInquiryFormCreateSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Enter a form name.")
    .max(80, "Use 80 characters or fewer."),
  businessType: z.enum(businessTypes),
});

export type BusinessInquiryFormCreateInput = z.infer<
  typeof businessInquiryFormCreateSchema
>;

export const businessInquiryFormTargetSchema = z.object({
  targetFormId: z
    .string()
    .trim()
    .min(1, "Target form id is required.")
    .max(128, "Target form id is too long."),
});

export type BusinessInquiryFormTargetInput = z.infer<
  typeof businessInquiryFormTargetSchema
>;
