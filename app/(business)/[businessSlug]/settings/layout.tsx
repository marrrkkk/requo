import Link from "next/link";
import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { BusinessAvatar } from "@/components/shared/business-avatar";
import { getAccountProfileForUser } from "@/features/account/queries";
import { resolveUserAvatarSrc } from "@/features/account/utils";
import { ThemePreferenceSync } from "@/features/theme/components/theme-preference-sync";
import { getThemePreferenceForUser } from "@/features/theme/queries";
import { getUnifiedSettingsNavigation } from "@/features/settings/navigation";
import { SettingsShellFrame, SettingsUserMenu } from "@/features/settings/components/settings-shell-frame";
import { BusinessCheckoutProvider } from "@/features/billing/components/business-checkout-provider";
import { getBusinessBillingShellOverview } from "@/features/billing/queries";
import { getBusinessDashboardPath } from "@/features/businesses/routes";
import { getAppShellContext } from "@/lib/app-shell/context";
import { requireSession } from "@/lib/auth/session";

/**
 * Settings layout using the same sidebar shell pattern as the business
 * dashboard. Renders a collapsible sidebar with settings navigation and
 * a content inset area. No back button — navigation is handled by the
 * sidebar itself.
 *
 * Mounts BusinessCheckoutProvider so paywall components inside settings
 * (knowledge, pricing, email, members, billing, etc.) can open the plan
 * selection sheet through the same shared state used in the main shell.
 */
export default async function SettingsLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ businessSlug: string }>;
}) {
  const { businessSlug } = await params;
  const groups = getUnifiedSettingsNavigation(businessSlug);

  return (
    <>
      <Suspense fallback={null}>
        <ThemeSyncSlot businessSlug={businessSlug} />
      </Suspense>
      <SettingsShellFrame
        businessSlug={businessSlug}
        groups={groups}
        userMenuSlot={
          <Suspense fallback={<UserMenuSkeleton />}>
            <UserMenuSlot businessSlug={businessSlug} />
          </Suspense>
        }
        businessNameSlot={
          <Suspense
            fallback={
              <div className="flex items-center gap-2.5 px-1 py-1">
                <Skeleton className="size-7 shrink-0 rounded-full" />
                <Skeleton className="h-4 w-24 rounded-md" />
              </div>
            }
          >
            <BusinessNameSlot businessSlug={businessSlug} />
          </Suspense>
        }
      >
        <Suspense fallback={children}>
          <CheckoutProviderSlot businessSlug={businessSlug}>
            {children}
          </CheckoutProviderSlot>
        </Suspense>
      </SettingsShellFrame>
    </>
  );
}

/**
 * Streams the BusinessCheckoutProvider mount alongside the shell so the
 * settings layout doesn't block on a billing fetch. If the billing query
 * fails or the user is on the highest plan, children render without the
 * provider — the UpgradeButton falls back to its self-contained sheet.
 */
async function CheckoutProviderSlot({
  businessSlug,
  children,
}: {
  businessSlug: string;
  children: React.ReactNode;
}) {
  const { businessContext } = await getAppShellContext(businessSlug);
  const billing = await getBusinessBillingShellOverview(
    businessContext.business.id,
  ).catch(() => null);

  if (!billing) {
    return <>{children}</>;
  }

  return (
    <BusinessCheckoutProvider billing={billing}>
      {children}
    </BusinessCheckoutProvider>
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

async function BusinessNameSlot({ businessSlug }: { businessSlug: string }) {
  const { businessContext } = await getAppShellContext(businessSlug);
  const business = businessContext.business;
  const logoUrl = business.logoStoragePath ? "/api/business/logo" : null;
  const dashboardPath = getBusinessDashboardPath(businessSlug);
  return (
    <Link
      href={dashboardPath}
      className="flex min-w-0 items-center gap-2.5 rounded-md px-1 py-1 transition-colors hover:bg-sidebar-accent"
    >
      <BusinessAvatar
        name={business.name}
        logoUrl={logoUrl}
        size="sm"
        loading="eager"
      />
      <span className="truncate text-sm font-medium text-foreground">
        {business.name}
      </span>
    </Link>
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
    <SettingsUserMenu
      user={{ id: user.id, email: user.email, name: user.name, avatarSrc }}
      businessSlug={businessSlug}
    />
  );
}

function UserMenuSkeleton() {
  return (
    <div className="flex items-center gap-2.5 px-2 py-1.5">
      <Skeleton className="size-8 shrink-0 rounded-lg" />
      <div className="flex flex-col gap-1">
        <Skeleton className="h-3.5 w-20 rounded" />
        <Skeleton className="h-3 w-28 rounded" />
      </div>
    </div>
  );
}