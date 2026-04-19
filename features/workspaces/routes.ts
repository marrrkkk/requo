/** Workspace route helpers. */

export const workspacesHubPath = "/workspaces";

export type WorkspaceSettingsSection = "general" | "billing" | "audit-log";

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
