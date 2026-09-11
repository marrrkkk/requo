import {
  isUiScale,
  uiScaleCookieKey,
  uiScaleCookieMaxAgeSeconds,
  uiScaleStorageKey,
  type UiScale,
} from "@/features/theme/ui-scale-types";

type UiScalePersistenceOptions = {
  cookieKey?: string;
  storageKey?: string;
};

export function persistUiScalePreference(
  scale: UiScale,
  {
    cookieKey = uiScaleCookieKey,
    storageKey = uiScaleStorageKey,
  }: UiScalePersistenceOptions = {},
) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(storageKey, scale);
  } catch {}

  document.cookie = serializeUiScaleCookie(
    cookieKey,
    scale,
    uiScaleCookieMaxAgeSeconds,
  );
}

export function clearPersistedUiScalePreference({
  cookieKey = uiScaleCookieKey,
  storageKey = uiScaleStorageKey,
}: UiScalePersistenceOptions = {}) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.removeItem(storageKey);
  } catch {}

  document.cookie = serializeUiScaleCookie(cookieKey, "", 0);
}

export function readPersistedUiScalePreference({
  cookieKey = uiScaleCookieKey,
  storageKey = uiScaleStorageKey,
}: UiScalePersistenceOptions = {}): UiScale | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const storedScale = window.localStorage.getItem(storageKey);

    if (storedScale && isUiScale(storedScale)) {
      return storedScale;
    }
  } catch {}

  const cookiePrefix = `${cookieKey}=`;
  const scaleCookie = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(cookiePrefix));

  if (!scaleCookie) {
    return null;
  }

  const cookieValue = decodeURIComponent(
    scaleCookie.slice(cookiePrefix.length),
  );

  return isUiScale(cookieValue) ? cookieValue : null;
}

function serializeUiScaleCookie(
  cookieKey: string,
  value: string,
  maxAgeSeconds: number,
) {
  const secureFlag = window.location.protocol === "https:" ? "; Secure" : "";

  return `${cookieKey}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAgeSeconds}; SameSite=Lax${secureFlag}`;
}
