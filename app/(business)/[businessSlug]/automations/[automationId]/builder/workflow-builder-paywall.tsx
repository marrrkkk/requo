"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FeaturePreviewPaywall } from "@/features/paywall";
import type { BusinessPlan } from "@/lib/plans/plans";

type WorkflowBuilderPaywallProps = {
  businessSlug: string;
  plan: BusinessPlan;
  userId: string;
  businessId: string;
};

/**
 * Demo preview content shown behind the paywall.
 * Renders a simplified, non-interactive visual of what the builder looks like.
 */
function BuilderPreview() {
  return (
    <div className="flex h-[70vh] items-center justify-center">
      <div className="flex flex-col items-center gap-6 opacity-60">
        {/* Simulated node flow */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-12 w-48 items-center justify-center rounded-lg border border-border bg-surface-card text-sm font-medium shadow-sm">
            🎯 Trigger: Quote Sent
          </div>
          <div className="h-8 w-px bg-border" />
          <div className="flex h-12 w-48 items-center justify-center rounded-lg border border-border bg-surface-card text-sm font-medium shadow-sm">
            ⏱️ Wait 3 days
          </div>
          <div className="h-8 w-px bg-border" />
          <div className="flex h-12 w-56 items-center justify-center rounded-lg border border-amber-200 bg-amber-50 text-sm font-medium shadow-sm dark:border-amber-900 dark:bg-amber-950">
            ❓ Quote viewed?
          </div>
          <div className="flex gap-12">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-px bg-border" />
              <div className="flex h-12 w-40 items-center justify-center rounded-lg border border-green-200 bg-green-50 text-sm font-medium shadow-sm dark:border-green-900 dark:bg-green-950">
                ✅ Send follow-up
              </div>
            </div>
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-px bg-border" />
              <div className="flex h-12 w-40 items-center justify-center rounded-lg border border-border bg-surface-card text-sm font-medium shadow-sm">
                ⏭️ Skip
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function WorkflowBuilderPaywall({
  businessSlug,
  plan,
  userId,
  businessId,
}: WorkflowBuilderPaywallProps) {
  const router = useRouter();

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden">
      {/* Top bar */}
      <header className="flex h-14 shrink-0 items-center border-b border-border bg-surface-card px-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => router.push(`/${businessSlug}/automations`)}
            aria-label="Back to automations"
          >
            <ArrowLeft className="size-4" />
          </Button>
          <div className="flex flex-col">
            <h1 className="text-sm font-medium leading-tight">
              Workflow Builder
            </h1>
            <p className="text-xs text-muted-foreground">
              Visual multi-step automation editor
            </p>
          </div>
        </div>
      </header>

      {/* Paywall content */}
      <div className="flex-1 overflow-y-auto p-6">
        <FeaturePreviewPaywall
          feature="workflowBuilder"
          plan={plan}
          previewContent={<BuilderPreview />}
          description="Build multi-step workflows with conditions, delays, and branching logic using the visual drag-and-drop editor."
          upgradeAction={{
            currentPlan: plan,
            userId,
            businessId,
            businessSlug,
          }}
        >
          {/* This won't render because the paywall gates it */}
          <div />
        </FeaturePreviewPaywall>
      </div>
    </div>
  );
}
