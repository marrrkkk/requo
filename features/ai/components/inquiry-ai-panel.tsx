"use client";

import { AIChatPopover } from "@/features/ai/components/ai-chat-popover";
import type { WorkspacePlan } from "@/lib/plans";

type InquiryAiPanelProps = {
  businessSlug: string;
  inquiryId: string;
  userName: string;
  workspacePlan: WorkspacePlan;
};

export function InquiryAiPanel({
  businessSlug,
  inquiryId,
  userName,
  workspacePlan,
}: InquiryAiPanelProps) {
  return (
    <AIChatPopover
      businessSlug={businessSlug}
      entityId={inquiryId}
      surface="inquiry"
      title="Inquiry Assistant"
      userName={userName}
      workspacePlan={workspacePlan}
    />
  );
}
