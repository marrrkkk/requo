import { Suspense } from "react";

import { DashboardSettingsSkeleton } from "@/components/shell/dashboard-settings-skeleton";
import { DashboardPage } from "@/components/shared/dashboard-layout";
import { Skeleton } from "@/components/ui/skeleton";
import { BusinessSettingsNav } from "@/features/settings/components/business-settings-nav";
import { getBusinessSettingsNavigation, getWorkspaceSettingsNavigation } from "@/features/settings/navigation";
import { getBusinessSettingsPageContext } from "./_lib/page-context";

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
      <div className="flex min-w-0 flex-col gap-6 sm:flex-row sm:gap-8 lg:gap-10">
        <BusinessSettingsNav groups={navigationGroups} />
        <div className="min-w-0 flex-1">
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
      <div className="flex min-w-0 flex-col gap-6 sm:flex-row sm:gap-8 lg:gap-10">
        {/* Sidebar skeleton */}
        <div className="hidden shrink-0 sm:block sm:w-48 lg:w-52">
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-1">
              <Skeleton className="mx-3 mb-1 h-3 w-16 rounded-md" />
              <Skeleton className="h-9 w-full rounded-lg" />
              <Skeleton className="h-9 w-full rounded-lg" />
            </div>
            <div className="flex flex-col gap-1">
              <Skeleton className="mx-3 mb-1 h-3 w-20 rounded-md" />
              <Skeleton className="h-9 w-full rounded-lg" />
            </div>
            <div className="flex flex-col gap-1">
              <Skeleton className="mx-3 mb-1 h-3 w-14 rounded-md" />
              <Skeleton className="h-9 w-full rounded-lg" />
              <Skeleton className="h-9 w-full rounded-lg" />
              <Skeleton className="h-9 w-full rounded-lg" />
            </div>
          </div>
        </div>
        {/* Mobile skeleton */}
        <div className="sm:hidden">
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-6 pb-24 sm:gap-7 xl:pb-28">
            <DashboardSettingsSkeleton />
          </div>
        </div>
      </div>
    </DashboardPage>
  );
}
