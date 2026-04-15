import { notFound } from "next/navigation";

import { PageHeader } from "@/components/shared/page-header";
import { LockedFeaturePage } from "@/components/shared/paywall";
import {
  cancelBusinessMemberInviteAction,
  createBusinessMemberInviteAction,
  removeBusinessMemberAction,
  updateBusinessMemberRoleAction,
} from "@/features/business-members/actions";
import { BusinessMembersManager } from "@/features/business-members/components/business-members-manager";
import { getBusinessMembersSettingsForBusiness } from "@/features/business-members/queries";
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
    return (
      <>
        <PageHeader title="Members" />
        <LockedFeaturePage
          feature="members"
          plan={businessContext.business.workspacePlan}
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
      createInviteAction={createBusinessMemberInviteAction}
      removeMemberAction={removeBusinessMemberAction}
      updateRoleAction={updateBusinessMemberRoleAction}
      view={view}
    />
  );
}
