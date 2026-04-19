import { redirect } from "next/navigation";

import { DashboardShell } from "@/components/shell/dashboard-shell";
import { getAccountProfileForUser } from "@/features/account/queries";
import { resolveUserAvatarSrc } from "@/features/account/utils";
import { getThemePreferenceForUser } from "@/features/theme/queries";
import { getWorkspaceBillingOverview } from "@/features/billing/queries";
import { getBusinessNotificationBellView } from "@/features/notifications/queries";
import { workspacesHubPath } from "@/features/workspaces/routes";
import { requireSession } from "@/lib/auth/session";
import {
  getBusinessContextForMembershipSlug,
  getBusinessMembershipsForUser,
} from "@/lib/db/business-access";

export const unstable_instant = false;

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
    redirect(workspacesHubPath);
  }

  const [themePreference, businessMemberships, profile] = await Promise.all([
    getThemePreferenceForUser(session.user.id),
    getBusinessMembershipsForUser(session.user.id),
    getAccountProfileForUser(session.user.id),
  ]);
  const notificationView = await getBusinessNotificationBellView({
    businessId: businessContext.business.id,
    businessSlug: businessContext.business.slug,
    userId: session.user.id,
  });
  const workspaceBilling = await getWorkspaceBillingOverview(
    businessContext.business.workspaceId,
  );
  const avatarSrc = resolveUserAvatarSrc({
    avatarStoragePath: profile?.avatarStoragePath,
    profileUpdatedAt: profile?.updatedAt,
    oauthImage: session.user.image ?? null,
  });

  return (
    <DashboardShell
      themePreference={themePreference}
      user={{
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        avatarSrc,
      }}
      businessContext={businessContext}
      businessMemberships={businessMemberships}
      notificationView={notificationView}
      workspaceBilling={
        workspaceBilling
          ? {
              workspaceId: workspaceBilling.workspaceId,
              workspaceSlug: workspaceBilling.workspaceSlug,
              currentPlan: workspaceBilling.currentPlan,
              region: workspaceBilling.region,
              defaultCurrency: workspaceBilling.defaultCurrency,
            }
          : null
      }
    >
      {children}
    </DashboardShell>
  );
}
