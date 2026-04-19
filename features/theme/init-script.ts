import {
  themeCookieKey,
  themeCookieMaxAgeSeconds,
  themeStorageKey,
  type ThemePreference,
} from "@/features/theme/types";

type ThemeInitScriptOptions = {
  cookieKey?: string;
  defaultTheme?: ThemePreference;
  enableSystem?: boolean;
  storageKey?: string;
};

export function getThemeInitScript({
  cookieKey = themeCookieKey,
  defaultTheme = "system",
  enableSystem = true,
  storageKey = themeStorageKey,
}: ThemeInitScriptOptions = {}) {
  return `(function(){try{var cookieKey=${JSON.stringify(cookieKey)};var storageKey=${JSON.stringify(storageKey)};var defaultTheme=${JSON.stringify(defaultTheme)};var enableSystem=${JSON.stringify(enableSystem)};var cookiePrefix=cookieKey+"=";var readCookie=function(){var cookies=document.cookie?document.cookie.split("; "):[];for(var index=0;index<cookies.length;index+=1){if(cookies[index].indexOf(cookiePrefix)===0){return decodeURIComponent(cookies[index].slice(cookiePrefix.length));}}return null;};var storedTheme=localStorage.getItem(storageKey);if(!(storedTheme==="light"||storedTheme==="dark"||storedTheme==="system")){storedTheme=readCookie();}var theme=storedTheme==="light"||storedTheme==="dark"||storedTheme==="system"?storedTheme:defaultTheme;var resolvedTheme=theme==="dark"?"dark":theme==="system"&&enableSystem&&window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";var root=document.documentElement;root.classList.toggle("dark",resolvedTheme==="dark");root.style.colorScheme=resolvedTheme;}catch(e){}})();`;
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
