import { z } from "zod";

import {
  isSupportedBusinessCurrencyCode,
  normalizeBusinessCurrencyCode,
} from "@/features/businesses/locale";
import { businessTypes } from "@/features/inquiries/business-types";

export const createBusinessSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Enter a business name.")
    .max(80, "Use 80 characters or fewer."),
  businessType: z.enum(businessTypes),
  defaultCurrency: z
    .string()
    .trim()
    .min(1, "Choose a currency.")
    .transform(normalizeBusinessCurrencyCode)
    .refine(
      isSupportedBusinessCurrencyCode,
      "Choose a supported currency.",
    ),
  workspaceId: z.string().trim().min(1, "Please select a temporary workspace."),
});

export const recentlyOpenedBusinessSchema = z.object({
  businessSlug: z
    .string()
    .trim()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9-]+$/),
});
