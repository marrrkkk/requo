import type { Metadata } from "next";
import { Suspense } from "react";

import { PageHeader } from "@/components/shared/page-header";
import { LockedFeaturePage } from "@/components/shared/paywall";
import { SettingsCollectionBodySkeleton } from "@/components/shell/settings-body-skeletons";
import {
  createMemoryAction,
  deleteMemoryAction,
  updateMemoryAction,
} from "@/features/memory/actions";
import {
  getMemoryDashboardData,
  getMemorySummaryForBusiness,
} from "@/features/memory/queries";
import { BusinessMemoryManager } from "@/features/settings/components/business-memory-manager";
import { getBusinessBillingOverview } from "@/features/billing/queries";
import {
  analyzeImportAction,
  commitKnowledgeImportAction,
  commitPricingImportAction,
} from "@/features/importer/actions";
import { hasFeatureAccess } from "@/lib/plans";
import { createNoIndexMetadata } from "@/lib/seo/site";
import { getBusinessOperationalPageContext } from "../_lib/page-context";

export const metadata: Metadata = createNoIndexMetadata({
  title: "Knowledge",
  description: "Manage business knowledge entries used by AI features.",
});

export const unstable_instant = { prefetch: "static", unstable_disableValidation: true };

export default async function BusinessKnowledgePage() {
  const { businessContext } = await getBusinessOperationalPageContext();
  const hasAccess = hasFeatureAccess(
    businessContext.business.plan,
    "knowledgeBase",
  );

  const billingPromise = hasAccess
    ? null
    : getBusinessBillingOverview(businessContext.business.id);

  const memoryDataPromise = hasAccess
    ? getMemoryDashboardData(businessContext.business.id)
    : null;
  const memorySummaryPromise = hasAccess
    ? getMemorySummaryForBusiness(
        businessContext.business.id,
        businessContext.business.plan,
      )
    : null;

  return (
    <>
      <PageHeader
        eyebrow="Responses"
        title="Knowledge"
        description="Saved context for AI drafting."
      />

      {hasAccess && memoryDataPromise && memorySummaryPromise ? (
        <Suspense fallback={<SettingsCollectionBodySkeleton />}>
          <BusinessKnowledgeBody
            businessPlan={businessContext.business.plan}
            memoryDataPromise={memoryDataPromise}
            memorySummaryPromise={memorySummaryPromise}
          />
        </Suspense>
      ) : billingPromise ? (
        <Suspense fallback={<SettingsCollectionBodySkeleton />}>
          <LockedKnowledgeBody
            plan={businessContext.business.plan}
            billingPromise={billingPromise}
          />
        </Suspense>
      ) : null}
    </>
  );
}

async function BusinessKnowledgeBody({
  businessPlan,
  memoryDataPromise,
  memorySummaryPromise,
}: {
  businessPlan: Awaited<ReturnType<typeof getBusinessOperationalPageContext>>["businessContext"]["business"]["plan"];
  memoryDataPromise: ReturnType<typeof getMemoryDashboardData>;
  memorySummaryPromise: ReturnType<typeof getMemorySummaryForBusiness>;
}) {
  const [memoryData, memorySummary] = await Promise.all([
    memoryDataPromise,
    memorySummaryPromise,
  ]);

  return (
    <BusinessMemoryManager
      memoryData={memoryData}
      memorySummary={memorySummary}
      createAction={createMemoryAction}
      updateAction={updateMemoryAction}
      deleteAction={deleteMemoryAction}
      importerEnabled={hasFeatureAccess(businessPlan, "aiAssistant")}
      analyzeImportAction={analyzeImportAction}
      commitKnowledgeImportAction={commitKnowledgeImportAction}
      commitPricingImportAction={commitPricingImportAction}
    />
  );
}

async function LockedKnowledgeBody({
  plan,
  billingPromise,
}: {
  plan: Awaited<ReturnType<typeof getBusinessOperationalPageContext>>["businessContext"]["business"]["plan"];
  billingPromise: ReturnType<typeof getBusinessBillingOverview>;
}) {
  const billingOverview = await billingPromise;

  return (
    <LockedFeaturePage
      feature="knowledgeBase"
      plan={plan}
      description="Upgrade to save reusable context and train better AI drafts."
      upgradeAction={
        billingOverview
          ? {
              userId: billingOverview.userId,
              businessId: billingOverview.businessId,
              businessSlug: billingOverview.businessSlug,
              currentPlan: billingOverview.currentPlan,
              region: billingOverview.region,
              defaultCurrency: billingOverview.defaultCurrency,
              ctaLabel: "Upgrade for Knowledge",
            }
          : undefined
      }
    />
  );
}
