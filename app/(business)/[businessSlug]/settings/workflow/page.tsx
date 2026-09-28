import type { Metadata } from "next";
import { Suspense } from "react";

import { SettingsCollectionBodySkeleton } from "@/components/shell/settings-body-skeletons";
import { canManageBusinessAdministration } from "@/lib/business-members";
import { hasFeatureAccess } from "@/lib/plans";
import { createNoIndexMetadata } from "@/lib/seo/site";
import {
  WorkflowSettingsManager,
  type WorkflowSettingsData,
} from "@/features/businesses/components/workflow-settings-manager";
import { getPackAssignmentForBusiness } from "@/features/businesses/pack-assignments";
import { listRecipeVersionsForBusiness } from "@/features/businesses/pack-recipes";
import { packRecipeKinds } from "@/lib/db/schema/pack-recipes";
import { getBusinessOperationalPageContext } from "../_lib/page-context";

export const metadata: Metadata = createNoIndexMetadata({
  title: "Workflow",
  description: "Behavior pack assignment and workflow recipe versions.",
});

export const instant = true;

export default function BusinessWorkflowSettingsPage() {
  return (
    <Suspense fallback={<SettingsCollectionBodySkeleton />}>
      <WorkflowSettingsContent />
    </Suspense>
  );
}

async function WorkflowSettingsContent() {
  const { businessContext } = await getBusinessOperationalPageContext();
  const businessId = businessContext.business.id;

  const assignment = await getPackAssignmentForBusiness(businessId);

  const recipes: WorkflowSettingsData["recipes"] = [];

  for (const kind of packRecipeKinds) {
    const versions = await listRecipeVersionsForBusiness(businessId, kind);
    recipes.push({ kind, versions });
  }

  const data: WorkflowSettingsData = {
    pack: assignment?.pack ?? null,
    packVersion: assignment?.packVersion ?? 1,
    source: assignment?.source ?? "legacy",
    isOwner: canManageBusinessAdministration(businessContext.role),
    canCustomize: hasFeatureAccess(businessContext.business.plan, "customWorkflowRecipes"),
    recipes,
  };

  return <WorkflowSettingsManager data={data} />;
}
