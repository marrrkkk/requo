import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { BrandMark } from "@/components/shared/brand-mark";
import { AccountUserMenu } from "@/features/account/components/account-user-menu";
import { getAccountProfileForUser } from "@/features/account/queries";
import { resolveUserAvatarSrc } from "@/features/account/utils";
import { getWorkspaceOverviewBySlug, getWorkspaceListForUser } from "@/features/workspaces/queries";
import { WorkspaceOverviewContent } from "@/features/workspaces/components/workspace-overview";
import { createBusinessAction } from "@/features/businesses/actions";
import {
  getWorkspacePath,
  workspacesHubPath,
} from "@/features/workspaces/routes";
import { requireSession } from "@/lib/auth/session";
import { Button } from "@/components/ui/button";
import { ThemePreferenceSync } from "@/features/theme/components/theme-preference-sync";
import { getThemePreferenceForUser } from "@/features/theme/queries";
import { getWorkspaceBillingOverview } from "@/features/billing/queries";
import { WorkspaceCheckoutProvider } from "@/features/billing/components/workspace-checkout-provider";
import { finalizeScheduledWorkspaceDeletionIfDue } from "@/features/workspaces/mutations";

type WorkspacePageProps = {
  params: Promise<{
    workspaceSlug: string;
  }>;
  searchParams?: Promise<{
    view?: string;
  }>;
};

export default async function WorkspacePage(props: WorkspacePageProps) {
  const params = await props.params;
  const searchParams = (await props.searchParams) ?? {};
  const session = await requireSession();
  const businessView =
    searchParams.view === "archived" || searchParams.view === "trash"
      ? searchParams.view
      : "active";

  const [overview, themePreference, workspaceList, profile] = await Promise.all([
    getWorkspaceOverviewBySlug(session.user.id, params.workspaceSlug, businessView),
    getThemePreferenceForUser(session.user.id),
    getWorkspaceListForUser(session.user.id),
    getAccountProfileForUser(session.user.id),
  ]);

  if (!overview) {
    notFound();
  }

  const [finalizedDeletion, billingOverview] = await Promise.all([
    finalizeScheduledWorkspaceDeletionIfDue(overview.id),
    getWorkspaceBillingOverview(overview.id),
  ]);

  if (finalizedDeletion.deleted) {
    redirect(workspacesHubPath);
  }
  const avatarSrc = resolveUserAvatarSrc({
    avatarStoragePath: profile?.avatarStoragePath,
    profileUpdatedAt: profile?.updatedAt,
    oauthImage: session.user.image ?? null,
  });

  const content = (
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

  if (!billingOverview) {
    return content;
  }

  return (
    <WorkspaceCheckoutProvider billing={billingOverview}>
      {content}
    </WorkspaceCheckoutProvider>
  );
}
