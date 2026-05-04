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
