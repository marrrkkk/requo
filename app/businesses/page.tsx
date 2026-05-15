import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { ArrowRight, Archive, CalendarClock, Lock } from "lucide-react";

import { BrandMark } from "@/components/shared/brand-mark";
import { BusinessAvatar } from "@/components/shared/business-avatar";
import { PlanBadge } from "@/components/shared/paywall";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CreateBusinessDialog } from "@/features/businesses/components/create-business-dialog";
import { createBusinessAction } from "@/features/businesses/actions";
import { unlockBusinessFromHubAction } from "@/features/businesses/actions";
import { getBusinessDashboardPath, businessesHubPath } from "@/features/businesses/routes";
import { getAccountProfileForUser } from "@/features/account/queries";
import { AccountUserMenu } from "@/features/account/components/account-user-menu";
import { resolveUserAvatarSrc } from "@/features/account/utils";
import { onboardingPath } from "@/features/onboarding/routes";
import { UpgradePrompt } from "@/features/paywall";
import { RecentlyOpenedBusinesses } from "@/features/businesses/components/recently-opened-businesses";
import { getRecentlyOpenedBusinessesForUser } from "@/features/businesses/recently-opened";
import { getBusinessQuotaForUser } from "@/features/businesses/quota";
import { planMeta } from "@/lib/plans/plans";
import { getPendingInvitesForUser } from "@/features/business-members/queries";
import { acceptInviteFromHubAction, declineInviteFromHubAction } from "@/features/business-members/actions";
import { PendingInvitesBanner } from "@/features/business-members/components/pending-invites-banner";
import { UpgradeSuccessToast } from "@/features/billing/components/upgrade-success-toast";

import { ThemePreferenceSync } from "@/features/theme/components/theme-preference-sync";
import { getThemePreferenceForUser } from "@/features/theme/queries";
import { requireSession } from "@/lib/auth/session";
import { getBusinessMembershipsForUser } from "@/lib/db/business-access";
import { timed } from "@/lib/dev/server-timing";
import { businessMemberRoleMeta } from "@/lib/business-members";
import { createNoIndexMetadata } from "@/lib/seo/site";

export const metadata: Metadata = createNoIndexMetadata({
  absoluteTitle: "Businesses · Requo",
  description: "Manage the businesses, settings, and team access you own.",
});

export const unstable_instant = {
  prefetch: 'static',
  unstable_disableValidation: true,
};

export default async function BusinessesPage() {
  const session = await requireSession();

  const [
    themePreference,
    profile,
    memberships,
    recentlyOpenedBusinesses,
    businessQuota,
    pendingInvites,
  ] = await timed(
    "businessesHub.parallelShellFetches",
    Promise.all([
      getThemePreferenceForUser(session.user.id),
      getAccountProfileForUser(session.user.id),
      getBusinessMembershipsForUser(session.user.id, "all"),
      getRecentlyOpenedBusinessesForUser(session.user.id),
      getBusinessQuotaForUser({
        ownerUserId: session.user.id,
      }),
      getPendingInvitesForUser(session.user.id, session.user.email),
    ]),
  );

  if (memberships.length === 0 && !profile?.onboardingCompletedAt) {
    redirect(onboardingPath);
  }

  const avatarSrc = resolveUserAvatarSrc({
    avatarStoragePath: profile?.avatarStoragePath,
    profileUpdatedAt: profile?.updatedAt,
    oauthImage: session.user.image ?? null,
  });

  return (
    <>
      <ThemePreferenceSync
        themePreference={themePreference}
        userId={session.user.id}
      />
      <UpgradeSuccessToast />
      <div className="min-h-svh w-full bg-background">
        <header className="sticky top-0 z-10 flex h-[4.5rem] w-full shrink-0 items-center justify-between border-b border-border/70 bg-background/95 px-4 backdrop-blur supports-backdrop-filter:bg-background/60 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <BrandMark subtitle="Businesses" href={businessesHubPath} />
            <div className="h-4 w-px bg-border max-sm:hidden" />
          </div>
          <div className="flex items-center gap-3">
            <AccountUserMenu
              user={{
                id: session.user.id,
                email: session.user.email,
                name: session.user.name,
                avatarSrc,
              }}
            />
          </div>
        </header>

        <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 py-8 sm:px-6 lg:px-8">
          <div className="space-y-2 pb-8">
            <h1 className="font-heading text-[2rem] font-semibold tracking-tight text-foreground sm:text-[2.35rem]">
              Your businesses
            </h1>
            <p className="max-w-2xl text-sm leading-normal sm:leading-7 text-muted-foreground sm:text-[0.96rem]">
              Manage your businesses, settings, and team access.
            </p>
          </div>

          <div className="w-full space-y-6">
            <PendingInvitesBanner
              invites={pendingInvites}
              acceptAction={acceptInviteFromHubAction}
              declineAction={declineInviteFromHubAction}
            />

            <RecentlyOpenedBusinesses businesses={recentlyOpenedBusinesses} />

            {!businessQuota.allowed && businessQuota.upgradePlan && (
              <UpgradePrompt
                variant="banner"
                plan={businessQuota.plan}
                description={`Your ${planMeta[businessQuota.plan].label} plan supports ${businessQuota.limit === 1 ? "1 business" : `${businessQuota.limit} businesses`}. Upgrade to ${planMeta[businessQuota.upgradePlan].label} to add more.`}
              />
            )}

            <section className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <p className="meta-label">
                  {memberships.filter((m) => m.business.recordState !== "archived").length} business{memberships.filter((m) => m.business.recordState !== "archived").length === 1 ? "" : "es"}
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {memberships.filter((m) => m.business.recordState !== "archived").map((membership) => {
                  const ws = membership.business;
                  const roleMeta = businessMemberRoleMeta[membership.role];
                  const isLocked = ws.recordState === "locked";
                  return (
                    <Card
                      className="group relative flex flex-col border-border/80 bg-card/98 transition-colors hover:border-border hover:bg-card hover:shadow-sm"
                      key={ws.id}
                    >
                      <CardHeader className="gap-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0 flex-1">
                            <CardTitle className="max-w-full truncate text-lg">
                              {ws.name}
                            </CardTitle>
                            <CardDescription className="mt-1 max-w-full truncate font-medium">
                              /{ws.slug}
                            </CardDescription>
                          </div>
                          <PlanBadge plan={ws.plan} />
                        </div>
                      </CardHeader>
                      <CardContent className="flex flex-1 flex-col justify-between space-y-5">
                        <div className="flex flex-wrap gap-2">
                          <Badge className="capitalize" variant="secondary">
                            {roleMeta?.label ?? membership.role}
                          </Badge>
                          {ws.deletedAt ? (
                            <Badge className="gap-1" variant="destructive">
                              <CalendarClock className="size-3.5" />
                              Deletion scheduled
                            </Badge>
                          ) : null}
                          {isLocked ? (
                            <Badge className="gap-1" variant="outline">
                              <Lock className="size-3.5" />
                              Locked
                            </Badge>
                          ) : null}
                        </div>
                        <div className="flex w-full flex-wrap gap-2">
                          <Button asChild className="w-full sm:w-auto" variant="default">
                            <Link href={getBusinessDashboardPath(ws.slug)} prefetch={true}>
                              {isLocked ? "Open read-only" : "Open business"}
                              <ArrowRight data-icon="inline-end" />
                            </Link>
                          </Button>
                          {isLocked ? (
                            <form
                              action={unlockBusinessFromHubAction.bind(
                                null,
                                ws.id,
                                ws.slug,
                              )}
                            >
                              <Button className="w-full sm:w-auto" type="submit" variant="outline">
                                Unlock
                              </Button>
                            </form>
                          ) : null}
                        </div>
                      </CardContent>
                      <BusinessAvatar
                        name={ws.name}
                        logoUrl={ws.logoStoragePath ? `/api/business/${ws.slug}/logo` : null}
                        size="lg"
                        className="pointer-events-none absolute right-4 bottom-20 opacity-70 sm:hidden"
                      />
                      <BusinessAvatar
                        name={ws.name}
                        logoUrl={ws.logoStoragePath ? `/api/business/${ws.slug}/logo` : null}
                        size="lg"
                        className="pointer-events-none absolute right-4 bottom-4 hidden opacity-50 transition-opacity sm:block group-hover:opacity-90"
                      />
                    </Card>
                  );
                })}

                <CreateBusinessDialog
                  action={createBusinessAction}
                  businessQuota={businessQuota}
                  triggerVariant="hub-card"
                />
              </div>
            </section>

            {memberships.filter((m) => m.business.recordState === "archived").length > 0 ? (
              <section className="space-y-4">
                <div className="flex items-center gap-2">
                  <Archive className="size-4 text-muted-foreground" />
                  <p className="meta-label">
                    {memberships.filter((m) => m.business.recordState === "archived").length} archived
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {memberships.filter((m) => m.business.recordState === "archived").map((membership) => {
                    const ws = membership.business;
                    const roleMeta = businessMemberRoleMeta[membership.role];
                    return (
                      <Card
                        className="group relative flex flex-col border-border/60 bg-muted/30 opacity-75 transition-opacity hover:opacity-100"
                        key={ws.id}
                      >
                        <CardHeader className="gap-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0 flex-1">
                              <CardTitle className="max-w-full truncate text-lg">
                                {ws.name}
                              </CardTitle>
                              <CardDescription className="mt-1 max-w-full truncate font-medium">
                                /{ws.slug}
                              </CardDescription>
                            </div>
                            <Badge variant="outline" className="gap-1">
                              <Archive className="size-3.5" />
                              Archived
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="flex flex-1 flex-col justify-between space-y-5">
                          <div className="flex flex-wrap gap-2">
                            <Badge className="capitalize" variant="secondary">
                              {roleMeta?.label ?? membership.role}
                            </Badge>
                          </div>
                          <Button asChild className="w-full sm:w-auto" variant="outline">
                            <Link href={getBusinessDashboardPath(ws.slug)} prefetch={true}>
                              Open read-only
                              <ArrowRight data-icon="inline-end" />
                            </Link>
                          </Button>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </section>
            ) : null}
          </div>
        </main>
      </div>
    </>
  );
}
