"use client";

import { Crisp } from "crisp-sdk-web";
import { useEffect } from "react";

type CrispChatWidgetProps = {
  websiteId?: string | null;
};

declare global {
  interface Window {
    __requoCrispConfigured?: boolean;
  }
}

/**
 * Initializes Crisp once for the current browser session.
 * Route-level mounts are safe because initialization is globally guarded.
 */
export function CrispChatWidget({ websiteId }: CrispChatWidgetProps) {
  useEffect(() => {
    if (!websiteId || typeof window === "undefined") {
      return;
    }

    if (window.__requoCrispConfigured) {
      Crisp.chat.show();
      return;
    }

    Crisp.configure(websiteId);
    window.__requoCrispConfigured = true;
  }, [websiteId]);

  return null;
}

export function openCrispHelp() {
  if (typeof window === "undefined" || !window.__requoCrispConfigured) {
    console.warn("Crisp is not configured");
    return false;
  }
  Crisp.chat.open();
  return true;
}

export function openCrispHelpdesk() {
  if (typeof window === "undefined" || !window.__requoCrispConfigured) {
    console.warn("Crisp is not configured");
    return false;
  }
  Crisp.chat.setHelpdeskView();
  Crisp.chat.open();
  return true;
}
