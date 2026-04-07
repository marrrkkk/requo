import { z } from "zod";

export const ownerProfileDetailsSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Enter your full name.")
    .max(120, "Use 120 characters or fewer."),
  jobTitle: z
    .string()
    .trim()
    .min(2, "Enter your role or title.")
    .max(80, "Use 80 characters or fewer."),
  phone: z.string().trim().max(32, "Use 32 characters or fewer."),
});

export const accountProfileSchema = ownerProfileDetailsSchema;

export function normalizeOptionalTextValue(value: string) {
  const trimmedValue = value.trim();

  return trimmedValue.length > 0 ? trimmedValue : null;
}
