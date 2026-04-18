import { notFound } from "next/navigation";

import { PageHeader } from "@/components/shared/page-header";
import { LockedFeaturePage } from "@/components/shared/paywall";
import {
  cancelBusinessMemberInviteAction,
  copyBusinessMemberInviteLinkAction,
  createBusinessMemberInviteAction,
  removeBusinessMemberAction,
  updateBusinessMemberRoleAction,
} from "@/features/business-members/actions";
import { BusinessMembersManager } from "@/features/business-members/components/business-members-manager";
import { getBusinessMembersSettingsForBusiness } from "@/features/business-members/queries";
import { getWorkspaceBillingOverview } from "@/features/billing/queries";
import { getBusinessOwnerPageContext } from "@/app/businesses/[slug]/dashboard/settings/_lib/page-context";
import { hasFeatureAccess } from "@/lib/plans";

export default async function BusinessMembersPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { user, businessContext } = await getBusinessOwnerPageContext(slug);

  if (!hasFeatureAccess(businessContext.business.workspacePlan, "members")) {
    const billingOverview = await getWorkspaceBillingOverview(
      businessContext.business.workspaceId,
    );

    return (
      <>
        <PageHeader title="Members" />
        <LockedFeaturePage
          feature="members"
          plan={businessContext.business.workspacePlan}
          description="Upgrade to invite teammates and assign business roles."
          upgradeAction={
            billingOverview
              ? {
                  workspaceId: billingOverview.workspaceId,
                  workspaceSlug: billingOverview.workspaceSlug,
                  currentPlan: billingOverview.currentPlan,
                  region: billingOverview.region,
                  defaultCurrency: billingOverview.defaultCurrency,
                  ctaLabel: "Upgrade to invite members",
                }
              : undefined
          }
        />
      </>
    );
  }

  const view = await getBusinessMembersSettingsForBusiness(
    businessContext.business.id,
    user.id,
  );

  if (!view) {
    notFound();
  }

  return (
    <BusinessMembersManager
      businessSlug={businessContext.business.slug}
      cancelInviteAction={cancelBusinessMemberInviteAction}
      copyInviteLinkAction={copyBusinessMemberInviteLinkAction}
      createInviteAction={createBusinessMemberInviteAction}
      removeMemberAction={removeBusinessMemberAction}
      updateRoleAction={updateBusinessMemberRoleAction}
      view={view}
    />
  );
}
