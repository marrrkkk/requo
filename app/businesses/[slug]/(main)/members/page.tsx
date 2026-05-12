import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { PageHeader } from "@/components/shared/page-header";
import { LockedFeaturePage } from "@/components/shared/paywall";
import { Skeleton } from "@/components/ui/skeleton";
import { getBusinessBillingOverview } from "@/features/billing/queries";
import { getBusinessMembersSettingsForBusiness } from "@/features/business-members/queries";
import { getBusinessOwnerPageContext } from "@/app/businesses/[slug]/(main)/settings/_lib/page-context";
import { hasFeatureAccess } from "@/lib/plans";
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
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { user, businessContext } = await getBusinessOwnerPageContext(slug);

  if (!hasFeatureAccess(businessContext.business.plan, "members")) {
    return (
      <>
        <PageHeader title="Members" />
        <Suspense fallback={<MemberPaywallFallback />}>
          <StreamedMemberPaywall businessContext={businessContext} />
        </Suspense>
      </>
    );
  }

  // Stream the member list — header renders immediately.
  return (
    <div className="flex flex-col gap-6 lg:gap-8">
      <PageHeader title="Members" description="Members with access to this business." />
      <Suspense fallback={<MemberListFallback />}>
        <StreamedMemberList
          userId={user.id}
          businessContext={businessContext}
        />
      </Suspense>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Streamed sections                                                          */
/* -------------------------------------------------------------------------- */

async function StreamedMemberPaywall({
  businessContext,
}: {
  businessContext: Awaited<ReturnType<typeof getBusinessOwnerPageContext>>["businessContext"];
}) {
  const billingOverview = await getBusinessBillingOverview(
    businessContext.business.id,
  );

  return (
    <LockedFeaturePage
      feature="members"
      plan={businessContext.business.plan}
      description="Upgrade to invite teammates and assign business roles."
      upgradeAction={
        billingOverview
          ? {
              userId: billingOverview.userId,
              businessId: billingOverview.businessId,
              businessSlug: billingOverview.businessSlug,
              currentPlan: billingOverview.currentPlan,
              region: billingOverview.region,
              defaultCurrency: billingOverview.defaultCurrency,
              ctaLabel: "Upgrade to invite members",
            }
          : undefined
      }
    />
  );
}

async function StreamedMemberList({
  userId,
  businessContext,
}: {
  userId: string;
  businessContext: Awaited<ReturnType<typeof getBusinessOwnerPageContext>>["businessContext"];
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
      cancelInviteAction={cancelBusinessMemberInviteAction}
      createInviteAction={createBusinessMemberInviteAction}
      removeMemberAction={removeBusinessMemberAction}
      updateRoleAction={updateBusinessMemberRoleAction}
    />
  );
}

/* -------------------------------------------------------------------------- */
/*  Fallbacks                                                                  */
/* -------------------------------------------------------------------------- */

function MemberListFallback() {
  return <BusinessMembersManagerFallback />;
}

function MemberPaywallFallback() {
  return (
    <div className="animate-pulse rounded-2xl border border-border/70 bg-background/50 p-8">
      <Skeleton className="h-5 w-48" />
      <Skeleton className="mt-3 h-4 w-64" />
    </div>
  );
}
