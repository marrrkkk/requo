import { and, eq, inArray } from "drizzle-orm";

import type { AccountProfileInput } from "@/features/account/schemas";
import { publicInquiryAttachmentBucket } from "@/features/inquiries/schemas";
import {
  profileAvatarBucket,
  profileAvatarExtensionToMimeType,
  sanitizeProfileAvatarFileName,
} from "@/features/account/utils";
import { businessLogoBucket } from "@/features/settings/utils";
import { ensureProfileForUser } from "@/lib/auth/business-bootstrap";
import { db } from "@/lib/db/client";
import {
  businesses,
  businessMembers,
  inquiryAttachments,
  profiles,
} from "@/lib/db/schema";
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

function chunkPaths(paths: string[], size = 100) {
  const chunks: string[][] = [];

  for (let index = 0; index < paths.length; index += size) {
    chunks.push(paths.slice(index, index + size));
  }

  return chunks;
}

async function removeStoragePaths(
  bucket: string,
  paths: Array<string | null | undefined>,
) {
  const sanitizedPaths = paths.filter((path): path is string => Boolean(path));

  if (!sanitizedPaths.length) {
    return;
  }

  const storageClient = createSupabaseAdminClient();

  for (const chunk of chunkPaths(sanitizedPaths)) {
    const { error } = await storageClient.storage.from(bucket).remove(chunk);

    if (error) {
      console.error(`Failed to remove storage objects from ${bucket}.`, error);
    }
  }
}

export async function cleanupAccountOwnedAssets(userId: string) {
  const [profileRows, ownedBusinessRows] = await Promise.all([
    db
      .select({
        avatarStoragePath: profiles.avatarStoragePath,
      })
      .from(profiles)
      .where(eq(profiles.userId, userId))
      .limit(1),
    db
      .select({
        id: businesses.id,
        logoStoragePath: businesses.logoStoragePath,
      })
      .from(businessMembers)
      .innerJoin(businesses, eq(businessMembers.businessId, businesses.id))
      .where(
        and(
          eq(businessMembers.userId, userId),
          eq(businessMembers.role, "owner"),
        ),
      ),
  ]);

  const ownedBusinessIds = ownedBusinessRows.map((row) => row.id);
  const inquiryAttachmentRows = ownedBusinessIds.length
    ? await db
        .select({
          storagePath: inquiryAttachments.storagePath,
        })
        .from(inquiryAttachments)
        .where(inArray(inquiryAttachments.businessId, ownedBusinessIds))
    : [];

  if (ownedBusinessIds.length) {
    await db.delete(businesses).where(inArray(businesses.id, ownedBusinessIds));
  }

  await Promise.all([
    removeStoragePaths(
      profileAvatarBucket,
      [profileRows[0]?.avatarStoragePath ?? null],
    ),
    removeStoragePaths(
      businessLogoBucket,
      ownedBusinessRows.map((row) => row.logoStoragePath),
    ),
    removeStoragePaths(
      publicInquiryAttachmentBucket,
      inquiryAttachmentRows.map((row) => row.storagePath),
    ),
  ]);
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
