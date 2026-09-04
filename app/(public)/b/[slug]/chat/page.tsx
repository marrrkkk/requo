import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ChatInterface } from "@/features/ai-agent/components/chat-interface";
import { getPublicAgentBusiness } from "@/features/ai-agent/queries";
import { getBusinessPublicInquiryUrl } from "@/features/settings/utils";
import { hasFeatureAccess } from "@/lib/plans/entitlements";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const business = await getPublicAgentBusiness(slug);

  if (!business || !business.aiAgentEnabled) {
    return { title: "Chat" };
  }

  return {
    title: `Chat with ${business.name}`,
    description:
      business.shortDescription ??
      `Chat with ${business.name} to get a quote for your project.`,
    robots: { index: false, follow: false },
  };
}

/**
 * Public AI agent chat page at `/b/[slug]/chat`.
 *
 * Only renders when `ai_agent_enabled` is true for the business.
 * Returns 404 otherwise so the route is not discoverable for disabled agents.
 */
export default async function AgentChatPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const business = await getPublicAgentBusiness(slug);

  if (!business || !business.aiAgentEnabled) {
    notFound();
  }

  return (
    <ChatInterface
      businessSlug={business.slug}
      businessName={business.name}
      businessDescription={business.shortDescription}
      showWatermark={!hasFeatureAccess(business.plan, "removeWatermark")}
      fallbackFormHref={getBusinessPublicInquiryUrl(business.slug)}
    />
  );
}
