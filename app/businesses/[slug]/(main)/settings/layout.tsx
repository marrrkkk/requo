import { Suspense } from "react";

import { DashboardSettingsSkeleton } from "@/components/shell/dashboard-settings-skeleton";
import { DashboardPage } from "@/components/shared/dashboard-layout";
import { Skeleton } from "@/components/ui/skeleton";
import { BusinessSettingsNav } from "@/features/settings/components/business-settings-nav";
import { getBusinessSettingsNavigation, getWorkspaceSettingsNavigation } from "@/features/settings/navigation";
import { getBusinessSettingsPageContext } from "./_lib/page-context";

export const unstable_instant = false;

export default function BusinessSettingsLayout({
  children,
  params,
}: { children: React.ReactNode; params: Promise<{ slug: string }> }) {
  return (
    <Suspense fallback={<BusinessSettingsLayoutFallback />}>
      <BusinessSettingsShell params={params}>{children}</BusinessSettingsShell>
    </Suspense>
  );
}

async function BusinessSettingsShell({
  children,
  params,
}: { children: React.ReactNode; params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { businessContext } = await getBusinessSettingsPageContext(slug);
  const businessSlug = businessContext.business.slug;
  const navigationGroups = [
    ...getBusinessSettingsNavigation(businessSlug, businessContext.role),
    ...getWorkspaceSettingsNavigation(
      businessSlug,
      businessContext.role,
    ),
  ];

  return (
    <DashboardPage>
      <div className="flex min-w-0 flex-col gap-6">
        <BusinessSettingsNav groups={navigationGroups} />
        <div className="min-w-0 w-full">
          <div className="flex flex-col gap-6 pb-24 sm:gap-7 xl:pb-28">
            {children}
          </div>
        </div>
      </div>
    </DashboardPage>
  );
}

function BusinessSettingsLayoutFallback() {
  return (
    <DashboardPage>
      <div className="flex min-w-0 flex-col gap-6">
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-9 w-28 rounded-md" />
          <Skeleton className="h-9 w-32 rounded-md" />
          <Skeleton className="h-9 w-24 rounded-md" />
        </div>
        <div className="min-w-0 w-full">
          <div className="flex flex-col gap-6 pb-24 sm:gap-7 xl:pb-28">
            <DashboardSettingsSkeleton />
          </div>
        </div>
      </div>
    </DashboardPage>
  );
}
