export const themePreferences = ["light", "dark", "system"] as const;

export type ThemePreference = (typeof themePreferences)[number];

export const themeStorageKey = "requo-theme";
export const themeCookieKey = "requo-theme";
export const themeUserStorageKey = "requo-theme-user";
export const themeCookieMaxAgeSeconds = 60 * 60 * 24 * 365;

export const themePreferenceLabels: Record<ThemePreference, string> = {
  light: "Light",
  dark: "Dark",
  system: "System",
};

export function isThemePreference(value: string): value is ThemePreference {
  return themePreferences.includes(value as ThemePreference);
}
