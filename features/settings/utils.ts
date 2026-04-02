import type { WorkspaceAiTonePreference } from "@/features/settings/types";

export const workspaceLogoBucket = "workspace-assets";
export const workspaceLogoMaxSize = 2 * 1024 * 1024;
export const workspaceLogoAllowedMimeTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;
export const workspaceLogoAccept = [".jpg", ".jpeg", ".png", ".webp"].join(",");

export function normalizeWorkspaceSlug(value: string) {
  return value.trim().toLowerCase();
}

export function sanitizeWorkspaceLogoFileName(fileName: string) {
  const normalized = fileName
    .normalize("NFKD")
    .replace(/[^\w.\-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();

  return normalized.slice(0, 120) || "workspace-logo";
}

export function formatWorkspaceAiToneLabel(value: WorkspaceAiTonePreference) {
  switch (value) {
    case "balanced":
      return "Balanced";
    case "warm":
      return "Warm";
    case "direct":
      return "Direct";
    case "formal":
      return "Formal";
  }
}

export function getWorkspacePublicInquiryUrl(slug: string) {
  return `/inquire/${slug}`;
}
