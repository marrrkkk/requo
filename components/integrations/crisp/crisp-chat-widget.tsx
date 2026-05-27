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
  Crisp.chat.open();
}

export function openCrispHelpdesk() {
  Crisp.chat.setHelpdeskView();
  Crisp.chat.open();
}
