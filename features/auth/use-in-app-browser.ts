"use client";

import { useSyncExternalStore } from "react";

/**
 * Known in-app browser user-agent indicators.
 * Google blocks OAuth from these embedded browsers (error 403: disallowed_useragent).
 */
const IN_APP_BROWSER_PATTERNS = [
  /FBAN|FBAV/i, // Facebook / Messenger
  /Instagram/i, // Instagram
  /Twitter/i, // Twitter / X
  /Line\//i, // LINE
  /Snapchat/i, // Snapchat
  /Pinterest/i, // Pinterest
  /LinkedIn/i, // LinkedIn
  /MicroMessenger/i, // WeChat
  /QQ\//i, // QQ
  /TikTok/i, // TikTok
  /Telegram/i, // Telegram (some versions)
  /\bwv\b/i, // Android WebView
];

export type InAppBrowserInfo = {
  isInAppBrowser: boolean;
  /** Best-effort app name for display (e.g. "Facebook", "Instagram"). */
  appName: string | null;
};

const DEFAULT_INFO: InAppBrowserInfo = { isInAppBrowser: false, appName: null };

// Stable references for useSyncExternalStore (user-agent never changes mid-session)
const subscribe = () => () => {};
let cachedSnapshot: InAppBrowserInfo | null = null;
function getSnapshot(): InAppBrowserInfo {
  if (cachedSnapshot === null) {
    cachedSnapshot = detectInAppBrowser(navigator.userAgent);
  }
  return cachedSnapshot;
}
function getServerSnapshot(): InAppBrowserInfo {
  return DEFAULT_INFO;
}

/**
 * Detects whether the current page is rendered inside an in-app browser
 * (e.g. Facebook Messenger, Instagram, TikTok).
 *
 * Returns `{ isInAppBrowser: false, appName: null }` during SSR and on
 * standard browsers.
 */
export function useInAppBrowser(): InAppBrowserInfo {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

function detectInAppBrowser(ua: string): InAppBrowserInfo {
  for (const pattern of IN_APP_BROWSER_PATTERNS) {
    if (pattern.test(ua)) {
      return { isInAppBrowser: true, appName: resolveAppName(ua) };
    }
  }
  return { isInAppBrowser: false, appName: null };
}

function resolveAppName(ua: string): string | null {
  if (/FBAN|FBAV/i.test(ua)) return "Facebook";
  if (/Instagram/i.test(ua)) return "Instagram";
  if (/Twitter/i.test(ua)) return "X (Twitter)";
  if (/Line\//i.test(ua)) return "LINE";
  if (/Snapchat/i.test(ua)) return "Snapchat";
  if (/Pinterest/i.test(ua)) return "Pinterest";
  if (/LinkedIn/i.test(ua)) return "LinkedIn";
  if (/MicroMessenger/i.test(ua)) return "WeChat";
  if (/QQ\//i.test(ua)) return "QQ";
  if (/TikTok/i.test(ua)) return "TikTok";
  if (/Telegram/i.test(ua)) return "Telegram";
  return null;
}
