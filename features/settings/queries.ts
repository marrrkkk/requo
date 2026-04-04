import "server-only";

import { eq } from "drizzle-orm";

import { getNormalizedInquiryPageConfig } from "@/features/inquiries/page-config";
import type {
  WorkspaceInquiryPageSettingsView,
  WorkspaceSettingsView,
} from "@/features/settings/types";
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

export async function getWorkspaceInquiryPageSettingsForWorkspace(
  workspaceId: string,
): Promise<WorkspaceInquiryPageSettingsView | null> {
  const [workspace] = await db
    .select({
      id: workspaces.id,
      name: workspaces.name,
      slug: workspaces.slug,
      shortDescription: workspaces.shortDescription,
      logoStoragePath: workspaces.logoStoragePath,
      updatedAt: workspaces.updatedAt,
      publicInquiryEnabled: workspaces.publicInquiryEnabled,
      inquiryHeadline: workspaces.inquiryHeadline,
      inquiryPageConfig: workspaces.inquiryPageConfig,
    })
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId))
    .limit(1);

  if (!workspace) {
    return null;
  }

  return {
    id: workspace.id,
    name: workspace.name,
    slug: workspace.slug,
    shortDescription: workspace.shortDescription,
    logoStoragePath: workspace.logoStoragePath,
    publicInquiryEnabled: workspace.publicInquiryEnabled,
    inquiryPageConfig: getNormalizedInquiryPageConfig(workspace.inquiryPageConfig, {
      workspaceName: workspace.name,
      workspaceShortDescription: workspace.shortDescription,
      legacyInquiryHeadline: workspace.inquiryHeadline,
    }),
    updatedAt: workspace.updatedAt,
  };
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
