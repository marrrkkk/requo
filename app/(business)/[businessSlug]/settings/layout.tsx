import Link from "next/link";
import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";

import { BrandMark } from "@/components/shared/brand-mark";
import { BusinessAvatar } from "@/components/shared/business-avatar";
import { Skeleton } from "@/components/ui/skeleton";
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

/**
 * Standalone settings layout — replaces the business sidebar + topbar with
 * a dedicated page header and settings-only sidebar.
 *
 * The structural frame (header, sidebar nav, page title placeholder) renders
 * instantly using the slug from URL params. Data-dependent parts (business
 * name, user menu, theme sync) stream in via Suspense boundaries.
 */
export default async function SettingsLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ businessSlug: string }>;
}) {
  const { businessSlug } = await params;
  const dashboardHref = getBusinessDashboardPath(businessSlug);
  const groups = getUnifiedSettingsNavigation(businessSlug);

  return (
    <>
      <Suspense fallback={null}>
        <ThemeSyncSlot businessSlug={businessSlug} />
      </Suspense>
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
                <span className="hidden sm:inline">
                  <Suspense fallback="Back">
                    <BackButtonLabel businessSlug={businessSlug} />
                  </Suspense>
                </span>
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
              <Suspense
                fallback={
                  <Skeleton className="size-8 shrink-0 rounded-lg" />
                }
              >
                <MobileBusinessAvatarSlot businessSlug={businessSlug} />
              </Suspense>
              <p className="truncate text-sm font-semibold text-foreground">
                Settings
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <Suspense
              fallback={<Skeleton className="size-9 rounded-full" />}
            >
              <UserMenuSlot businessSlug={businessSlug} />
            </Suspense>
          </div>
        </header>

        <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
          <div className="flex flex-col gap-2">
            <Suspense fallback={<Skeleton className="h-3 w-32 rounded-md" />}>
              <BusinessNameLabel businessSlug={businessSlug} />
            </Suspense>
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

/* -------------------------------------------------------------------------- */
/*  Streamed slots                                                             */
/* -------------------------------------------------------------------------- */

async function ThemeSyncSlot({ businessSlug }: { businessSlug: string }) {
  const { user } = await getAppShellContext(businessSlug);
  const themePreference = await getThemePreferenceForUser(user.id);
  return <ThemePreferenceSync themePreference={themePreference} userId={user.id} />;
}

async function BackButtonLabel({ businessSlug }: { businessSlug: string }) {
  const { businessContext } = await getAppShellContext(businessSlug);
  return <>Back to {businessContext.business.name}</>;
}

async function BusinessNameLabel({ businessSlug }: { businessSlug: string }) {
  const { businessContext } = await getAppShellContext(businessSlug);
  return (
    <p className="meta-label text-muted-foreground">
      {businessContext.business.name}
    </p>
  );
}

async function MobileBusinessAvatarSlot({ businessSlug }: { businessSlug: string }) {
  const { businessContext } = await getAppShellContext(businessSlug);
  const business = businessContext.business;

  return (
    <BusinessAvatar
      name={business.name}
      logoUrl={
        business.logoStoragePath
          ? `/api/business/${business.slug}/logo`
          : null
      }
      className="size-8 shrink-0 rounded-lg"
    />
  );
}

async function UserMenuSlot({ businessSlug }: { businessSlug: string }) {
  const session = await requireSession();
  const [shellContext, profile] = await Promise.all([
    getAppShellContext(businessSlug),
    getAccountProfileForUser(session.user.id),
  ]);

  const { user } = shellContext;

  const avatarSrc = resolveUserAvatarSrc({
    avatarStoragePath: profile?.avatarStoragePath,
    profileUpdatedAt: profile?.updatedAt,
    oauthImage: user.image ?? null,
  });

  return (
    <AccountUserMenu
      user={{
        id: user.id,
        email: user.email,
        name: user.name,
        avatarSrc,
      }}
    />
  );
}
