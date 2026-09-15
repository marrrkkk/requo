import { z } from "zod";

import { isAcceptedFileType } from "@/lib/files";
import {
  profileAvatarAllowedExtensions,
  profileAvatarAllowedMimeTypes,
  profileAvatarMaxSize,
} from "@/features/account/utils";

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

/**
 * Profile settings owns only the fields the page actually renders: the
 * full name and the avatar.
 *
 * `jobTitle` and `phone` are onboarding/deferred profile fields with no
 * input on this page. They used to be round-tripped through hidden inputs
 * so `updateAccountProfile` could write a complete row, which meant a user
 * whose `job_title` was NULL (the normal case for OAuth sign-ups and for
 * anyone who skipped the optional onboarding field) could not save a name
 * change at all — the blank passthrough failed `min(2)` with "Enter your
 * role or title." Leaving them out of the schema keeps those columns
 * untouched in the database instead.
 */
export const accountProfileSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Enter your full name.")
    .max(120, "Use 120 characters or fewer."),
  avatar: profileAvatarSchema,
  removeAvatar: formBoolean().default(false),
});

export type AccountProfileInput = z.infer<typeof accountProfileSchema>;

const accountPasswordSchema = z
  .string()
  .min(8, "Use at least 8 characters.")
  .max(128, "Use 128 characters or fewer.");

export const accountSetPasswordSchema = z
  .object({
    newPassword: accountPasswordSchema,
    confirmPassword: z
      .string()
      .min(8, "Use at least 8 characters.")
      .max(128, "Use 128 characters or fewer."),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    message: "Passwords must match.",
    path: ["confirmPassword"],
  });

export const accountChangePasswordSchema = z
  .object({
    currentPassword: z
      .string()
      .min(1, "Enter your current password.")
      .max(128, "Use 128 characters or fewer."),
    newPassword: accountPasswordSchema,
    confirmPassword: z
      .string()
      .min(8, "Use at least 8 characters.")
      .max(128, "Use 128 characters or fewer."),
    revokeOtherSessions: formBoolean().default(true),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    message: "Passwords must match.",
    path: ["confirmPassword"],
  })
  .refine((value) => value.currentPassword !== value.newPassword, {
    message: "Use a different password.",
    path: ["newPassword"],
  });

export const accountDeleteSchema = z.object({
  confirmation: z
    .string()
    .trim()
    .min(1, "Type the confirmation text.")
    .max(120, "Use 120 characters or fewer."),
});
