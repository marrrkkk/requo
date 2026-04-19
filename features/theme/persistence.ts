import {
  isThemePreference,
  themeCookieKey,
  themeCookieMaxAgeSeconds,
  themeStorageKey,
  type ThemePreference,
} from "@/features/theme/types";

type ThemePersistenceOptions = {
  cookieKey?: string;
  storageKey?: string;
};

export function persistThemePreference(
  theme: ThemePreference,
  {
    cookieKey = themeCookieKey,
    storageKey = themeStorageKey,
  }: ThemePersistenceOptions = {},
) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(storageKey, theme);
  } catch {}

  document.cookie = serializeThemeCookie(cookieKey, theme, themeCookieMaxAgeSeconds);
}

export function clearPersistedThemePreference({
  cookieKey = themeCookieKey,
  storageKey = themeStorageKey,
}: ThemePersistenceOptions = {}) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.removeItem(storageKey);
  } catch {}

  document.cookie = serializeThemeCookie(cookieKey, "", 0);
}

export function readPersistedThemePreference({
  cookieKey = themeCookieKey,
  storageKey = themeStorageKey,
}: ThemePersistenceOptions = {}): ThemePreference | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const storedTheme = window.localStorage.getItem(storageKey);

    if (storedTheme && isThemePreference(storedTheme)) {
      return storedTheme;
    }
  } catch {}

  const cookiePrefix = `${cookieKey}=`;
  const themeCookie = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(cookiePrefix));

  if (!themeCookie) {
    return null;
  }

  const cookieValue = decodeURIComponent(themeCookie.slice(cookiePrefix.length));

  return isThemePreference(cookieValue) ? cookieValue : null;
}

function serializeThemeCookie(
  cookieKey: string,
  value: string,
  maxAgeSeconds: number,
) {
  const secureFlag = window.location.protocol === "https:" ? "; Secure" : "";

  return `${cookieKey}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAgeSeconds}; SameSite=Lax${secureFlag}`;
}
