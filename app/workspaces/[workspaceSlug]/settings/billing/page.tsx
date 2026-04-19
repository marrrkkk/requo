import { DashboardSection } from "@/components/shared/dashboard-layout";
import { BillingStatusCard } from "@/features/billing/components/billing-status-card";
import { getWorkspaceBillingOverview } from "@/features/billing/queries";
import { getWorkspaceOwnerPageContext } from "../_lib/page-context";

type WorkspaceSettingsBillingPageProps = {
  params: Promise<{ workspaceSlug: string }>;
};

export default async function WorkspaceSettingsBillingPage({
  params,
}: WorkspaceSettingsBillingPageProps) {
  const { workspaceSlug } = await params;
  const { workspace } = await getWorkspaceOwnerPageContext(workspaceSlug);
  const billingOverview = await getWorkspaceBillingOverview(workspace.id);

  if (!billingOverview) {
    return null;
  }

  return (
    <DashboardSection
      description="Manage your workspace subscription, payment method, and billing lifecycle separately from business operations."
      title="Plan & billing"
    >
      <BillingStatusCard billing={billingOverview} showPlanComparison={false} />
    </DashboardSection>
  );
}
