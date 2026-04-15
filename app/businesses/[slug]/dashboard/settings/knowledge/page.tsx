import { PageHeader } from "@/components/shared/page-header";
import { LockedFeaturePage } from "@/components/shared/paywall";
import {
  createMemoryAction,
  deleteMemoryAction,
  updateMemoryAction,
} from "@/features/memory/actions";
import { getMemoryDashboardData, getMemorySummaryForBusiness } from "@/features/memory/queries";
import { BusinessMemoryManager } from "@/features/settings/components/business-memory-manager";
import { hasFeatureAccess } from "@/lib/plans";
import { getBusinessOperationalPageContext } from "../_lib/page-context";

export default async function BusinessKnowledgePage() {
  const { businessContext } = await getBusinessOperationalPageContext();

  if (!hasFeatureAccess(businessContext.business.workspacePlan, "knowledgeBase")) {
    return (
      <>
        <PageHeader
          eyebrow="Responses"
          title="Knowledge"
          description="Saved context for AI drafting."
        />
        <LockedFeaturePage
          feature="knowledgeBase"
          plan={businessContext.business.workspacePlan}
        />
      </>
    );
  }

  const [memoryData, memorySummary] = await Promise.all([
    getMemoryDashboardData(businessContext.business.id),
    getMemorySummaryForBusiness(
      businessContext.business.id,
      businessContext.business.workspacePlan,
    ),
  ]);

  return (
    <>
      <PageHeader
        eyebrow="Responses"
        title="Knowledge base"
        description="Saved context for AI drafting."
      />

      <BusinessMemoryManager
        memoryData={memoryData}
        memorySummary={memorySummary}
        createAction={createMemoryAction}
        updateAction={updateMemoryAction}
        deleteAction={deleteMemoryAction}
      />
    </>
  );
}
