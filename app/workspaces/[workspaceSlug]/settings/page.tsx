import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { BrandMark } from "@/components/shared/brand-mark";
import { getWorkspaceOverviewBySlug } from "@/features/workspaces/queries";
import { WorkspaceSettingsForm } from "@/features/workspaces/components/workspace-settings-form";
import { getWorkspacePath } from "@/features/workspaces/routes";
import { requireSession } from "@/lib/auth/session";
import { Button } from "@/components/ui/button";
import { LogoutButton } from "@/features/auth/components/logout-button";
import { AppearanceMenu } from "@/features/theme/components/appearance-menu";
import { ThemePreferenceSync } from "@/features/theme/components/theme-preference-sync";
import { getThemePreferenceForUser } from "@/features/theme/queries";

type WorkspaceSettingsPageProps = {
  params: Promise<{
    workspaceSlug: string;
  }>;
};

export default async function WorkspaceSettingsPage(
  props: WorkspaceSettingsPageProps,
) {
  const params = await props.params;
  const session = await requireSession();

  const [overview, themePreference] = await Promise.all([
    getWorkspaceOverviewBySlug(session.user.id, params.workspaceSlug),
    getThemePreferenceForUser(session.user.id),
  ]);

  if (!overview) {
    notFound();
  }

  if (overview.memberRole !== "owner") {
    redirect(getWorkspacePath(overview.slug));
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
            <BrandMark subtitle={`${overview.name} Settings`} />
            <div className="h-4 w-px bg-border max-sm:hidden" />
            <Button
              asChild
              className="max-sm:hidden"
              size="sm"
              variant="ghost"
            >
              <Link href={getWorkspacePath(overview.slug)}>
                <ArrowLeft data-icon="inline-start" className="size-4" />
                Back to overview
              </Link>
            </Button>
          </div>
          <div className="flex items-center gap-3">
            <AppearanceMenu iconOnly userId={session.user.id} />
            <LogoutButton variant="outline" />
          </div>
        </header>

        <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 py-8 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-3xl space-y-8">
            <div>
              <h1 className="font-heading text-[2rem] font-semibold tracking-tight text-foreground sm:text-[2.35rem]">
                Workspace settings
              </h1>
              <p className="mt-2 text-sm leading-7 text-muted-foreground sm:text-[0.96rem]">
                Manage settings for the {overview.name} workspace.
              </p>
            </div>

            <div className="grid gap-6">
              <WorkspaceSettingsForm
                workspace={{
                  id: overview.id,
                  name: overview.name,
                  slug: overview.slug,
                  plan: overview.plan,
                }}
              />
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
