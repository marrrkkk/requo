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

export const jobTitleOptions = [
  { value: "Owner", label: "Owner" },
  { value: "Founder", label: "Founder" },
  { value: "Co-founder", label: "Co-founder" },
  { value: "CEO", label: "CEO" },
  { value: "Director", label: "Director" },
  { value: "Manager", label: "Manager" },
  { value: "Operations Manager", label: "Operations Manager" },
  { value: "Project Manager", label: "Project Manager" },
  { value: "Account Manager", label: "Account Manager" },
  { value: "Sales Manager", label: "Sales Manager" },
  { value: "Admin", label: "Admin" },
  { value: "Freelancer", label: "Freelancer" },
  { value: "Consultant", label: "Consultant" },
  { value: "Other", label: "Other" },
];

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

export const completeOnboardingSchema = z.object({
  ...onboardingWorkspaceSchema.shape,
  ...onboardingBusinessContextSchema.shape,
  ...onboardingTemplateSchema.shape,
});

export type OnboardingBusinessType = BusinessType;
export type OnboardingStarterTemplateBusinessType =
  StarterTemplateBusinessType;
