import { Suspense } from "react";

import { RecentBusinessTracker } from "@/features/businesses/components/recent-business-tracker";
import { DashboardShellFrame } from "@/components/shell/dashboard-shell-frame";
import {
  BusinessSwitcher,
  BusinessSwitcherSkeleton,
  DashboardUserMenu,
  UserMenuSkeleton,
} from "@/components/shell/dashboard-shell-slots";
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
import { ThemePreferenceSync } from "@/features/theme/components/theme-preference-sync";
import { getBusinessBillingShellOverview } from "@/features/billing/queries";
import { getBusinessNotificationBellView } from "@/features/notifications/queries";
import { DashboardNotificationBell } from "@/features/notifications/components/dashboard-notification-bell";
import { SidebarChecklistSection } from "@/features/onboarding/components/sidebar-checklist-section";
import { PendingMessageProvider } from "@/features/ai/chat-ui/pending-message-context";
import { getBusinessDashboardPath } from "@/features/businesses/routes";
import { getAppShellContext } from "@/lib/app-shell/context";
import { getBusinessMembershipsForUser } from "@/lib/db/business-access";
import { requireSession } from "@/lib/auth/session";

/**
 * Dashboard shell layout for the `(main)` route group.
 *
 * Renders the structural shell (sidebar frame, navigation, topbar) instantly
 * using only the business slug from the URL. Data-dependent sections (business
 * switcher, user menu, notifications, upgrade button) stream in via Suspense
 * boundaries so the user sees the real app chrome immediately.
 *
 * This eliminates the full-page skeleton flash on cold loads — only the
 * data-dependent slots show loading indicators.
 */
export default async function BusinessMainLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ businessSlug: string }>;
}) {
  const { businessSlug } = await params;

  return (
    <>
      <UpgradeSuccessToast />
      <PendingMessageProvider>
        <DashboardShellFrame
          businessSlug={businessSlug}
          businessSwitcherSlot={
            <Suspense fallback={<BusinessSwitcherSkeleton />}>
              <BusinessSwitcherSlot businessSlug={businessSlug} />
            </Suspense>
          }
          userMenuSlot={
            <Suspense fallback={<UserMenuSkeleton />}>
              <UserMenuSlot businessSlug={businessSlug} />
            </Suspense>
          }
          notificationSlot={
            <Suspense fallback={<Skeleton className="size-9 rounded-lg" />}>
              <NotificationBellSlot businessSlug={businessSlug} />
            </Suspense>
          }
          upgradeSlot={
            <Suspense fallback={null}>
              <UpgradeSlot businessSlug={businessSlug} />
            </Suspense>
          }
          checklistSlot={
            <Suspense fallback={null}>
              <ChecklistSlot businessSlug={businessSlug} />
            </Suspense>
          }
          themeSyncSlot={
            <Suspense fallback={null}>
              <ThemeSyncSlot businessSlug={businessSlug} />
            </Suspense>
          }
          bannerSlot={
            <Suspense fallback={null}>
              <BannerSlot businessSlug={businessSlug} />
            </Suspense>
          }
        >
          <Suspense fallback={null}>
            <RecentBusinessTrackerSlot businessSlug={businessSlug} />
          </Suspense>
          <Suspense fallback={null}>
            <BillingBoundary businessSlug={businessSlug}>
              {children}
            </BillingBoundary>
          </Suspense>
        </DashboardShellFrame>
      </PendingMessageProvider>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*  Streamed slots — each resolves its own data independently                 */
/* -------------------------------------------------------------------------- */

async function BusinessSwitcherSlot({ businessSlug }: { businessSlug: string }) {
  const { businessContext } = await getAppShellContext(businessSlug);
  const session = await requireSession();
  const allMemberships = await getBusinessMembershipsForUser(session.user.id, "all");
  const memberships = allMemberships.filter(
    (m) => m.business.recordState !== "trash",
  );

  return (
    <BusinessSwitcher
      currentBusiness={businessContext}
      memberships={memberships}
    />
  );
}

async function UserMenuSlot({ businessSlug }: { businessSlug: string }) {
  const { user, businessContext } = await getAppShellContext(businessSlug);
  const profile = await getAccountProfileForUser(user.id);

  const avatarSrc = resolveUserAvatarSrc({
    avatarStoragePath: profile?.avatarStoragePath,
    profileUpdatedAt: profile?.updatedAt,
    oauthImage: user.image ?? null,
  });

  return (
    <DashboardUserMenu
      user={{
        id: user.id,
        email: user.email,
        name: user.name,
        avatarSrc,
      }}
      businessRole={businessContext.role}
      businessSlug={businessContext.business.slug}
      plan={businessContext.business.plan}
    />
  );
}

async function NotificationBellSlot({ businessSlug }: { businessSlug: string }) {
  const { user, businessContext } = await getAppShellContext(businessSlug);

  const notificationView = await getBusinessNotificationBellView({
    businessId: businessContext.business.id,
    businessSlug: businessContext.business.slug,
    userId: user.id,
    memberSince: businessContext.memberJoinedAt,
  });

  return (
    <DashboardNotificationBell
      businessId={businessContext.business.id}
      businessSlug={businessContext.business.slug}
      initialView={notificationView}
      key={[
        businessContext.business.id,
        notificationView.unreadCount,
        notificationView.lastReadAt ?? "unread",
        notificationView.items[0]?.id ?? "empty",
      ].join(":")}
      userId={user.id}
    />
  );
}

async function UpgradeSlot({ businessSlug }: { businessSlug: string }) {
  const { businessContext } = await getAppShellContext(businessSlug);
  const billing = await getBusinessBillingShellOverview(
    businessContext.business.id,
  ).catch(() => null);

  if (!billing || billing.currentPlan !== "free") {
    return null;
  }

  return (
    <BusinessCheckoutProvider billing={billing}>
      <div className="shrink-0">
        <UpgradeButton
          className="whitespace-nowrap"
          currentPlan={billing.currentPlan}
          size="sm"
          userId={billing.userId}
          businessId={billing.businessId}
          businessSlug={businessContext.business.slug}
        />
      </div>
    </BusinessCheckoutProvider>
  );
}

async function ChecklistSlot({ businessSlug }: { businessSlug: string }) {
  const { businessContext } = await getAppShellContext(businessSlug);

  return (
    <SidebarChecklistSection
      businessId={businessContext.business.id}
      businessSlug={businessContext.business.slug}
      publicInquiryEnabled={businessContext.business.publicInquiryEnabled}
    />
  );
}

async function ThemeSyncSlot({ businessSlug }: { businessSlug: string }) {
  const { user } = await getAppShellContext(businessSlug);
  const themePreference = await getThemePreferenceForUser(user.id);

  return <ThemePreferenceSync themePreference={themePreference} userId={user.id} />;
}

async function BannerSlot({ businessSlug }: { businessSlug: string }) {
  const { businessContext } = await getAppShellContext(businessSlug);

  if (businessContext.business.recordState !== "archived") {
    return null;
  }

  return (
    <ArchivedBusinessBanner
      dashboardHref={getBusinessDashboardPath(businessContext.business.slug)}
      unarchiveAction={unarchiveBusinessAction.bind(
        null,
        businessContext.business.id,
        businessContext.business.slug,
      )}
    />
  );
}

async function RecentBusinessTrackerSlot({ businessSlug }: { businessSlug: string }) {
  const { businessContext } = await getAppShellContext(businessSlug);
  return <RecentBusinessTracker businessSlug={businessContext.business.slug} />;
}

async function BillingBoundary({
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

  const isArchived = businessContext.business.recordState === "archived";

  const lockedBanner =
    businessContext.business.recordState === "locked" && billing ? (
      <LockedBusinessSurface
        billing={billing}
        businessContext={businessContext}
      />
    ) : null;

  const body = (
    <div data-archived={isArchived || undefined} data-slot="archived-scope">
      {lockedBanner}
      {children}
    </div>
  );

  if (billing) {
    return (
      <BusinessCheckoutProvider billing={billing}>
        {body}
      </BusinessCheckoutProvider>
    );
  }

  return body;
}
