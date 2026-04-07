import type { ReactNode } from "react";

import {
  DashboardDetailLayout,
  DashboardPage,
} from "@/components/shared/dashboard-layout";
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
  const navigationGroups = getBusinessSettingsNavigation(
    businessContext.business.slug,
  );

  return (
    <DashboardPage>
      <DashboardDetailLayout className="items-start xl:grid-cols-[17.5rem_minmax(0,1fr)] 2xl:grid-cols-[18.5rem_minmax(0,1fr)]">
        <BusinessSettingsNav groups={navigationGroups} />
        <div className="min-w-0">{children}</div>
      </DashboardDetailLayout>
    </DashboardPage>
  );
}
