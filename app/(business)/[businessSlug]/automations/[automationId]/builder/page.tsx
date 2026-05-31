import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { requireUser } from "@/lib/auth/session";
import { getBusinessContextForMembershipSlug } from "@/lib/db/business-access";
import { createNoIndexMetadata } from "@/lib/seo/site";
import { getAutomationById } from "@/features/automations/queries";
import {
  canAccessWorkflowBuilder,
} from "@/features/automations/entitlements";
import { deserializeWorkflow } from "@/features/automations/components/builder/utils/serializer";
import type { WorkflowGraph } from "@/features/automations/types";

import { WorkflowBuilderPage } from "./workflow-builder-page";
import { WorkflowBuilderPaywall } from "./workflow-builder-paywall";

export const metadata: Metadata = createNoIndexMetadata({
  title: "Workflow Builder",
  description: "Visual workflow automation builder.",
});

export default async function AutomationBuilderPage({
  params,
}: {
  params: Promise<{ businessSlug: string; automationId: string }>;
}) {
  const { businessSlug, automationId } = await params;

  const user = await requireUser();
  const businessContext = await getBusinessContextForMembershipSlug(
    user.id,
    businessSlug,
  );

  if (!businessContext) {
    redirect("/home");
  }

  const businessId = businessContext.business.id;
  const plan = businessContext.business.plan;

  // Paywall: show preview for users without workflow builder access
  if (!canAccessWorkflowBuilder(plan)) {
    return (
      <WorkflowBuilderPaywall
        businessSlug={businessSlug}
        plan={plan}
        userId={user.id}
        businessId={businessId}
      />
    );
  }

  // Fetch the automation
  const automation = await getAutomationById(automationId, businessId, user.id);

  if (!automation) {
    notFound();
  }

  // Deserialize workflow graph from stored actions field
  const workflowGraph = automation.actions as WorkflowGraph | null;
  const initialState = workflowGraph?.nodes
    ? deserializeWorkflow(workflowGraph)
    : undefined;

  return (
    <WorkflowBuilderPage
      automationId={automationId}
      automationName={automation.name}
      businessSlug={businessSlug}
      initialState={initialState}
    />
  );
}
