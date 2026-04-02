import "server-only";

import { eq } from "drizzle-orm";

import type { WorkspaceSettingsView } from "@/features/settings/types";
import { db } from "@/lib/db/client";
import { workspaces } from "@/lib/db/schema";

export async function getWorkspaceSettingsForWorkspace(
  workspaceId: string,
): Promise<WorkspaceSettingsView | null> {
  const [workspace] = await db
    .select({
      id: workspaces.id,
      name: workspaces.name,
      slug: workspaces.slug,
      shortDescription: workspaces.shortDescription,
      contactEmail: workspaces.contactEmail,
      logoStoragePath: workspaces.logoStoragePath,
      logoContentType: workspaces.logoContentType,
      publicInquiryEnabled: workspaces.publicInquiryEnabled,
      inquiryHeadline: workspaces.inquiryHeadline,
      defaultEmailSignature: workspaces.defaultEmailSignature,
      defaultQuoteNotes: workspaces.defaultQuoteNotes,
      aiTonePreference: workspaces.aiTonePreference,
      notifyOnNewInquiry: workspaces.notifyOnNewInquiry,
      notifyOnQuoteSent: workspaces.notifyOnQuoteSent,
      defaultCurrency: workspaces.defaultCurrency,
      updatedAt: workspaces.updatedAt,
    })
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId))
    .limit(1);

  return workspace ?? null;
}

export async function getWorkspaceLogoAssetForWorkspace(workspaceId: string) {
  const [workspace] = await db
    .select({
      logoStoragePath: workspaces.logoStoragePath,
      logoContentType: workspaces.logoContentType,
    })
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId))
    .limit(1);

  return workspace ?? null;
}
