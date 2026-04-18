import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, /* Plus */ } from "lucide-react";

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
import { onboardingPath } from "@/features/onboarding/routes";

import { LogoutButton } from "@/features/auth/components/logout-button";
import { AppearanceMenu } from "@/features/theme/components/appearance-menu";
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
            <AppearanceMenu iconOnly userId={session.user.id} />
            <LogoutButton variant="outline" />
          </div>
        </header>

        <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 py-8 sm:px-6 lg:px-8">
          <div className="space-y-2 pb-8">
            <h1 className="font-heading text-[2rem] font-semibold tracking-tight text-foreground sm:text-[2.35rem]">
              Your workspaces
            </h1>
            <p className="max-w-2xl text-sm leading-7 text-muted-foreground sm:text-[0.96rem]">
              Each workspace has its own plan, businesses, and team. Switch between workspaces to manage different projects or clients.
            </p>
          </div>

          <div className="w-full space-y-6">
            <section className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <p className="meta-label">
                  {workspaceList.length} workspace{workspaceList.length === 1 ? "" : "s"}
                </p>
                <CreateWorkspaceDialog />
              </div>

              {workspaceList.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {workspaceList.map((ws) => (
                    <Card
                      className="border-border/80 bg-card/98"
                      key={ws.id}
                    >
                      <CardHeader className="gap-3">
                        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
                          <div className="flex min-w-0 items-start gap-3">
                            <div className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-border/70 bg-background/90 text-sm font-semibold tracking-[0.16em] text-foreground">
                              {ws.name
                                .split(" ")
                                .slice(0, 2)
                                .map((s) => s[0]?.toUpperCase())
                                .join("")}
                            </div>
                            <div className="min-w-0 flex-1">
                              <CardTitle className="max-w-full truncate">
                                {ws.name}
                              </CardTitle>
                              <CardDescription className="mt-1 max-w-full truncate">
                                /{ws.slug}
                              </CardDescription>
                            </div>
                          </div>
                          <PlanBadge plan={ws.plan} />
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
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
                        </div>
                        <Button asChild className="w-full sm:w-auto">
                          <Link href={getWorkspacePath(ws.slug)} prefetch={true}>
                            Open workspace
                            <ArrowRight data-icon="inline-end" />
                          </Link>
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="border-dashed">
                  <CardHeader>
                    <CardTitle>No workspaces yet</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Create your first workspace to start organizing your businesses.
                    </p>
                  </CardContent>
                </Card>
              )}
            </section>

          </div>
        </main>
      </div>
    </>
  );
}
