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
  prefetch: "static",
  samples: [
    {
      params: { businessSlug: "demo" },
      headers: [
        ["rsc", "1"],
        ["next-action", null],
      ],
    },
  ],
};

/**
 * Members page — returns the structural shell synchronously.
 *
 * All dynamic reads (params, getBusinessSettingsPageContext, queries) are
 * pushed into a Suspense-wrapped child server component so the static shell
 * is prefetchable and sibling navigations paint instantly.
 */
export default function BusinessMembersPage({
  params,
}: {
  params: Promise<{ businessSlug: string }>;
}) {
  return (
    <div className="flex flex-col gap-6 lg:gap-8">
      <PageHeader title="Members" description="Members with access to this business." />
      <Suspense fallback={<MemberListFallback />}>
        <MembersRegion params={params} />
      </Suspense>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Suspense-wrapped async child server component
// ---------------------------------------------------------------------------

async function MembersRegion({
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

  const view = await getBusinessMembersSettingsForBusiness(
    businessContext.business.id,
    user.id,
  );

  if (!view) {
    notFound();
  }

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
      <BusinessMembersManager
        view={view}
        plan={businessContext.business.plan}
        cancelInviteAction={cancelBusinessMemberInviteAction}
        createInviteAction={createBusinessMemberInviteAction}
        removeMemberAction={removeBusinessMemberAction}
        updateRoleAction={updateBusinessMemberRoleAction}
        readOnly={!canManage}
      />
    </FeatureGate>
  );
}

// ---------------------------------------------------------------------------
// Fallback
// ---------------------------------------------------------------------------

function MemberListFallback() {
  return <BusinessMembersManagerFallback />;
}
