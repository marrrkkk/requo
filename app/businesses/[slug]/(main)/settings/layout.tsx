import { DashboardPage } from "@/components/shared/dashboard-layout";
import { BusinessSettingsNav } from "@/features/settings/components/business-settings-nav";
import { getBusinessSettingsNavigation, getWorkspaceSettingsNavigation } from "@/features/settings/navigation";
import { getBusinessSettingsPageContext } from "./_lib/page-context";

export default async function BusinessSettingsLayout({
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
      <div className="grid min-w-0 items-start gap-4 lg:gap-5 xl:grid-cols-[16rem_minmax(0,1fr)] xl:gap-4">
        <BusinessSettingsNav groups={navigationGroups} />
        <div id="settings-content" className="min-w-0 w-full xl:max-h-[calc(100vh-10rem)] xl:overflow-y-auto xl:overscroll-y-contain xl:pr-1 hover-scrollbar">
          <div className="flex flex-col gap-6 sm:gap-7 pb-24 xl:pb-28">
            {children}
          </div>
        </div>
      </div>
    </DashboardPage>
  );
}
