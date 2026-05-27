import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { PageHeader } from "@/components/shared/page-header";
import { FeatureGate } from "@/features/paywall";
import { getBusinessMembersSettingsForBusiness } from "@/features/business-members/queries";
import { getBusinessSettingsPageContext } from "@/app/(business)/[businessSlug]/settings/_lib/page-context";
import { getBusinessBillingOverview } from "@/features/billing/queries";
import {
  cancelBusinessMemberInviteAction,
  createBusinessMemberInviteAction,
  removeBusinessMemberAction,
  updateBusinessMemberRoleAction,
} from "@/features/business-members/actions";
import {
  BusinessMembersManager,
  BusinessMembersManagerFallback,
} from "@/features/business-members/components/business-members-manager";
import { canManageBusinessAdministration } from "@/lib/business-members";
import { createNoIndexMetadata } from "@/lib/seo/site";

export const metadata: Metadata = createNoIndexMetadata({
  title: "Members",
  description: "Invite and manage team members for this business.",
});

export const unstable_instant = {
  prefetch: 'static',
  unstable_disableValidation: true,
};

export default async function BusinessMembersPage({
  params,
}: {
  params: Promise<{ businessSlug: string }>;
}) {
  const { businessSlug } = await params;
  const { user, businessContext } = await getBusinessSettingsPageContext(businessSlug);
  const canManage = canManageBusinessAdministration(businessContext.role);

  // Get billing overview for upgrade action
  const billingOverview = await getBusinessBillingOverview(
    businessContext.business.id,
  ).catch(() => null);

  return (
    <FeatureGate
      feature="members"
      plan={businessContext.business.plan}
      variant="page"
      upgradeAction={
        billingOverview
          ? {
              userId: user.id,
              businessId: businessContext.business.id,
              businessSlug: businessContext.business.slug,
              currentPlan: billingOverview.currentPlan,
            }
          : undefined
      }
    >
      <div className="flex flex-col gap-6 lg:gap-8">
        <PageHeader title="Members" description="Members with access to this business." />
        <Suspense fallback={<MemberListFallback />}>
          <StreamedMemberList
            userId={user.id}
            businessContext={businessContext}
            canManage={canManage}
          />
        </Suspense>
      </div>
    </FeatureGate>
  );
}

/* -------------------------------------------------------------------------- */
/*  Streamed sections                                                          */
/* -------------------------------------------------------------------------- */

async function StreamedMemberList({
  userId,
  businessContext,
  canManage,
}: {
  userId: string;
  businessContext: Awaited<ReturnType<typeof getBusinessSettingsPageContext>>["businessContext"];
  canManage: boolean;
}) {
  const view = await getBusinessMembersSettingsForBusiness(
    businessContext.business.id,
    userId,
  );

  if (!view) {
    notFound();
  }

  return (
    <BusinessMembersManager
      view={view}
      plan={businessContext.business.plan}
      cancelInviteAction={cancelBusinessMemberInviteAction}
      createInviteAction={createBusinessMemberInviteAction}
      removeMemberAction={removeBusinessMemberAction}
      updateRoleAction={updateBusinessMemberRoleAction}
      readOnly={!canManage}
    />
  );
}

/* -------------------------------------------------------------------------- */
/*  Fallbacks                                                                  */
/* -------------------------------------------------------------------------- */

function MemberListFallback() {
  return <BusinessMembersManagerFallback />;
}
