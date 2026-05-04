"use client";

import { AIChatPopover } from "@/features/ai/components/ai-chat-popover";
import type { WorkspacePlan } from "@/lib/plans";

type QuoteAiPanelProps = {
  businessSlug: string;
  quoteId: string;
  userName: string;
  workspacePlan: WorkspacePlan;
};

export function QuoteAiPanel({
  businessSlug,
  quoteId,
  userName,
  workspacePlan,
}: QuoteAiPanelProps) {
  return (
    <AIChatPopover
      businessSlug={businessSlug}
      entityId={quoteId}
      surface="quote"
      title="Quote Assistant"
      userName={userName}
      workspacePlan={workspacePlan}
    />
  );
}
