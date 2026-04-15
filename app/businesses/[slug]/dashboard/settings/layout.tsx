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
        <div className="min-w-0 w-full">{children}</div>
      </div>
    </DashboardPage>
  );
}
