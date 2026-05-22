import { Suspense } from "react";

import { RecentBusinessTracker } from "@/features/businesses/components/recent-business-tracker";

import { DashboardShell } from "@/components/shell/dashboard-shell";
import BusinessSlugLoading from "../loading";
import { Skeleton } from "@/components/ui/skeleton";
import { UpgradeButton } from "@/features/billing/components/upgrade-button";
import { BusinessCheckoutProvider } from "@/features/billing/components/business-checkout-provider";
import { UpgradeSuccessToast } from "@/features/billing/components/upgrade-success-toast";
import { LockedBusinessSurface } from "@/features/businesses/components/locked-business-surface";
import { ArchivedBusinessBanner } from "@/features/businesses/components/archived-business-banner";
import { unarchiveBusinessAction } from "@/features/businesses/actions";
import { getAccountProfileForUser } from "@/features/account/queries";
import { resolveUserAvatarSrc } from "@/features/account/utils";
import { getThemePreferenceForUser } from "@/features/theme/queries";
import { getBusinessBillingShellOverview } from "@/features/billing/queries";
import { getBusinessNotificationBellView } from "@/features/notifications/queries";
import { DashboardNotificationBell } from "@/features/notifications/components/dashboard-notification-bell";
import { SidebarChecklistSection } from "@/features/onboarding/components/sidebar-checklist-section";
import { getBusinessDashboardPath } from "@/features/businesses/routes";
import { getAppShellContext } from "@/lib/app-shell/context";
import { getBusinessMembershipsForUser } from "@/lib/db/business-access";
import { requireSession } from "@/lib/auth/session";
import { timed } from "@/lib/dev/server-timing";

/**
 * Dashboard shell layout for the `(main)` route group.
 *
 * Wraps inquiries, quotes, follow-ups, analytics, etc. with the persistent
 * business sidebar + topbar. Settings live OUTSIDE this group so they can
 * use their own dedicated layout without the business chrome.
 *
 * The outer component is synchronous; auth-gated work streams through a
 * Suspense boundary to satisfy Next.js 16 cacheComponents rules.
 */
export default function BusinessMainLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ businessSlug: string }>;
}) {
  return (
    <Suspense fallback={<BusinessSlugLoading />}>
      <BusinessMainShell params={params}>{children}</BusinessMainShell>
    </Suspense>
  );
}

async function BusinessMainShell({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ businessSlug: string }>;
}) {
  const { businessSlug } = await params;

  const session = await requireSession();

  const [businessContextResult, themePreference, allBusinessMemberships, profile] =
    await timed(
      "businessShell.parallelShellFetches",
      Promise.all([
        getAppShellContext(businessSlug),
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

  const checklistSlot = (
    <Suspense fallback={null}>
      <SidebarChecklistSection
        businessId={businessContext.business.id}
        businessSlug={businessContext.business.slug}
        publicInquiryEnabled={businessContext.business.publicInquiryEnabled}
      />
    </Suspense>
  );

  return (
    <>
      <RecentBusinessTracker businessSlug={businessContext.business.slug} />
      <UpgradeSuccessToast />
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
          checklistSlot={checklistSlot}
        >
          {children}
        </DashboardShell>
      </BillingBoundary>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*  Streamed slots — each isolates one slow shell dependency                  */
/* -------------------------------------------------------------------------- */

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
        size="sm"
        userId={billing.userId}
        businessId={billing.businessId}
        businessSlug={businessSlug}
      />
    </div>
  );
}
