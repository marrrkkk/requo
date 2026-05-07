import { notFound } from "next/navigation";
import { Suspense } from "react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { getBusinessBillingOverview } from "@/features/billing/queries";
import { getBusinessMembersSettingsForBusiness } from "@/features/business-members/queries";
import { getBusinessOwnerPageContext } from "@/app/businesses/[slug]/(main)/settings/_lib/page-context";
import { hasFeatureAccess } from "@/lib/plans";
import { canManageBusinessMembers } from "@/lib/business-members";

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

  // Business owner/manager can invite members
  const canInvite = canManageBusinessMembers(businessContext.role);

  return (
    <>
      {/* TODO: Re-implement business member invite button */}

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
                            {member.role === "owner" ? "Owner" : member.role === "manager" ? "Manager" : "Staff"}
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
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*  Fallbacks                                                                  */
/* -------------------------------------------------------------------------- */

function MemberListFallback() {
  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-hidden rounded-2xl border border-border/70 bg-background/50 shadow-sm">
        {Array.from({ length: 2 }).map((_, i) => (
          <div
            key={i}
            className={`flex animate-pulse items-center gap-4 px-4 py-3.5 ${i > 0 ? "border-t border-border/70" : ""}`}
          >
            <Skeleton className="size-10 shrink-0 rounded-full" />
            <div className="flex-1">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="mt-1.5 h-3.5 w-48" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MemberPaywallFallback() {
  return (
    <div className="animate-pulse rounded-2xl border border-border/70 bg-background/50 p-8">
      <Skeleton className="h-5 w-48" />
      <Skeleton className="mt-3 h-4 w-64" />
    </div>
  );
}
