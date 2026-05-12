"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";

import { AIChatPopover } from "@/features/ai/components/ai-chat-popover";
import type { AiSurface } from "@/features/ai/types";

import type { BusinessPlan as plan } from "@/lib/plans/plans";

type DashboardAiPanelProps = {
  businessId: string;
  businessSlug: string;
  userName: string;
  plan: plan;
};

/**
 * Matches entity detail routes like:
 * /dashboard/inquiries/inq_abc123
 * /dashboard/quotes/quo_abc123
 * Does NOT match /dashboard/inquiries/new or list pages.
 */
const entityDetailPattern =
  /\/dashboard\/(inquiries|quotes)\/(?!new(?:\/|$))([^/]+)\/?$/;

type AiContext = {
  surface: AiSurface;
  entityId: string;
};

function resolveAiContext(pathname: string): AiContext {
  const match = entityDetailPattern.exec(pathname);

  if (!match) {
    return {
      surface: "dashboard",
      entityId: "global",
    };
  }

  const [, entityType, entityId] = match;

  if (entityType === "inquiries") {
    return {
      surface: "inquiry",
      entityId: entityId!,
    };
  }

  return {
    surface: "quote",
    entityId: entityId!,
  };
}

export function DashboardAiPanel({
  businessSlug,
  userName,
  plan,
}: DashboardAiPanelProps) {
  const pathname = usePathname();
  const context = useMemo(() => resolveAiContext(pathname), [pathname]);

  return (
    <AIChatPopover
      businessSlug={businessSlug}
      entityId={context.entityId}
      surface={context.surface}
      title="Requo AI"
      userName={userName}
      plan={plan}
    />
  );
}
