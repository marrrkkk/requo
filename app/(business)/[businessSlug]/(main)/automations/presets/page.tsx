import type { Metadata } from "next";
import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { DashboardPage } from "@/components/shared/dashboard-layout";
import { PageHeader } from "@/components/shared/page-header";
import { QuickAutomationPresets } from "@/features/automations/components/quick-automation-presets";
import { getBusinessAutomations } from "@/features/automations/queries";
import { getAutomationLimit } from "@/features/automations/entitlements";
import { getAppShellContext } from "@/lib/app-shell/context";
import { createNoIndexMetadata } from "@/lib/seo/site";

export const metadata: Metadata = createNoIndexMetadata({
  title: "Automation Presets",
  description: "One-click automation templates for common workflow patterns.",
});

export default async function AutomationPresetsPage({
  params,
}: {
  params: Promise<{ businessSlug: string }>;
}) {
  const { businessSlug } = await params;

  return (
    <DashboardPage>
      <PageHeader
        title="Automation Presets"
        description="Common automation patterns you can enable with one click."
        backHref={`/${businessSlug}/automations`}
        backLabel="Automations"
      />
      <Suspense fallback={<PresetsPageSkeleton />}>
        <StreamedPresets businessSlug={businessSlug} />
      </Suspense>
    </DashboardPage>
  );
}

async function StreamedPresets({ businessSlug }: { businessSlug: string }) {
  const { user, businessContext } = await getAppShellContext(businessSlug);

  const businessId = businessContext.business.id;
  const plan = businessContext.business.plan;
  const limit = getAutomationLimit(plan);

  const automations = await getBusinessAutomations(businessId, user.id);
  const existingTriggerTypes = automations.map((a) => a.triggerType);
  const atLimit = automations.length >= limit;

  return (
    <QuickAutomationPresets
      existingTriggerTypes={existingTriggerTypes}
      disabled={atLimit}
      businessSlug={businessSlug}
    />
  );
}

function PresetsPageSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-40 w-full rounded-xl" />
      ))}
    </div>
  );
}
