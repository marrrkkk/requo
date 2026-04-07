import { z } from "zod";

import { ownerProfileDetailsSchema } from "@/features/account/schemas";
import { businessTypes } from "@/features/inquiries/business-types";

export const onboardingWorkspaceSchema = z.object({
  businessName: z
    .string()
    .trim()
    .min(2, "Enter a business name.")
    .max(80, "Use 80 characters or fewer."),
  businessType: z.enum(businessTypes),
  shortDescription: z
    .string()
    .trim()
    .max(280, "Use 280 characters or fewer."),
});

export const onboardingProfileSchema = ownerProfileDetailsSchema;

export const completeOnboardingSchema = z.object({
  ...onboardingWorkspaceSchema.shape,
  ...onboardingProfileSchema.shape,
});
