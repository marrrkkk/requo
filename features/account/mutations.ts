import "server-only";

import { eq } from "drizzle-orm";

import type { AccountProfileInput } from "@/features/account/schemas";
import {
  profileAvatarBucket,
  profileAvatarExtensionToMimeType,
  sanitizeProfileAvatarFileName,
} from "@/features/account/utils";
import { ensureProfileForUser } from "@/lib/auth/business-bootstrap";
import { db } from "@/lib/db/client";
import { profiles } from "@/lib/db/schema";
import { resolveSafeContentType } from "@/lib/files";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type UpdateAccountProfileInput = {
  user: {
    id: string;
    email: string;
  };
  values: Omit<AccountProfileInput, "phone"> & {
    phone: string | null;
  };
};

function createId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "")}`;
}

export async function updateAccountProfile({
  user,
  values,
}: UpdateAccountProfileInput) {
  await ensureProfileForUser({
    id: user.id,
    name: values.fullName,
    email: user.email,
  });

  const [currentProfile] = await db
    .select({
      avatarStoragePath: profiles.avatarStoragePath,
      avatarContentType: profiles.avatarContentType,
    })
    .from(profiles)
    .where(eq(profiles.userId, user.id))
    .limit(1);

  const now = new Date();
  const avatarFile = values.avatar;
  const storageClient = avatarFile ? createSupabaseAdminClient() : null;
  const previousAvatarStoragePath = currentProfile?.avatarStoragePath ?? null;
  const nextAvatarContentType = avatarFile
    ? resolveSafeContentType(avatarFile, {
        extensionToMimeType: profileAvatarExtensionToMimeType,
        fallback: "application/octet-stream",
      })
    : null;
  const nextAvatarStoragePath =
    avatarFile && storageClient
      ? `${user.id}/avatar/${createId("asset")}-${sanitizeProfileAvatarFileName(
          avatarFile.name,
        )}`
      : null;

  if (nextAvatarStoragePath && storageClient && avatarFile) {
    const { error } = await storageClient.storage
      .from(profileAvatarBucket)
      .upload(nextAvatarStoragePath, avatarFile, {
        contentType: nextAvatarContentType ?? "application/octet-stream",
        upsert: false,
      });

    if (error) {
      throw new Error(`Failed to upload profile avatar: ${error.message}`);
    }
  }

  try {
    await db
      .update(profiles)
      .set({
        fullName: values.fullName,
        jobTitle: values.jobTitle,
        phone: values.phone,
        avatarStoragePath: values.removeAvatar
          ? nextAvatarStoragePath
          : nextAvatarStoragePath ?? previousAvatarStoragePath ?? null,
        avatarContentType: values.removeAvatar
          ? nextAvatarContentType
          : nextAvatarContentType ?? currentProfile?.avatarContentType ?? null,
        updatedAt: now,
      })
      .where(eq(profiles.userId, user.id));
  } catch (error) {
    if (nextAvatarStoragePath && storageClient) {
      const { error: cleanupError } = await storageClient.storage
        .from(profileAvatarBucket)
        .remove([nextAvatarStoragePath]);

      if (cleanupError) {
        console.error(
          "Failed to clean up uploaded profile avatar after a database error.",
          cleanupError,
        );
      }
    }

    throw error;
  }

  const shouldRemovePreviousAvatar =
    previousAvatarStoragePath &&
    ((Boolean(nextAvatarStoragePath) &&
      nextAvatarStoragePath !== previousAvatarStoragePath) ||
      (values.removeAvatar && !nextAvatarStoragePath));

  if (shouldRemovePreviousAvatar) {
    const storageClient = createSupabaseAdminClient();
    const { error } = await storageClient.storage
      .from(profileAvatarBucket)
      .remove([previousAvatarStoragePath]);

    if (error) {
      console.error("Failed to clean up the previous profile avatar.", error);
    }
  }
}
