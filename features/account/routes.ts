export const accountPath = "/account";

export type AccountSettingsSection = "profile" | "security";

export function getAccountSettingsPath(section?: AccountSettingsSection) {
  return section ? `${accountPath}/${section}` : accountPath;
}

export function getAccountProfilePath() {
  return getAccountSettingsPath("profile");
}

export function getAccountSecurityPath() {
  return getAccountSettingsPath("security");
}

/**
 * Backward-compatible alias while older call sites are moved off
 * business-scoped account settings URLs.
 */
export function getProfileSettingsPath(_slug?: string) {
  void _slug;
  return getAccountProfilePath();
}
