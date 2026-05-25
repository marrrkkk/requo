import type { Metadata } from "next";
import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { getBusinessAutomations } from "@/features/automations/queries";
import { getAutomationLimit, canAccessWorkflowBuilder } from "@/features/automations/entitlements";
import { getAppShellContext } from "@/lib/app-shell/context";
import { createNoIndexMetadata } from "@/lib/seo/site";
import { AutomationsWorkspace } from "@/features/automations/components/automations-workspace";

export const metadata: Metadata = createNoIndexMetadata({
  title: "Automations",
  description: "Event-driven rules that automate your workflow.",
});

export default async function AutomationsPage({
  params,
  searchParams,
}: {
  params: Promise<{ businessSlug: string }>;
  searchParams: Promise<{ id?: string }>;
}) {
  const { businessSlug } = await params;
  const { id: selectedId } = await searchParams;

  return (
    <Suspense fallback={<AutomationsPageSkeleton />}>
      <StreamedAutomationsWorkspace
        businessSlug={businessSlug}
        selectedAutomationId={selectedId}
      />
    </Suspense>
  );
}

async function StreamedAutomationsWorkspace({
  businessSlug,
  selectedAutomationId,
}: {
  businessSlug: string;
  selectedAutomationId?: string;
}) {
  const { user, businessContext } = await getAppShellContext(businessSlug);

  const businessId = businessContext.business.id;
  const plan = businessContext.business.plan;
  const limit = getAutomationLimit(plan);
  const hasBuilderAccess = canAccessWorkflowBuilder(plan);

  const automations = await getBusinessAutomations(businessId, user.id);

  return (
    <AutomationsWorkspace
      automations={automations}
      plan={plan}
      limit={limit}
      hasBuilderAccess={hasBuilderAccess}
      businessSlug={businessSlug}
      selectedAutomationId={selectedAutomationId}
    />
  );
}

function AutomationsPageSkeleton() {
  return (
    <div className="flex flex-col gap-0">
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <Skeleton className="h-6 w-32 rounded-md" />
        <Skeleton className="h-9 w-32 rounded-lg" />
      </div>
      <div className="flex flex-col gap-0 px-6 pt-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}
