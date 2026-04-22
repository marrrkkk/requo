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
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">
          Plan & billing
        </h2>
        <p className="text-sm text-muted-foreground">
          Manage your workspace subscription, payment method, and billing lifecycle separately from business operations.
        </p>
      </div>
      <BillingStatusCard billing={billingOverview} showPlanComparison={false} />
    </div>
  );
}
