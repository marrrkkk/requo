import { z } from "zod";

import { ownerProfileDetailsSchema } from "@/features/account/schemas";
import {
  isSupportedBusinessCountryCode,
  normalizeBusinessCountryCode,
} from "@/features/businesses/locale";
import { businessTypes } from "@/features/inquiries/business-types";

export const onboardingWorkspaceSchema = z.object({
  businessName: z
    .string()
    .trim()
    .min(2, "Enter a business name.")
    .max(80, "Use 80 characters or fewer."),
  businessType: z.enum(businessTypes),
  countryCode: z
    .string()
    .trim()
    .min(1, "Choose a country.")
    .transform(normalizeBusinessCountryCode)
    .refine(
      isSupportedBusinessCountryCode,
      "Choose a valid country.",
    ),
  shortDescription: z
    .string()
    .trim()
    .max(280, "Use 280 characters or fewer."),
});

export const onboardingProfileSchema = ownerProfileDetailsSchema.pick({
  fullName: true,
});

export const completeOnboardingSchema = z.object({
  ...onboardingWorkspaceSchema.shape,
  ...onboardingProfileSchema.shape,
  jobTitle: ownerProfileDetailsSchema.shape.jobTitle,
  phone: ownerProfileDetailsSchema.shape.phone,
});
