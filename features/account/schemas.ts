import { z } from "zod";

import { isAcceptedFileType } from "@/lib/files";
import {
  profileAvatarAllowedExtensions,
  profileAvatarAllowedMimeTypes,
  profileAvatarMaxSize,
} from "@/features/account/utils";

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

function formBoolean() {
  return z.preprocess(
    (value) => value === true || value === "true" || value === "on",
    z.boolean(),
  );
}

const profileAvatarSchema = z.preprocess(
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
      (file) => file.size <= profileAvatarMaxSize,
      "Upload an avatar that is 2 MB or smaller.",
    )
    .refine(
      (file) =>
        isAcceptedFileType(file, {
          allowedExtensions: profileAvatarAllowedExtensions,
          allowedMimeTypes: profileAvatarAllowedMimeTypes,
        }),
      "Upload a JPG, PNG, or WEBP avatar.",
    )
    .optional(),
);

export const accountProfileSchema = ownerProfileDetailsSchema.extend({
  avatar: profileAvatarSchema,
  removeAvatar: formBoolean().default(false),
});

export type AccountProfileInput = z.infer<typeof accountProfileSchema>;

export function normalizeOptionalTextValue(value: string) {
  const trimmedValue = value.trim();

  return trimmedValue.length > 0 ? trimmedValue : null;
}
