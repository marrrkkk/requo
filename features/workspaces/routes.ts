/** Workspace route helpers. */

export const workspacesHubPath = "/workspaces";


export type WorkspaceSettingsSection = "general" | "billing" | "audit-log" | "members";

export function getWorkspacePath(slug: string) {
  return `${workspacesHubPath}/${slug}`;
}

export function getWorkspaceSettingsPath(
  slug: string,
  section?: WorkspaceSettingsSection,
) {
  const basePath = `${getWorkspacePath(slug)}/settings`;

  return section ? `${basePath}/${section}` : basePath;
}

export function getWorkspaceMembersPath(slug: string) {
  return getWorkspaceSettingsPath(slug, "members");
}

export function getWorkspaceAuditLogExportPath(slug: string) {
  return `/api/workspaces/${slug}/audit-log/export`;
}
