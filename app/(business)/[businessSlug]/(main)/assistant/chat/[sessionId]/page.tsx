import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getBusinessAssistantPath } from "@/features/businesses/routes";
import { createNoIndexMetadata } from "@/lib/seo/site";

type LegacyAssistantChatPageProps = {
  params: Promise<{ businessSlug: string; sessionId: string }>;
  searchParams: Promise<{ q?: string }>;
};

export const metadata: Metadata = createNoIndexMetadata({
  title: "Assistant Chat",
  description: "Chat with your business assistant",
});

/**
 * Legacy conversation URL — forwards to `/[businessSlug]/assistant?session=…`.
 *
 * Which conversation is open moved into a search param so that minting a
 * session no longer changes the page segment: a path change made the router's
 * canonical URL disagree with the mounted page, and the next refresh resolved
 * it by remounting the Assistant mid-stream. Old links and bookmarks land here.
 */
export default async function LegacyAssistantChatPage({
  params,
  searchParams,
}: LegacyAssistantChatPageProps) {
  const { businessSlug, sessionId } = await params;
  const { q } = await searchParams;

  const query = new URLSearchParams({ session: sessionId });
  if (typeof q === "string" && q.trim()) query.set("q", q);

  redirect(`${getBusinessAssistantPath(businessSlug)}?${query.toString()}`);
}
