import { env } from "@/lib/env";

import { CrispChatWidget } from "./crisp-chat-widget";

export function CrispChatWidgetServer() {
  if (!env.CRISP_WEBSITE_ID) {
    return null;
  }

  return <CrispChatWidget websiteId={env.CRISP_WEBSITE_ID} />;
}
