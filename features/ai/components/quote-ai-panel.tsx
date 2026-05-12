"use client";

import { AIChatPopover } from "@/features/ai/components/ai-chat-popover";
import type { BusinessPlan as plan } from "@/lib/plans/plans";

type QuoteAiPanelProps = {
  businessSlug: string;
  quoteId: string;
  userName: string;
  plan: plan;
};

export function QuoteAiPanel({
  businessSlug,
  quoteId,
  userName,
  plan,
}: QuoteAiPanelProps) {
  return (
    <AIChatPopover
      businessSlug={businessSlug}
      entityId={quoteId}
      surface="quote"
      title="Quote Assistant"
      userName={userName}
      plan={plan}
    />
  );
}
