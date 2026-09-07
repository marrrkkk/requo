import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft, ExternalLink } from "lucide-react";
import Link from "next/link";

import { DashboardPage } from "@/components/shared/dashboard-layout";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SettingsFormBodySkeleton } from "@/components/shell/settings-body-skeletons";
import { FeatureGate } from "@/features/paywall/components/feature-gate";
import { getBusinessBillingOverview } from "@/features/billing/queries";
import { updateBusinessAiAgentSettingsAction } from "@/features/settings/actions";
import { BusinessAiAgentSettingsForm } from "@/features/settings/components/business-ai-agent-settings-form";
import { getBusinessSettingsForBusiness } from "@/features/settings/queries";
import {
  getBusinessAssistantPath,
  getBusinessPublicChatPath,
} from "@/features/businesses/routes";
import { getBusinessOperationalPageContext } from "@/app/(business)/[businessSlug]/settings/_lib/page-context";
import { createNoIndexMetadata } from "@/lib/seo/site";

export const metadata: Metadata = createNoIndexMetadata({
  title: "Public Chat Settings",
  description: "Enable and configure the public chat for customers.",
});

export const instant = true;

/**
 * Public chat settings page at `/[businessSlug]/assistant/settings`.
 *
 * Canonical location for public chat configuration. (The owner-facing
 * surface on this section is the Assistant; "public chat" here always means
 * the customer-facing Agent surface.)
 */
export default function AssistantSettingsPage() {
  return (
    <DashboardPage>
      <Suspense fallback={<HeaderSkeleton />}>
        <AssistantSettingsHeader />
      </Suspense>
      <Suspense fallback={<SettingsFormBodySkeleton />}>
        <AssistantSettingsContent />
      </Suspense>
    </DashboardPage>
  );
}

async function AssistantSettingsHeader() {
  const { businessContext } = await getBusinessOperationalPageContext();
  const slug = businessContext.business.slug;
  const chatPath = getBusinessPublicChatPath(slug);

  return (
    <PageHeader
      eyebrow="Public chat"
      title="Settings"
      description="Enable and configure how your public chat answers customers, qualifies their needs, and captures inquiries."
      actions={
        <div className="flex flex-wrap items-center gap-2.5">
          <Button asChild size="sm" variant="outline">
            <Link href={getBusinessAssistantPath(slug)}>
              <ArrowLeft data-icon="inline-start" className="size-3.5" />
              Assistant
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <a href={chatPath} rel="noopener noreferrer" target="_blank">
              <ExternalLink data-icon="inline-start" className="size-3.5" />
              Test public chat
            </a>
          </Button>
        </div>
      }
    />
  );
}

async function AssistantSettingsContent() {
  const { businessContext } = await getBusinessOperationalPageContext();
  const businessId = businessContext.business.id;
  const plan = businessContext.business.plan;
  const slug = businessContext.business.slug;

  const settings = await getBusinessSettingsForBusiness(businessId);

  if (!settings) {
    notFound();
  }

  const upgradeAction =
    plan === "free"
      ? await getBusinessBillingOverview(businessId).catch(() => null)
      : null;

  return (
    <FeatureGate
      feature="aiAgent"
      plan={plan}
      variant="page"
      description="Let customers chat with an assistant that collects details and submits inquiries automatically."
      upgradeAction={
        upgradeAction
          ? {
              userId: upgradeAction.userId,
              businessId: upgradeAction.businessId,
              businessSlug: upgradeAction.businessSlug,
              currentPlan: upgradeAction.currentPlan,
            }
          : undefined
      }
    >
      <BusinessAiAgentSettingsForm
        action={updateBusinessAiAgentSettingsAction}
        chatPath={getBusinessPublicChatPath(slug)}
        key={`assistant-settings-${settings.updatedAt.getTime()}`}
        settings={settings}
      />
    </FeatureGate>
  );
}

function HeaderSkeleton() {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-44 rounded-lg" />
        <Skeleton className="h-4 w-72 rounded-md" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-8 w-24 rounded-lg" />
        <Skeleton className="h-8 w-28 rounded-lg" />
      </div>
    </div>
  );
}
