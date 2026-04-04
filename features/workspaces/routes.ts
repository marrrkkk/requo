export const workspaceHubPath = "/workspace";
export const activeWorkspaceSlugCookieName = "relay-active-workspace";

export type WorkspaceSettingsSection =
  | "general"
  | "inquiry-page"
  | "pricing-library"
  | "knowledge";

export function getWorkspacePath(slug: string) {
  return `${workspaceHubPath}/${slug}`;
}

export function getWorkspaceDashboardPath(slug: string) {
  return `${getWorkspacePath(slug)}/dashboard`;
}

export function getWorkspaceAnalyticsPath(slug: string) {
  return `${getWorkspaceDashboardPath(slug)}/analytics`;
}

export function getWorkspaceInquiriesPath(slug: string) {
  return `${getWorkspaceDashboardPath(slug)}/inquiries`;
}

export function getWorkspaceInquiryPath(slug: string, inquiryId: string) {
  return `${getWorkspaceInquiriesPath(slug)}/${inquiryId}`;
}

export function getWorkspaceQuotesPath(slug: string) {
  return `${getWorkspaceDashboardPath(slug)}/quotes`;
}

export function getWorkspaceNewQuotePath(
  slug: string,
  inquiryId?: string | null,
) {
  const basePath = `${getWorkspaceQuotesPath(slug)}/new`;

  if (!inquiryId) {
    return basePath;
  }

  const searchParams = new URLSearchParams({
    inquiryId,
  });

  return `${basePath}?${searchParams.toString()}`;
}

export function getWorkspaceQuotePath(slug: string, quoteId: string) {
  return `${getWorkspaceQuotesPath(slug)}/${quoteId}`;
}

export function getWorkspaceSettingsPath(
  slug: string,
  section: WorkspaceSettingsSection = "general",
) {
  return `${getWorkspaceDashboardPath(slug)}/settings/${section}`;
}

export function getWorkspaceInquiryPagePreviewPath(slug: string) {
  return `${getWorkspaceSettingsPath(slug, "inquiry-page")}/preview`;
}

export function getWorkspaceKnowledgeCompatibilityPath(slug: string) {
  return `${getWorkspaceDashboardPath(slug)}/knowledge`;
}

export function getWorkspaceDashboardSlugFromPathname(pathname: string) {
  const match = /^\/workspace\/([^/]+)\/dashboard(?:\/|$)/.exec(pathname);

  return match ? decodeURIComponent(match[1]) : null;
}
