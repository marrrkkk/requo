import "server-only";

import { and, eq, ne } from "drizzle-orm";

import type {
  WorkspaceInquiryPageSettingsInput,
  WorkspaceSettingsInput,
} from "@/features/settings/schemas";
import { resolveSafeContentType } from "@/lib/files";
import {
  sanitizeWorkspaceLogoFileName,
  workspaceLogoBucket,
  workspaceLogoExtensionToMimeType,
} from "@/features/settings/utils";
import { db } from "@/lib/db/client";
import { activityLogs, workspaces } from "@/lib/db/schema";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type UpdateWorkspaceSettingsInput = {
  workspaceId: string;
  actorUserId: string;
  values: WorkspaceSettingsInput;
};

type UpdateWorkspaceInquiryPageInput = {
  workspaceId: string;
  actorUserId: string;
  values: WorkspaceInquiryPageSettingsInput;
};

type UpdateWorkspaceSettingsResult =
  | { ok: true; previousSlug: string; nextSlug: string }
  | { ok: false; reason: "not-found" | "slug-taken" };

function createId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "")}`;
}

export async function updateWorkspaceSettings({
  workspaceId,
  actorUserId,
  values,
}: UpdateWorkspaceSettingsInput): Promise<UpdateWorkspaceSettingsResult> {
  const [currentWorkspace] = await db
    .select({
      id: workspaces.id,
      slug: workspaces.slug,
      logoStoragePath: workspaces.logoStoragePath,
      logoContentType: workspaces.logoContentType,
    })
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId))
    .limit(1);

  if (!currentWorkspace) {
    return {
      ok: false,
      reason: "not-found",
    };
  }

  const [conflictingWorkspace] = await db
    .select({ id: workspaces.id })
    .from(workspaces)
    .where(and(eq(workspaces.slug, values.slug), ne(workspaces.id, workspaceId)))
    .limit(1);

  if (conflictingWorkspace) {
    return {
      ok: false,
      reason: "slug-taken",
    };
  }

  const now = new Date();
  const logoFile = values.logo;
  const storageClient = logoFile ? createSupabaseAdminClient() : null;
  const previousLogoStoragePath = currentWorkspace.logoStoragePath;
  const nextLogoContentType = logoFile
    ? resolveSafeContentType(logoFile, {
        extensionToMimeType: workspaceLogoExtensionToMimeType,
        fallback: "application/octet-stream",
      })
    : null;
  const nextLogoStoragePath =
    logoFile && storageClient
      ? `${workspaceId}/logo/${createId("asset")}-${sanitizeWorkspaceLogoFileName(
          logoFile.name,
        )}`
      : null;

  if (nextLogoStoragePath && storageClient && logoFile) {
    const { error } = await storageClient.storage
      .from(workspaceLogoBucket)
      .upload(nextLogoStoragePath, logoFile, {
        contentType: nextLogoContentType ?? "application/octet-stream",
        upsert: false,
      });

    if (error) {
      throw new Error(`Failed to upload workspace logo: ${error.message}`);
    }
  }

  try {
    await db.transaction(async (tx) => {
      await tx
        .update(workspaces)
        .set({
          name: values.name,
          slug: values.slug,
          shortDescription: values.shortDescription ?? null,
          contactEmail: values.contactEmail ?? null,
          logoStoragePath: values.removeLogo
            ? nextLogoStoragePath
            : nextLogoStoragePath ?? previousLogoStoragePath ?? null,
          logoContentType: values.removeLogo
            ? nextLogoContentType
            : nextLogoContentType ?? currentWorkspace.logoContentType ?? null,
          defaultEmailSignature: values.defaultEmailSignature ?? null,
          defaultQuoteNotes: values.defaultQuoteNotes ?? null,
          aiTonePreference: values.aiTonePreference,
          notifyOnNewInquiry: values.notifyOnNewInquiry,
          notifyOnQuoteSent: values.notifyOnQuoteSent,
          defaultCurrency: values.defaultCurrency,
          updatedAt: now,
        })
        .where(eq(workspaces.id, workspaceId));

      await tx.insert(activityLogs).values({
        id: createId("act"),
        workspaceId,
        actorUserId,
        type: "workspace.settings_updated",
        summary: "Workspace settings updated.",
        metadata: {
          slug: values.slug,
          hasLogo: Boolean(logoFile || previousLogoStoragePath) && !values.removeLogo,
          aiTonePreference: values.aiTonePreference,
        },
        createdAt: now,
        updatedAt: now,
      });
    });
  } catch (error) {
    if (nextLogoStoragePath && storageClient) {
      const { error: cleanupError } = await storageClient.storage
        .from(workspaceLogoBucket)
        .remove([nextLogoStoragePath]);

      if (cleanupError) {
        console.error(
          "Failed to clean up uploaded workspace logo after a database error.",
          cleanupError,
        );
      }
    }

    throw error;
  }

  const shouldRemovePreviousLogo =
    previousLogoStoragePath &&
    ((Boolean(nextLogoStoragePath) && nextLogoStoragePath !== previousLogoStoragePath) ||
      (values.removeLogo && !nextLogoStoragePath));

  if (shouldRemovePreviousLogo) {
    const storageClient = createSupabaseAdminClient();
    const { error } = await storageClient.storage
      .from(workspaceLogoBucket)
      .remove([previousLogoStoragePath]);

    if (error) {
      console.error("Failed to clean up the previous workspace logo.", error);
    }
  }

  return {
    ok: true,
    previousSlug: currentWorkspace.slug,
    nextSlug: values.slug,
  };
}

export async function updateWorkspaceInquiryPageSettings({
  workspaceId,
  actorUserId,
  values,
}: UpdateWorkspaceInquiryPageInput): Promise<UpdateWorkspaceSettingsResult> {
  const [currentWorkspace] = await db
    .select({
      id: workspaces.id,
      slug: workspaces.slug,
    })
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId))
    .limit(1);

  if (!currentWorkspace) {
    return {
      ok: false,
      reason: "not-found",
    };
  }

  const now = new Date();

  await db.transaction(async (tx) => {
    await tx
      .update(workspaces)
      .set({
        publicInquiryEnabled: values.publicInquiryEnabled,
        inquiryPageConfig: {
          template: values.template,
          eyebrow: values.eyebrow,
          headline: values.headline,
          description: values.description,
          brandTagline: values.brandTagline,
          formTitle: values.formTitle,
          formDescription: values.formDescription,
          cards: values.cards,
        },
        updatedAt: now,
      })
      .where(eq(workspaces.id, workspaceId));

    await tx.insert(activityLogs).values({
      id: createId("act"),
      workspaceId,
      actorUserId,
      type: "workspace.inquiry_page_updated",
      summary: "Inquiry page settings updated.",
      metadata: {
        publicInquiryEnabled: values.publicInquiryEnabled,
        template: values.template,
        cardCount: values.cards.length,
      },
      createdAt: now,
      updatedAt: now,
    });
  });

  return {
    ok: true,
    previousSlug: currentWorkspace.slug,
    nextSlug: currentWorkspace.slug,
  };
}
