import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DashboardPage } from "@/components/shared/dashboard-layout";
import { PageHeader } from "@/components/shared/page-header";
import { QuickAutomationPresets } from "@/features/automations/components/quick-automation-presets";
import { RecommendedAutomationsCard } from "@/features/automations/components/recommended-automations-card";
import {
  getRecommendedAutomations,
  getAutomationValueProp,
} from "@/features/automations/recommended-automations";
import { getBusinessAutomations } from "@/features/automations/queries";
import { getAutomationLimit } from "@/features/automations/entitlements";
import { getAppShellContext } from "@/lib/app-shell/context";
import { createNoIndexMetadata } from "@/lib/seo/site";

export const metadata: Metadata = createNoIndexMetadata({
  title: "Workflow templates",
  description: "Ready-made automation templates for inquiry, quote, job, and invoice workflows.",
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
        title="Workflow templates"
        description="Each template creates a new automation in your list. Customize it in the builder after adding."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href={`/${businessSlug}/automations`}>
              <ArrowLeft className="size-3.5" />
              Automations
            </Link>
          </Button>
        }
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
  const businessType = businessContext.business.businessType ?? undefined;

  const automations = await getBusinessAutomations(businessId, user.id);
  const existingAutomationNames = automations.map((a) => a.name);
  const atLimit = automations.length >= limit;

  const recommendations = getRecommendedAutomations(businessType);
  const valueProp = getAutomationValueProp(businessType);

  return (
    <div className="flex flex-col gap-8">
      {/* Recommended section — shown when the business has few automations */}
      {automations.length < 3 && recommendations.length > 0 && (
        <div className="mx-auto w-full max-w-lg">
          <RecommendedAutomationsCard
            recommendations={recommendations}
            valueProp={valueProp}
            existingAutomationNames={existingAutomationNames}
            disabled={atLimit}
          />
        </div>
      )}

      <QuickAutomationPresets
        existingAutomationNames={existingAutomationNames}
        disabled={atLimit}
        businessSlug={businessSlug}
        businessType={businessType}
      />
    </div>
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
