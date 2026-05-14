import type { Metadata } from "next";
import { Suspense } from "react";

import { RecentBusinessTracker } from "@/features/businesses/components/recent-business-tracker";

import { DashboardShell } from "@/components/shell/dashboard-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { UpgradeButton } from "@/features/billing/components/upgrade-button";
import { BusinessCheckoutProvider } from "@/features/billing/components/business-checkout-provider";
import { LockedBusinessSurface } from "@/features/businesses/components/locked-business-surface";
import { ArchivedBusinessBanner } from "@/features/businesses/components/archived-business-banner";
import { unarchiveBusinessAction } from "@/features/businesses/actions";
import { getAccountProfileForUser } from "@/features/account/queries";
import { resolveUserAvatarSrc } from "@/features/account/utils";
import { getThemePreferenceForUser } from "@/features/theme/queries";
import { getBusinessBillingShellOverview } from "@/features/billing/queries";
import { getBusinessNotificationBellView } from "@/features/notifications/queries";
import { DashboardNotificationBell } from "@/features/notifications/components/dashboard-notification-bell";
import { getBusinessDashboardPath } from "@/features/businesses/routes";
import { getAppShellContext } from "@/lib/app-shell/context";
import { getBusinessMembershipsForUser } from "@/lib/db/business-access";
import { requireSession } from "@/lib/auth/session";
import { timed } from "@/lib/dev/server-timing";
import { siteName } from "@/lib/seo/site";

/**
 * Persistent authenticated shell.
 *
 * The shell frame (sidebar + topbar) renders synchronously so navigations
 * inside this segment don't re-mount the sidebar or flash a full shell
 * skeleton. Slow or optional pieces — billing state, the notification bell,
 * and the upgrade button — stream inside dedicated <Suspense> boundaries.
 *
 * Every page inside (main)/** reads its session + business context through
 * `getAppShellContext`, which is `React.cache`-deduped within a request, so
 * pages never re-await the auth gate.
 */
export default async function BusinessDashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // Kick off every independent shell fetch in parallel. `requireSession` is
  // `React.cache`d, so `getAppShellContext(slug)` reuses its result instead
  // of re-resolving the session. All four queries race in parallel; the
  // business-context lookup is the only one that depends on the slug.
  const session = await requireSession();

  const [businessContextResult, themePreference, allBusinessMemberships, profile] =
    await timed(
      "businessShell.parallelShellFetches",
      Promise.all([
        getAppShellContext(slug),
        getThemePreferenceForUser(session.user.id),
        getBusinessMembershipsForUser(session.user.id, "all"),
        getAccountProfileForUser(session.user.id),
      ]),
    );

  const { user, businessContext } = businessContextResult;

  const businessMemberships = allBusinessMemberships.filter(
    (membership) => membership.business.recordState !== "trash",
  );

  const avatarSrc = resolveUserAvatarSrc({
    avatarStoragePath: profile?.avatarStoragePath,
    profileUpdatedAt: profile?.updatedAt,
    oauthImage: user.image ?? null,
  });

  const archivedBusinessBanner =
    businessContext.business.recordState === "archived" ? (
      <ArchivedBusinessBanner
        dashboardHref={getBusinessDashboardPath(businessContext.business.slug)}
        unarchiveAction={unarchiveBusinessAction.bind(
          null,
          businessContext.business.id,
          businessContext.business.slug,
        )}
      />
    ) : null;

  const notificationSlot = (
    <Suspense fallback={<Skeleton className="size-9 rounded-lg" />}>
      <NotificationBellStreamedSection
        businessId={businessContext.business.id}
        businessSlug={businessContext.business.slug}
        memberSince={businessContext.memberJoinedAt}
        userId={user.id}
      />
    </Suspense>
  );

  const upgradeSlot = (
    <Suspense fallback={null}>
      <UpgradeSlotStreamedSection
        businessId={businessContext.business.id}
        businessSlug={businessContext.business.slug}
      />
    </Suspense>
  );

  return (
    <>
      <RecentBusinessTracker businessSlug={businessContext.business.slug} />
      <BillingBoundary
        businessContext={businessContext}
        archivedBanner={archivedBusinessBanner}
      >
        <DashboardShell
          themePreference={themePreference}
          user={{
            id: user.id,
            email: user.email,
            name: user.name,
            avatarSrc,
          }}
          businessContext={businessContext}
          businessMemberships={businessMemberships}
          bannerSlot={archivedBusinessBanner}
          notificationSlot={notificationSlot}
          upgradeSlot={upgradeSlot}
        >
          {children}
        </DashboardShell>
      </BillingBoundary>
    </>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const { businessContext } = await getAppShellContext(slug);

  const businessName = businessContext.business.name;

  return {
    title: {
      default: businessName,
      template: `%s · ${businessName} | ${siteName}`,
    },
  };
}

/* -------------------------------------------------------------------------- */
/*  Streamed slots — each isolates one slow shell dependency                  */
/* -------------------------------------------------------------------------- */

/**
 * BillingBoundary streams the checkout provider + locked-business banner so
 * the shell frame can render before the billing overview resolves. When
 * billing is unavailable we still render children (locked surface requires
 * billing data, so it is skipped gracefully).
 */
async function BillingBoundary({
  businessContext,
  archivedBanner,
  children,
}: {
  businessContext: Awaited<ReturnType<typeof getAppShellContext>>["businessContext"];
  archivedBanner: React.ReactNode;
  children: React.ReactNode;
}) {
  const billing = await getBusinessBillingShellOverview(
    businessContext.business.id,
  ).catch(() => null);

  const lockedBusinessBanner =
    businessContext.business.recordState === "locked" && billing ? (
      <LockedBusinessSurface
        billing={billing}
        businessContext={businessContext}
      />
    ) : null;

  const bodyWithBanner = (
    <>
      {lockedBusinessBanner}
      {children}
    </>
  );

  // `archivedBanner` is rendered separately inside DashboardShell via
  // `bannerSlot` so we only inject locked-plan banner content here.
  void archivedBanner;

  if (billing) {
    return (
      <BusinessCheckoutProvider billing={billing}>
        {bodyWithBanner}
      </BusinessCheckoutProvider>
    );
  }

  return bodyWithBanner;
}

async function NotificationBellStreamedSection({
  businessId,
  businessSlug,
  memberSince,
  userId,
}: {
  businessId: string;
  businessSlug: string;
  memberSince: Date;
  userId: string;
}) {
  const notificationView = await getBusinessNotificationBellView({
    businessId,
    businessSlug,
    userId,
    memberSince,
  });

  return (
    <DashboardNotificationBell
      businessId={businessId}
      businessSlug={businessSlug}
      initialView={notificationView}
      key={[
        businessId,
        notificationView.unreadCount,
        notificationView.lastReadAt ?? "unread",
        notificationView.items[0]?.id ?? "empty",
      ].join(":")}
      userId={userId}
    />
  );
}

async function UpgradeSlotStreamedSection({
  businessId,
  businessSlug,
}: {
  businessId: string;
  businessSlug: string;
}) {
  const billing = await getBusinessBillingShellOverview(businessId).catch(
    () => null,
  );

  if (!billing || billing.currentPlan === "business") {
    return null;
  }

  return (
    <div className="shrink-0">
      <UpgradeButton
        className="whitespace-nowrap"
        currentPlan={billing.currentPlan}
        defaultCurrency={billing.defaultCurrency}
        region={billing.region}
        size="sm"
        userId={billing.userId}
        businessId={billing.businessId}
        businessSlug={businessSlug}
      />
    </div>
  );
}
