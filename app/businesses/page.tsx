import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, CalendarClock, PlusCircle } from "lucide-react";
import crypto from "crypto";

import { BrandMark } from "@/components/shared/brand-mark";
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
import { getBusinessDashboardPath, businessesHubPath } from "@/features/businesses/routes";
import { getAccountProfileForUser } from "@/features/account/queries";
import { AccountUserMenu } from "@/features/account/components/account-user-menu";
import { resolveUserAvatarSrc } from "@/features/account/utils";
import { onboardingPath } from "@/features/onboarding/routes";
import { RecentlyOpenedBusinesses } from "@/features/businesses/components/recently-opened-businesses";
import { getRecentlyOpenedBusinessesForUser } from "@/features/businesses/recently-opened";
import { getBusinessQuotaForUser } from "@/features/businesses/quota";

import { ThemePreferenceSync } from "@/features/theme/components/theme-preference-sync";
import { getThemePreferenceForUser } from "@/features/theme/queries";
import { requireSession } from "@/lib/auth/session";
import { getBusinessMembershipsForUser } from "@/lib/db/business-access";
import { businessMemberRoleMeta } from "@/lib/business-members";

export default async function BusinessesPage() {
  const session = await requireSession();

  const [
    themePreference,
    profile,
    memberships,
    recentlyOpenedBusinesses,
    businessQuota,
  ] = await Promise.all([
    getThemePreferenceForUser(session.user.id),
    getAccountProfileForUser(session.user.id),
    getBusinessMembershipsForUser(session.user.id),
    getRecentlyOpenedBusinessesForUser(session.user.id),
    getBusinessQuotaForUser({
      ownerUserId: session.user.id,
    }),
  ]);

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
            <RecentlyOpenedBusinesses businesses={recentlyOpenedBusinesses} />

            <section className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <p className="meta-label">
                  {memberships.length} business{memberships.length === 1 ? "" : "es"}
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {memberships.map((membership) => {
                  const ws = membership.business;
                  const roleMeta = businessMemberRoleMeta[membership.role];
                  return (
                    <Card
                      className="group flex flex-col border-border/80 bg-card/98 transition-colors hover:border-border hover:bg-card hover:shadow-sm"
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
                        </div>
                        <Button asChild className="w-full sm:w-auto" variant="default">
                          <Link href={getBusinessDashboardPath(ws.slug)} prefetch={true}>
                            Open business
                            <ArrowRight data-icon="inline-end" />
                          </Link>
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}

                <CreateBusinessDialog
                  action={createBusinessAction}
                  businessId={crypto.randomUUID()}
                  businessQuota={businessQuota}
                  trigger={
                    <Card
                      role="button"
                      className="group flex flex-col border-dashed border-border/80 bg-transparent transition-colors hover:border-border hover:bg-card/50 cursor-pointer"
                    >
                      <CardHeader className="gap-4">
                        <div className="flex items-center gap-3 text-muted-foreground group-hover:text-foreground transition-colors">
                          <PlusCircle className="size-5" />
                          <CardTitle className="text-lg">New business</CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent className="flex flex-1 flex-col justify-end space-y-5">
                        <CardDescription className="max-w-full">
                          Set up a new business with inquiry capture, quote defaults, and follow-up basics.
                        </CardDescription>
                        <Button className="w-full sm:w-auto" variant="secondary">
                          Create business
                        </Button>
                      </CardContent>
                    </Card>
                  }
                />
              </div>
            </section>
          </div>
        </main>
      </div>
    </>
  );
}
