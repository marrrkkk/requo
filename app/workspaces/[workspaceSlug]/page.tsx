import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Settings2 } from "lucide-react";
import Link from "next/link";

import { BrandMark } from "@/components/shared/brand-mark";
import { getWorkspaceOverviewBySlug, getWorkspaceListForUser } from "@/features/workspaces/queries";
import { WorkspaceOverviewContent } from "@/features/workspaces/components/workspace-overview";
import { createBusinessAction } from "@/features/businesses/actions";
import {
  getWorkspaceSettingsPath,
  getWorkspacePath,
  workspacesHubPath,
} from "@/features/workspaces/routes";
import { requireSession } from "@/lib/auth/session";
import { Button } from "@/components/ui/button";
import { LogoutButton } from "@/features/auth/components/logout-button";
import { AppearanceMenu } from "@/features/theme/components/appearance-menu";
import { ThemePreferenceSync } from "@/features/theme/components/theme-preference-sync";
import { getThemePreferenceForUser } from "@/features/theme/queries";
import { getWorkspaceBillingOverview } from "@/features/billing/queries";

type WorkspacePageProps = {
  params: Promise<{
    workspaceSlug: string;
  }>;
};

export default async function WorkspacePage(props: WorkspacePageProps) {
  const params = await props.params;
  const session = await requireSession();

  const [overview, themePreference, workspaceList] = await Promise.all([
    getWorkspaceOverviewBySlug(session.user.id, params.workspaceSlug),
    getThemePreferenceForUser(session.user.id),
    getWorkspaceListForUser(session.user.id),
  ]);

  if (!overview) {
    notFound();
  }

  const billingOverview = await getWorkspaceBillingOverview(overview.id);
  const isOwner = overview.memberRole === "owner";

  return (
    <>
      <ThemePreferenceSync
        themePreference={themePreference}
        userId={session.user.id}
      />
      <div className="min-h-svh w-full bg-background">
        <header className="sticky top-0 z-10 flex h-[4.5rem] w-full shrink-0 items-center justify-between border-b border-border/70 bg-background/95 px-4 backdrop-blur supports-backdrop-filter:bg-background/60 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <BrandMark subtitle={overview.name} href={getWorkspacePath(overview.slug)} />
            <div className="h-4 w-px bg-border max-sm:hidden" />
            <Button
              asChild
              className="max-sm:hidden"
              size="sm"
              variant="ghost"
            >
              <Link href={workspacesHubPath}>
                <ArrowLeft data-icon="inline-start" className="size-4" />
                All workspaces
              </Link>
            </Button>
          </div>
          <div className="flex items-center gap-3">
            {isOwner && (
              <Button asChild size="icon" variant="ghost" title="Workspace settings">
                <Link href={getWorkspaceSettingsPath(overview.slug)} prefetch={true}>
                  <Settings2 className="size-4" />
                </Link>
              </Button>
            )}
            <AppearanceMenu iconOnly userId={session.user.id} />
            <LogoutButton variant="outline" />
          </div>
        </header>

        <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 py-8 sm:px-6 lg:px-8">
          <div className="space-y-8">
            <div>
              <h1 className="font-heading text-[2rem] font-semibold tracking-tight text-foreground sm:text-[2.35rem]">
                {overview.name}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-[0.96rem]">
                Manage businesses, team members, and billing for this workspace.
              </p>
            </div>
            
            <WorkspaceOverviewContent
              overview={overview}
              workspaceList={workspaceList}
              billingOverview={billingOverview!}
              createBusinessAction={createBusinessAction}
            />
          </div>
        </main>
      </div>
    </>
  );
}
