import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, PlusCircle } from "lucide-react";

import { LogoutButton } from "@/features/auth/components/logout-button";
import { accountProfilePath } from "@/features/account/routes";
import { getAccountProfileForUser } from "@/features/account/queries";
import { AppearanceMenu } from "@/features/theme/components/appearance-menu";
import { ThemePreferenceSync } from "@/features/theme/components/theme-preference-sync";
import { getThemePreferenceForUser } from "@/features/theme/queries";
import { CreateBusinessForm } from "@/features/businesses/components/create-business-form";
import { createBusinessAction } from "@/features/businesses/actions";
import { getBusinessDashboardPath } from "@/features/businesses/routes";
import { onboardingPath } from "@/features/onboarding/routes";
import { requireSession } from "@/lib/auth/session";
import {
  getBusinessContextForUser,
  getBusinessMembershipsForUser,
} from "@/lib/db/business-access";
import { BrandMark } from "@/components/shared/brand-mark";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function BusinessesPage() {
  const session = await requireSession();
  const [themePreference, memberships, activeBusinessContext, profile] =
    await Promise.all([
      getThemePreferenceForUser(session.user.id),
      getBusinessMembershipsForUser(session.user.id),
      getBusinessContextForUser(session.user.id),
      getAccountProfileForUser(session.user.id),
    ]);

  if (memberships.length === 0 && !profile?.onboardingCompletedAt) {
    redirect(onboardingPath);
  }

  return (
    <>
      <ThemePreferenceSync
        themePreference={themePreference}
        userId={session.user.id}
      />
      <div className="min-h-svh">
        <div className="mx-auto flex min-h-svh w-full max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
          <header className="flex flex-col gap-6 border-b border-border/70 pb-8 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-4">
              <BrandMark subtitle="Business hub" />
              <div className="space-y-2">
                <Badge variant="secondary">Signed in as {session.user.email}</Badge>
                <div>
                  <h1 className="font-heading text-[2rem] font-semibold tracking-tight text-foreground sm:text-[2.35rem]">
                    Choose a business
                  </h1>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button asChild variant="outline">
                <Link href={accountProfilePath} prefetch={true}>
                  Profile
                </Link>
              </Button>
              <AppearanceMenu userId={session.user.id} />
              <LogoutButton variant="outline" />
            </div>
          </header>

          <div className="grid flex-1 gap-6 py-8 xl:grid-cols-[minmax(0,1.2fr)_24rem]">
            <section className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="meta-label">Your businesses</p>
                  <h2 className="mt-1 text-xl font-semibold tracking-tight text-foreground">
                    {memberships.length
                      ? `${memberships.length} business${memberships.length === 1 ? "" : "s"}`
                      : "No businesses yet"}
                  </h2>
                </div>
              </div>

              {memberships.length ? (
                <div className="grid gap-4 lg:grid-cols-2">
                  {memberships.map((membership) => {
                    const businessPath = getBusinessDashboardPath(
                      membership.business.slug,
                    );
                    const isActiveBusiness =
                      activeBusinessContext?.business.id === membership.business.id;

                    return (
                      <Card
                        className="border-border/80 bg-card/98"
                        key={membership.membershipId}
                      >
                        <CardHeader className="gap-3">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex min-w-0 items-start gap-3">
                              <div className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-border/70 bg-background/90 text-sm font-semibold tracking-[0.16em] text-foreground">
                                {getInitials(membership.business.name)}
                              </div>
                              <div className="min-w-0">
                                <CardTitle className="truncate">
                                  {membership.business.name}
                                </CardTitle>
                                <CardDescription className="mt-1 truncate">
                                  /{membership.business.slug}
                                </CardDescription>
                              </div>
                            </div>
                            <Badge
                              variant={
                                membership.role === "owner" ? "secondary" : "outline"
                              }
                            >
                              {membership.role}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="flex flex-wrap gap-2">
                            <Badge variant="outline">
                              {membership.business.defaultCurrency}
                            </Badge>
                            <Badge
                              variant={
                                membership.business.publicInquiryEnabled
                                  ? "secondary"
                                  : "outline"
                              }
                            >
                              {membership.business.publicInquiryEnabled
                                ? "Public form live"
                                : "Public form off"}
                            </Badge>
                            {isActiveBusiness ? (
                              <Badge variant="secondary">Last opened</Badge>
                            ) : null}
                          </div>

                          <Button asChild className="w-full sm:w-auto">
                            <Link href={businessPath} prefetch={true}>
                              Open dashboard
                              <ArrowRight data-icon="inline-end" />
                            </Link>
                          </Button>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <Card className="border-dashed">
                  <CardHeader>
                    <CardTitle>Start with your first business</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="soft-panel flex items-start gap-3 px-4 py-4 shadow-none">
                      <PlusCircle className="mt-0.5 size-5 text-primary" />
                      <div className="space-y-1.5">
                        <p className="text-sm font-medium text-foreground">
                          No businesses yet.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </section>

            <aside>
              <Card className="sticky top-6">
                <CardHeader>
                  <CardTitle>Create business</CardTitle>
                </CardHeader>
                <CardContent>
                  <CreateBusinessForm action={createBusinessAction} />
                </CardContent>
              </Card>
            </aside>
          </div>
        </div>
      </div>
    </>
  );
}

function getInitials(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((segment) => segment[0]?.toUpperCase())
    .join("");
}
