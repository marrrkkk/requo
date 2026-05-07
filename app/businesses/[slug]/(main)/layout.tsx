import { Suspense } from "react";
import { redirect } from "next/navigation";

import { RecentBusinessTracker } from "@/features/businesses/components/recent-business-tracker";

import { DashboardShell } from "@/components/shell/dashboard-shell";
import { DashboardShellSkeleton } from "@/components/shell/dashboard-shell-skeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { UpgradeButton } from "@/features/billing/components/upgrade-button";
import { BusinessCheckoutProvider } from "@/features/billing/components/business-checkout-provider";
import { getAccountProfileForUser } from "@/features/account/queries";
import { resolveUserAvatarSrc } from "@/features/account/utils";
import { getThemePreferenceForUser } from "@/features/theme/queries";
import { getBusinessBillingOverview } from "@/features/billing/queries";
import { getBusinessNotificationBellView } from "@/features/notifications/queries";
import { DashboardNotificationBell } from "@/features/notifications/components/dashboard-notification-bell";
import { businessesHubPath } from "@/features/businesses/routes";
import { requireSession } from "@/lib/auth/session";
import {
  getBusinessContextForMembershipSlug,
  getBusinessMembershipsForUser,
} from "@/lib/db/business-access";

/**
 * Auth gate: resolves session + business membership.
 * Kept thin so loading.tsx can show fallback instantly during client nav.
 * Shell data (theme, profile, billing, memberships) streams in via Suspense.
 */
export default async function BusinessDashboardLayout({
  children,
  params,
}: { children: React.ReactNode; params: Promise<{ slug: string }> }) {
  const [session, { slug }] = await Promise.all([requireSession(), params]);
  const businessContext = await getBusinessContextForMembershipSlug(
    session.user.id,
    slug,
  );

  if (!businessContext) {
    redirect(businessesHubPath);
  }

  // Stream entire shell: sidebar + topbar + children arrive as shell data resolves.
  // This lets loading.tsx show the DashboardShellSkeleton immediately while
  // theme, memberships, profile, and billing load in the background.
  return (
    <Suspense fallback={<DashboardShellSkeleton>{children}</DashboardShellSkeleton>}>
      <StreamedDashboardShell
        userId={session.user.id}
        userEmail={session.user.email}
        userName={session.user.name}
        userImage={session.user.image ?? null}
        businessContext={businessContext}
      >
        {children}
      </StreamedDashboardShell>
    </Suspense>
  );
}

/* -------------------------------------------------------------------------- */
/*  Streamed shell — async server component that resolves shell data          */
/* -------------------------------------------------------------------------- */

async function StreamedDashboardShell({
  userId,
  userEmail,
  userName,
  userImage,
  businessContext,
  children,
}: {
  userId: string;
  userEmail: string;
  userName: string;
  userImage: string | null;
  businessContext: Awaited<ReturnType<typeof getBusinessContextForMembershipSlug>> & {};
  children: React.ReactNode;
}) {
  // All use "use cache" so these resolve from cache on repeat navs.
  const [themePreference, allBusinessMemberships, profile, billing] =
    await Promise.all([
      getThemePreferenceForUser(userId),
      getBusinessMembershipsForUser(userId),
      getAccountProfileForUser(userId),
      getBusinessBillingOverview(businessContext.business.id).catch(
        () => null,
      ),
    ]);

  // Keep only the active business membership for this shell.
  const businessMemberships = allBusinessMemberships.filter(
    (membership) =>
      membership.business.id === businessContext.business.id,
  );

  const avatarSrc = resolveUserAvatarSrc({
    avatarStoragePath: profile?.avatarStoragePath,
    profileUpdatedAt: profile?.updatedAt,
    oauthImage: userImage,
  });

  // Notification bell streams independently via Suspense.
  const notificationSlot = (
    <Suspense fallback={<Skeleton className="size-9 rounded-lg" />}>
      <NotificationBellStreamedSection
        businessId={businessContext.business.id}
        businessSlug={businessContext.business.slug}
        userId={userId}
      />
    </Suspense>
  );

  // Upgrade button uses the already-fetched billing data
  const upgradeSlot =
    billing && billing.currentPlan !== "business" ? (
      <div className="shrink-0">
        <UpgradeButton
          className="whitespace-nowrap"
          currentPlan={billing.currentPlan}
          defaultCurrency={billing.defaultCurrency}
          region={billing.region}
          size="sm"
          userId={billing.userId}
          businessId={billing.businessId}
          businessSlug={billing.businessSlug}
        />
      </div>
    ) : null;

  const shellContent = (
    <>
      <RecentBusinessTracker
        businessSlug={businessContext.business.slug}
      />
      <DashboardShell
        themePreference={themePreference}
        user={{
          id: userId,
          email: userEmail,
          name: userName,
          avatarSrc,
        }}
        businessContext={businessContext}
        businessMemberships={businessMemberships}
        notificationSlot={notificationSlot}
        upgradeSlot={upgradeSlot}
      >
        {children}
      </DashboardShell>
    </>
  );

  // Wrap with checkout context when billing data is available.
  if (billing) {
    return (
      <BusinessCheckoutProvider billing={billing}>
        {shellContent}
      </BusinessCheckoutProvider>
    );
  }

  return shellContent;
}

/* -------------------------------------------------------------------------- */
/*  Streamed sections — async server components wrapped in Suspense above     */
/* -------------------------------------------------------------------------- */

async function NotificationBellStreamedSection({
  businessId,
  businessSlug,
  userId,
}: {
  businessId: string;
  businessSlug: string;
  userId: string;
}) {
  const notificationView = await getBusinessNotificationBellView({
    businessId,
    businessSlug,
    userId,
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
