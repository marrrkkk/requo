/** Workspace route helpers. */

export const workspacesHubPath = "/workspaces";

export function getWorkspacePath(slug: string) {
  return `${workspacesHubPath}/${slug}`;
}

export function getWorkspaceSettingsPath(slug: string) {
  return `${getWorkspacePath(slug)}/settings`;
}
