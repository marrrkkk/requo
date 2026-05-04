import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";

import { DashboardPage } from "@/components/shared/dashboard-layout";
import { BrandMark } from "@/components/shared/brand-mark";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AccountSettingsNav } from "@/features/account/components/account-settings-nav";
import { AccountUserMenu } from "@/features/account/components/account-user-menu";
import { getAccountSettingsNavigation } from "@/features/account/navigation";
import { getAccountProfileForUser } from "@/features/account/queries";
import { resolveUserAvatarSrc } from "@/features/account/utils";
import { ThemePreferenceSync } from "@/features/theme/components/theme-preference-sync";
import { getThemePreferenceForUser } from "@/features/theme/queries";
import { workspacesHubPath } from "@/features/workspaces/routes";
import { requireSession } from "@/lib/auth/session";
import { createNoIndexMetadata } from "@/lib/seo/site";

export const metadata: Metadata = createNoIndexMetadata({
  absoluteTitle: "Requo account",
  description: "Private account settings for Requo users.",
});
export const preferredRegion = "syd1";

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<AccountShellFallback />}>
      <AccountSettingsShell>{children}</AccountSettingsShell>
    </Suspense>
  );
}

async function AccountSettingsShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSession();
  const [themePreference, profile] = await Promise.all([
    getThemePreferenceForUser(session.user.id),
    getAccountProfileForUser(session.user.id),
  ]);
  const navigationGroups = getAccountSettingsNavigation();
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
            <BrandMark href={workspacesHubPath} subtitle="Account" />
            <div className="h-4 w-px bg-border max-sm:hidden" />
            <Button asChild className="max-sm:hidden" size="sm" variant="ghost">
              <Link href={workspacesHubPath}>
                <ArrowLeft data-icon="inline-start" className="size-4" />
                Back to workspaces
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
          <DashboardPage>
            <PageHeader
              description="Manage your personal details, sign-in, sessions, and account safeguards."
              eyebrow="User settings"
              title="Your account"
            />
            <div className="flex min-w-0 flex-col gap-6">
              <AccountSettingsNav groups={navigationGroups} />
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
}

function AccountShellFallback() {
  return (
    <div className="min-h-svh w-full bg-background">
      <header className="sticky top-0 z-10 flex h-[4.5rem] w-full shrink-0 items-center justify-between border-b border-border/70 bg-background/95 px-4 backdrop-blur supports-backdrop-filter:bg-background/60 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4">
          <BrandMark href={workspacesHubPath} subtitle="Account" />
          <div className="h-4 w-px bg-border max-sm:hidden" />
          <Skeleton className="hidden h-9 w-40 rounded-lg sm:block" />
        </div>
        <Skeleton className="size-10 rounded-full" />
      </header>

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 py-8 sm:px-6 lg:px-8">
        <DashboardPage>
          <div className="space-y-3">
            <Skeleton className="h-4 w-24 rounded-md" />
            <Skeleton className="h-11 w-56 rounded-xl" />
            <Skeleton className="h-4 w-full max-w-2xl rounded-md" />
          </div>
          <div className="flex min-w-0 flex-col gap-6">
            <div className="flex gap-1">
              <Skeleton className="h-9 w-28 rounded-md" />
              <Skeleton className="h-9 w-28 rounded-md" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-col gap-6 pb-24 sm:gap-7 xl:pb-28">
                <div className="dashboard-side-stack">
                  <Skeleton className="h-4 w-20 rounded-md" />
                  <Skeleton className="h-10 w-56 rounded-xl" />
                  <Skeleton className="h-4 w-full max-w-xl rounded-md" />
                  <Skeleton className="h-64 w-full rounded-3xl" />
                </div>
              </div>
            </div>
          </div>
        </DashboardPage>
      </main>
    </div>
  );
}
