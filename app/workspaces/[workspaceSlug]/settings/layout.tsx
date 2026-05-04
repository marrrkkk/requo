import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { BrandMark } from "@/components/shared/brand-mark";
import { DashboardPage } from "@/components/shared/dashboard-layout";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { AccountUserMenu } from "@/features/account/components/account-user-menu";
import { getAccountProfileForUser } from "@/features/account/queries";
import { resolveUserAvatarSrc } from "@/features/account/utils";
import { ThemePreferenceSync } from "@/features/theme/components/theme-preference-sync";
import { getThemePreferenceForUser } from "@/features/theme/queries";
import { getWorkspaceBillingOverview } from "@/features/billing/queries";
import { WorkspaceCheckoutProvider } from "@/features/billing/components/workspace-checkout-provider";
import { WorkspaceSettingsNav } from "@/features/workspaces/components/workspace-settings-nav";
import { getWorkspaceSettingsNavigation } from "@/features/workspaces/navigation";
import { getWorkspacePath } from "@/features/workspaces/routes";
import { getWorkspaceOwnerPageContext } from "./_lib/page-context";

export default async function WorkspaceSettingsLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ workspaceSlug: string }>;
}) {
  const { workspaceSlug } = await params;
  const { user, workspace } = await getWorkspaceOwnerPageContext(workspaceSlug);
  const [themePreference, profile, billing] = await Promise.all([
    getThemePreferenceForUser(user.id),
    getAccountProfileForUser(user.id),
    getWorkspaceBillingOverview(workspace.id),
  ]);
  const navigationGroups = getWorkspaceSettingsNavigation(workspace.slug);
  const avatarSrc = resolveUserAvatarSrc({
    avatarStoragePath: profile?.avatarStoragePath,
    profileUpdatedAt: profile?.updatedAt,
    oauthImage: user.image ?? null,
  });

  const content = (
    <>
      <ThemePreferenceSync themePreference={themePreference} userId={user.id} />
      <div className="min-h-svh w-full bg-background">
        <header className="sticky top-0 z-10 flex h-[4.5rem] w-full shrink-0 items-center justify-between border-b border-border/70 bg-background/95 px-4 backdrop-blur supports-backdrop-filter:bg-background/60 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <BrandMark
              href={getWorkspacePath(workspace.slug)}
              subtitle={`${workspace.name} Settings`}
            />
            <div className="h-4 w-px bg-border max-sm:hidden" />
            <Button asChild className="max-sm:hidden" size="sm" variant="ghost">
              <Link href={getWorkspacePath(workspace.slug)}>
                <ArrowLeft data-icon="inline-start" className="size-4" />
                Back to overview
              </Link>
            </Button>
          </div>
          <div className="flex items-center gap-3">
            <AccountUserMenu
              user={{
                id: user.id,
                email: user.email,
                name: user.name,
                avatarSrc,
              }}
            />
          </div>
        </header>

        <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 py-8 sm:px-6 lg:px-8">
          <DashboardPage>
            <PageHeader
              description={`Manage settings, billing, and accountability history for the ${workspace.name} workspace.`}
              eyebrow="Workspace settings"
              title={workspace.name}
            />
            <div className="flex min-w-0 flex-col gap-6">
              <WorkspaceSettingsNav groups={navigationGroups} />
              <div className="min-w-0">
                <div className="flex flex-col gap-6 pb-24 sm:gap-7 xl:pb-28">
                  {children}
                </div>
              </div>
            </div>
          </DashboardPage>
        </main>
      </div>
    </>
  );

  if (!billing) {
    return content;
  }

  return (
    <WorkspaceCheckoutProvider billing={billing}>
      {content}
    </WorkspaceCheckoutProvider>
  );
}
