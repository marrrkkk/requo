"use client";

import { AIChatPopover } from "@/features/ai/components/ai-chat-popover";
import type { BusinessPlan as plan } from "@/lib/plans/plans";

type InquiryAiPanelProps = {
  businessSlug: string;
  inquiryId: string;
  userName: string;
  plan: plan;
};

export function InquiryAiPanel({
  businessSlug,
  inquiryId,
  userName,
  plan,
}: InquiryAiPanelProps) {
  return (
    <AIChatPopover
      businessSlug={businessSlug}
      entityId={inquiryId}
      surface="inquiry"
      title="Inquiry Assistant"
      userName={userName}
      plan={plan}
    />
  );
}
