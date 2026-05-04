import { notFound } from "next/navigation";
import { Users } from "lucide-react";

import { DashboardEmptyState } from "@/components/shared/dashboard-layout";
import { PageHeader } from "@/components/shared/page-header";
import { LockedFeaturePage } from "@/components/shared/paywall";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { getWorkspaceBillingOverview } from "@/features/billing/queries";
import { getBusinessMembersSettingsForBusiness } from "@/features/business-members/queries";
import { getBusinessOwnerPageContext } from "@/app/businesses/[slug]/(main)/settings/_lib/page-context";
import { hasFeatureAccess } from "@/lib/plans";
import { businessMemberRoleMeta, canManageBusinessMembers } from "@/lib/business-members";
import { createWorkspaceMemberInviteAction } from "@/features/workspace-members/actions";
import { BusinessMembersInviteButton } from "@/features/workspace-members/components/business-members-invite-button";
import { getWorkspaceContextForUser } from "@/lib/db/workspace-access";

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

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

  // Determine if the current user can invite into this business:
  // - workspace owner/admin can always invite
  // - business owner/manager can invite (scoped to this business)
  const workspaceContext = await getWorkspaceContextForUser(
    user.id,
    businessContext.business.workspaceId,
  );
  const isWorkspaceAdmin =
    workspaceContext?.memberRole === "owner" ||
    workspaceContext?.memberRole === "admin";
  const isBusinessManager = canManageBusinessMembers(businessContext.role);
  const canInvite = isWorkspaceAdmin || isBusinessManager;

  return (
    <div className="flex flex-col gap-6 lg:gap-8">
      <PageHeader
        title="Members"
        description="Members with access to this business."
        actions={
          canInvite ? (
            <BusinessMembersInviteButton
              workspaceId={businessContext.business.workspaceId}
              businessId={businessContext.business.id}
              businessName={businessContext.business.name}
              createInviteAction={createWorkspaceMemberInviteAction}
              maxWorkspaceRole={isWorkspaceAdmin ? "admin" : "member"}
            />
          ) : undefined
        }
      />

      <div className="flex flex-col gap-4">
        {view.members.length > 0 ? (
          <div className="overflow-hidden rounded-2xl border border-border/70 bg-background/50 shadow-sm">
            <div className="flex flex-col">
              {view.members.map((member, i) => (
                <div
                  key={member.membershipId}
                  className={i > 0 ? "border-t border-border/70" : undefined}
                >
                  <div className="flex items-center justify-between gap-4 px-4 py-3.5 transition-colors hover:bg-muted/30">
                    <div className="flex items-center gap-4 min-w-0">
                      <Avatar>
                        {member.image ? (
                          <AvatarImage alt={member.name} src={member.image} />
                        ) : null}
                        <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
                      </Avatar>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold tracking-tight text-foreground">
                            {member.name}
                          </p>
                          <Badge
                            variant={
                              member.role === "owner" ? "secondary" : "outline"
                            }
                          >
                            {businessMemberRoleMeta[member.role].label}
                          </Badge>
                          {member.isCurrentUser ? (
                            <Badge variant="outline">You</Badge>
                          ) : null}
                        </div>
                        <p className="mt-0.5 truncate text-sm text-muted-foreground">
                          {member.email}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <DashboardEmptyState
            description="No team members have been assigned to this business yet."
            icon={Users}
            title="No members yet"
            variant="section"
          />
        )}
      </div>
    </div>
  );
}
