import {
  themeCookieKey,
  themeCookieMaxAgeSeconds,
  themeStorageKey,
  type ThemePreference,
} from "@/features/theme/types";
import {
  defaultUiScale,
  uiScaleCookieKey,
  uiScaleRootFontSizePercent,
  uiScaleStorageKey,
  type UiScale,
} from "@/features/theme/ui-scale-types";

type ThemeInitScriptOptions = {
  cookieKey?: string;
  defaultTheme?: ThemePreference;
  enableSystem?: boolean;
  storageKey?: string;
  scaleCookieKey?: string;
  scaleStorageKey?: string;
  defaultScale?: UiScale;
};

export function getThemeInitScript({
  cookieKey = themeCookieKey,
  defaultTheme = "system",
  enableSystem = true,
  storageKey = themeStorageKey,
  scaleCookieKey = uiScaleCookieKey,
  scaleStorageKey = uiScaleStorageKey,
  defaultScale = defaultUiScale,
}: ThemeInitScriptOptions = {}) {
  return `(function(){try{var cookieKey=${JSON.stringify(cookieKey)};var storageKey=${JSON.stringify(storageKey)};var defaultTheme=${JSON.stringify(defaultTheme)};var enableSystem=${JSON.stringify(enableSystem)};var cookiePrefix=cookieKey+"=";var readCookie=function(){var cookies=document.cookie?document.cookie.split("; "):[];for(var index=0;index<cookies.length;index+=1){if(cookies[index].indexOf(cookiePrefix)===0){return decodeURIComponent(cookies[index].slice(cookiePrefix.length));}}return null;};var storedTheme=localStorage.getItem(storageKey);if(!(storedTheme==="light"||storedTheme==="dark"||storedTheme==="system")){storedTheme=readCookie();}var theme=storedTheme==="light"||storedTheme==="dark"||storedTheme==="system"?storedTheme:defaultTheme;var resolvedTheme=theme==="dark"?"dark":theme==="system"&&enableSystem&&window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";var root=document.documentElement;root.classList.toggle("dark",resolvedTheme==="dark");root.style.colorScheme=resolvedTheme;var scaleCookieKey=${JSON.stringify(scaleCookieKey)};var scaleStorageKey=${JSON.stringify(scaleStorageKey)};var defaultScale=${JSON.stringify(defaultScale)};var scalePercents=${JSON.stringify(uiScaleRootFontSizePercent)};var scaleCookiePrefix=scaleCookieKey+"=";var readScaleCookie=function(){var cookies=document.cookie?document.cookie.split("; "):[];for(var index=0;index<cookies.length;index+=1){if(cookies[index].indexOf(scaleCookiePrefix)===0){return decodeURIComponent(cookies[index].slice(scaleCookiePrefix.length));}}return null;};var storedScale=localStorage.getItem(scaleStorageKey);if(!(storedScale==="small"||storedScale==="default"||storedScale==="large")){storedScale=readScaleCookie();}var scale=storedScale==="small"||storedScale==="default"||storedScale==="large"?storedScale:defaultScale;root.dataset.uiScale=scale;var percent=scalePercents[scale]||100;root.style.fontSize=percent+"%";}catch(e){}})();`;
}

type ThemePreferenceBootstrapScriptOptions = {
  cookieKey?: string;
  enableSystem?: boolean;
  storageKey?: string;
  themePreference: ThemePreference;
};

export function getThemePreferenceBootstrapScript({
  cookieKey = themeCookieKey,
  enableSystem = true,
  storageKey = themeStorageKey,
  themePreference,
}: ThemePreferenceBootstrapScriptOptions) {
  return `(function(){try{var cookieKey=${JSON.stringify(cookieKey)};var enableSystem=${JSON.stringify(enableSystem)};var maxAge=${JSON.stringify(themeCookieMaxAgeSeconds)};var storageKey=${JSON.stringify(storageKey)};var theme=${JSON.stringify(themePreference)};var secureFlag=window.location.protocol==="https:"?"; Secure":"";localStorage.setItem(storageKey,theme);document.cookie=cookieKey+"="+encodeURIComponent(theme)+"; Path=/; Max-Age="+maxAge+"; SameSite=Lax"+secureFlag;var resolvedTheme=theme==="dark"?"dark":theme==="system"&&enableSystem&&window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";var root=document.documentElement;root.classList.toggle("dark",resolvedTheme==="dark");root.style.colorScheme=resolvedTheme;}catch(e){}})();`;
}
