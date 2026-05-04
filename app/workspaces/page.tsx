import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, CalendarClock } from "lucide-react";

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
import { CreateWorkspaceDialog } from "@/features/workspaces/components/create-workspace-dialog";
import { getWorkspaceListForUser } from "@/features/workspaces/queries";
import { getWorkspacePath, workspacesHubPath } from "@/features/workspaces/routes";
import { getAccountProfileForUser } from "@/features/account/queries";
import { AccountUserMenu } from "@/features/account/components/account-user-menu";
import { resolveUserAvatarSrc } from "@/features/account/utils";
import { onboardingPath } from "@/features/onboarding/routes";
import { RecentlyOpenedBusinesses } from "@/features/businesses/components/recently-opened-businesses";

import { ThemePreferenceSync } from "@/features/theme/components/theme-preference-sync";
import { getThemePreferenceForUser } from "@/features/theme/queries";
import { requireSession } from "@/lib/auth/session";
import { getBusinessMembershipsForUser } from "@/lib/db/business-access";

export default async function WorkspacesPage() {
  const session = await requireSession();

  const [themePreference, workspaceList, profile, memberships] = await Promise.all([
    getThemePreferenceForUser(session.user.id),
    getWorkspaceListForUser(session.user.id),
    getAccountProfileForUser(session.user.id),
    getBusinessMembershipsForUser(session.user.id),
  ]);

  if (
    workspaceList.length === 0 &&
    memberships.length === 0 &&
    !profile?.onboardingCompletedAt
  ) {
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
            <BrandMark subtitle="Workspaces" href={workspacesHubPath} />
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
              Your workspaces
            </h1>
            <p className="max-w-2xl text-sm leading-normal sm:leading-7 text-muted-foreground sm:text-[0.96rem]">
              Manage your businesses, plans, and team access across different workspaces.
            </p>
          </div>

          <div className="w-full space-y-6">
            <RecentlyOpenedBusinesses userId={session.user.id} />

            <section className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <p className="meta-label">
                  {workspaceList.length} workspace{workspaceList.length === 1 ? "" : "s"}
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {workspaceList.map((ws) => (
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
                        <Badge variant="outline">
                          {ws.businessCount} business{ws.businessCount === 1 ? "" : "es"}
                        </Badge>
                        <Badge
                          className="capitalize"
                          variant="secondary"
                        >
                          {ws.memberRole}
                        </Badge>
                        {ws.scheduledDeletionAt ? (
                          <Badge className="gap-1" variant="destructive">
                            <CalendarClock className="size-3.5" />
                            Deletion scheduled
                          </Badge>
                        ) : null}
                      </div>
                      <Button asChild className="w-full sm:w-auto" variant="default">
                        <Link href={getWorkspacePath(ws.slug)} prefetch={true}>
                          Open workspace
                          <ArrowRight data-icon="inline-end" />
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                ))}

                <CreateWorkspaceDialog triggerVariant="card" />
              </div>
            </section>

          </div>
        </main>
      </div>
    </>
  );
}
