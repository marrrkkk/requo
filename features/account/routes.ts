import { getBusinessSettingsPath } from "@/features/businesses/routes";

export const legacyAccountProfilePath = "/account/profile";

export function getProfileSettingsPath(slug: string) {
  return getBusinessSettingsPath(slug, "profile");
}
