import { getBusinessSettingsPath } from "@/features/businesses/routes";

export function getProfileSettingsPath(slug: string) {
  return getBusinessSettingsPath(slug, "profile");
}
