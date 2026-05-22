import Link from "next/link";
import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";

import { BrandMark } from "@/components/shared/brand-mark";
import { BusinessAvatar } from "@/components/shared/business-avatar";
import { Button } from "@/components/ui/button";
import { AccountUserMenu } from "@/features/account/components/account-user-menu";
import { getAccountProfileForUser } from "@/features/account/queries";
import { resolveUserAvatarSrc } from "@/features/account/utils";
import { ThemePreferenceSync } from "@/features/theme/components/theme-preference-sync";
import { getThemePreferenceForUser } from "@/features/theme/queries";
import { getBusinessDashboardPath } from "@/features/businesses/routes";
import { UnifiedSettingsSidebar } from "@/features/settings/components/unified-settings-sidebar";
import { getUnifiedSettingsNavigation } from "@/features/settings/navigation";
import { getAppShellContext } from "@/lib/app-shell/context";
import { requireSession } from "@/lib/auth/session";

import SettingsLoading from "./loading";

/**
 * Standalone settings layout — replaces the business sidebar + topbar with
 * a dedicated page header and settings-only sidebar. This keeps personal
 * settings (Profile, Appearance, Notifications) and business settings in
 * one focused area without the workflow chrome.
 */
export default function SettingsLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ businessSlug: string }>;
}) {
  return (
    <Suspense fallback={<SettingsLoading />}>
      <SettingsShell params={params}>{children}</SettingsShell>
    </Suspense>
  );
}

async function SettingsShell({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ businessSlug: string }>;
}) {
  const { businessSlug } = await params;
  const session = await requireSession();

  const [shellContext, themePreference, profile] = await Promise.all([
    getAppShellContext(businessSlug),
    getThemePreferenceForUser(session.user.id),
    getAccountProfileForUser(session.user.id),
  ]);

  const { user, businessContext } = shellContext;
  const business = businessContext.business;
  const groups = getUnifiedSettingsNavigation(business.slug);
  const dashboardHref = getBusinessDashboardPath(business.slug);

  const avatarSrc = resolveUserAvatarSrc({
    avatarStoragePath: profile?.avatarStoragePath,
    profileUpdatedAt: profile?.updatedAt,
    oauthImage: user.image ?? null,
  });

  return (
    <>
      <ThemePreferenceSync
        themePreference={themePreference}
        userId={user.id}
      />
      <div className="min-h-svh w-full bg-background">
        <header className="sticky top-0 z-10 flex h-[4.5rem] w-full shrink-0 items-center justify-between gap-4 border-b border-border/70 bg-background/95 px-4 backdrop-blur supports-backdrop-filter:bg-background/60 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <Button
              asChild
              size="sm"
              variant="ghost"
              className="shrink-0 gap-1.5 px-2 text-muted-foreground hover:text-foreground"
            >
              <Link href={dashboardHref}>
                <ArrowLeft className="size-4" />
                <span className="hidden sm:inline">Back to {business.name}</span>
                <span className="sm:hidden">Back</span>
              </Link>
            </Button>
            <span
              aria-hidden="true"
              className="hidden h-4 w-px shrink-0 bg-border md:block"
            />
            <BrandMark
              className="hidden min-w-0 md:flex"
              subtitle="Settings"
              href={dashboardHref}
            />
            <div className="flex min-w-0 items-center gap-2.5 md:hidden">
              <BusinessAvatar
                name={business.name}
                logoUrl={
                  business.logoStoragePath
                    ? `/api/business/${business.slug}/logo`
                    : null
                }
                className="size-8 shrink-0 rounded-lg"
              />
              <p className="truncate text-sm font-semibold text-foreground">
                Settings
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3">
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

        <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
          <div className="flex flex-col gap-2">
            <p className="meta-label text-muted-foreground">{business.name}</p>
            <h1 className="font-heading text-[2rem] font-semibold tracking-tight text-foreground sm:text-[2.35rem]">
              Settings
            </h1>
          </div>

          <div className="flex min-h-0 w-full flex-col gap-6 sm:flex-row sm:gap-8 lg:gap-12">
            <UnifiedSettingsSidebar groups={groups} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-col gap-6 pb-24 sm:gap-7 xl:pb-28">
                {children}
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
