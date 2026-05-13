import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { PageHeader } from "@/components/shared/page-header";
import { getBusinessMembersSettingsForBusiness } from "@/features/business-members/queries";
import { getBusinessOwnerPageContext } from "@/app/businesses/[slug]/(main)/settings/_lib/page-context";
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

  // Always show the member list — the invite action is gated by LockedAction
  // inside BusinessMembersManager based on the plan.
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
      plan={businessContext.business.plan}
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
