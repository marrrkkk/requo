import type { ReactNode } from "react";

import { DashboardPage } from "@/components/shared/dashboard-layout";
import { BusinessSettingsNav } from "@/features/settings/components/business-settings-nav";
import { getBusinessSettingsNavigation } from "@/features/settings/navigation";
import { getBusinessOwnerPageContext } from "./_lib/page-context";

type BusinessSettingsLayoutProps = {
  children: ReactNode;
};

export default async function BusinessSettingsLayout({
  children,
}: BusinessSettingsLayoutProps) {
  const { businessContext } = await getBusinessOwnerPageContext();
  const businessSlug = businessContext.business.slug;
  const navigationGroups = getBusinessSettingsNavigation(businessSlug);

  return (
    <DashboardPage>
      <div className="grid min-w-0 items-start gap-4 lg:gap-5 xl:grid-cols-[16rem_minmax(0,1fr)] xl:gap-4">
        <BusinessSettingsNav groups={navigationGroups} />
        <div className="min-w-0 w-full">{children}</div>
      </div>
    </DashboardPage>
  );
}
