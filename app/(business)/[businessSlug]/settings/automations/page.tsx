import type { Metadata } from "next";
import { Suspense } from "react";

import { PageHeader } from "@/components/shared/page-header";
import { DashboardSettingsSkeleton } from "@/components/shell/dashboard-settings-skeleton";
import { AutomationList } from "@/features/automations/components/automation-list";
import { getBusinessAutomations, getAutomationStats } from "@/features/automations/queries";
import { getAutomationLimit } from "@/features/automations/entitlements";
import { createNoIndexMetadata } from "@/lib/seo/site";
import { getBusinessOperationalPageContext } from "../_lib/page-context";

export const metadata: Metadata = createNoIndexMetadata({
  title: "Automations",
  description: "Manage event-driven automation rules for your workflow.",
});

export const unstable_instant = {
  prefetch: "static",
  unstable_disableValidation: true,
};

export default function AutomationsSettingsPage({
  params,
}: {
  params: Promise<{ businessSlug: string }>;
}) {
  return (
    <>
      <PageHeader
        eyebrow="Settings"
        title="Automations"
        description="Event-driven rules that run actions automatically when things happen in your workflow."
      />
      <Suspense fallback={<DashboardSettingsSkeleton />}>
        <AutomationsContent params={params} />
      </Suspense>
    </>
  );
}

async function AutomationsContent({
  params,
}: {
  params: Promise<{ businessSlug: string }>;
}) {
  const { businessSlug } = await params;
  const { user, businessContext } =
    await getBusinessOperationalPageContext(businessSlug);

  const businessId = businessContext.business.id;
  const plan = businessContext.business.plan;
  const limit = getAutomationLimit(plan);

  const [automations, stats] = await Promise.all([
    getBusinessAutomations(businessId, user.id),
    getAutomationStats(businessId, user.id),
  ]);

  const presetsHref = `/${businessSlug}/settings/automations/presets`;

  return (
    <AutomationList
      automations={automations}
      stats={stats}
      plan={plan}
      limit={limit}
      businessSlug={businessSlug}
      presetsHref={presetsHref}
    />
  );
}
