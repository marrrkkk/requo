import { z } from "zod";

import {
  isSupportedBusinessCountryCode,
  normalizeBusinessCountryCode,
} from "@/features/businesses/locale";
import { businessTypes } from "@/features/inquiries/business-types";

export const createBusinessSchema = z.object({
  name: z
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
});
