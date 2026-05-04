import { z } from "zod";

import {
  isSupportedBusinessCountryCode,
  isSupportedBusinessCurrencyCode,
  normalizeBusinessCountryCode,
  normalizeBusinessCurrencyCode,
} from "@/features/businesses/locale";
import {
  starterTemplateBusinessTypes,
  type StarterTemplateBusinessType,
} from "@/features/businesses/starter-templates";
import {
  businessTypes,
  type BusinessType,
} from "@/features/inquiries/business-types";

export const jobTitleValues = [
  "Owner",
  "Founder",
  "Co-founder",
  "CEO",
  "Director",
  "Manager",
  "Operations Manager",
  "Project Manager",
  "Account Manager",
  "Sales Manager",
  "Admin",
  "Freelancer",
  "Consultant",
  "Other",
] as const;

export const jobTitleOptions = jobTitleValues.map((value) => ({
  value,
  label: value,
}));

export const companySizeValues = [
  "Just me",
  "2-5 people",
  "6-10 people",
  "11-25 people",
  "26-50 people",
  "51+ people",
] as const;

export const companySizeOptions = companySizeValues.map((value) => ({
  value,
  label: value,
}));

export const referralSourceValues = [
  "Google Search",
  "Product Hunt",
  "YouTube",
  "LinkedIn",
  "X / Twitter",
  "Reddit",
  "Facebook",
  "Instagram",
  "TikTok",
  "Friend or colleague",
  "Community",
  "Newsletter or blog",
  "Other",
] as const;

export const referralSourceOptions = referralSourceValues.map((value) => ({
  value,
  label: value,
}));

export const onboardingWorkspaceSchema = z.object({
  workspaceName: z
    .string()
    .trim()
    .min(2, "Enter a workspace name.")
    .max(80, "Use 80 characters or fewer."),
});

export const onboardingBusinessContextSchema = z.object({
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
    .refine(isSupportedBusinessCountryCode, "Choose a valid country."),
  defaultCurrency: z
    .string()
    .trim()
    .min(1, "Choose a currency.")
    .transform(normalizeBusinessCurrencyCode)
    .refine(isSupportedBusinessCurrencyCode, "Choose a supported currency."),
});

export const onboardingTemplateSchema = z.object({
  starterTemplateBusinessType: z.enum(starterTemplateBusinessTypes),
});

export const onboardingOwnerProfileSchema = z.object({
  jobTitle: z.enum(jobTitleValues, {
    message: "Choose your role.",
  }),
  companySize: z.enum(companySizeValues, {
    message: "Choose your company size.",
  }),
  referralSource: z.enum(referralSourceValues, {
    message: "Choose where you found Requo.",
  }),
});

export const completeOnboardingSchema = z.object({
  ...onboardingWorkspaceSchema.shape,
  ...onboardingBusinessContextSchema.shape,
  ...onboardingTemplateSchema.shape,
  ...onboardingOwnerProfileSchema.shape,
});

export type OnboardingBusinessType = BusinessType;
export type OnboardingStarterTemplateBusinessType =
  StarterTemplateBusinessType;
