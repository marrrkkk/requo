import type { Metadata } from "next";

import { ChatNewPageView } from "@/features/ai/chat-ui/chat-new-page-view";
import { getAppShellContext } from "@/lib/app-shell/context";
import { createNoIndexMetadata } from "@/lib/seo/site";

type ChatNewPageProps = {
  params: Promise<{ businessSlug: string }>;
};

export const metadata: Metadata = createNoIndexMetadata({
  title: "New Chat",
  description: "Start a new AI assistant conversation.",
});

export default async function ChatNewPage({ params }: ChatNewPageProps) {
  const { businessSlug } = await params;
  const { user, businessContext } = await getAppShellContext(businessSlug);

  return (
    <div className="chat-page-container">
      <ChatNewPageView
        businessSlug={businessSlug}
        userId={user.id}
        businessId={businessContext.business.id}
        userName={user.name || "You"}
      />
    </div>
  );
}
