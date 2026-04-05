import { redirect } from "next/navigation";

import { DashboardShell } from "@/components/shell/dashboard-shell";
import { getThemePreferenceForUser } from "@/features/theme/queries";
import { getBusinessNotificationBellView } from "@/features/notifications/queries";
import { businessesHubPath } from "@/features/businesses/routes";
import { requireSession } from "@/lib/auth/session";
import {
  getBusinessContextForMembershipSlug,
  getBusinessMembershipsForUser,
} from "@/lib/db/business-access";

export const unstable_instant = false;

export default async function BusinessDashboardLayout({
  children,
  params,
}: LayoutProps<"/businesses/[slug]/dashboard">) {
  const [session, { slug }] = await Promise.all([requireSession(), params]);
  const [themePreference, businessContext, businessMemberships] = await Promise.all([
    getThemePreferenceForUser(session.user.id),
    getBusinessContextForMembershipSlug(session.user.id, slug),
    getBusinessMembershipsForUser(session.user.id),
  ]);

  if (!businessContext) {
    redirect(businessesHubPath);
  }

  const notificationView = await getBusinessNotificationBellView({
    businessId: businessContext.business.id,
    businessSlug: businessContext.business.slug,
    userId: session.user.id,
  });

  return (
    <DashboardShell
      themePreference={themePreference}
      user={session.user}
      businessContext={businessContext}
      businessMemberships={businessMemberships}
      notificationView={notificationView}
    >
      {children}
    </DashboardShell>
  );
}
