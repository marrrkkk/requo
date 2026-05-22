import { DashboardSettingsSkeleton } from "@/components/shell/dashboard-settings-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Loading skeleton for the business audit log settings page.
 *
 * Mirrors the page composition: a `PageHeader`-shaped block followed
 * by the shared dashboard settings skeleton used in the page's
 * Suspense fallback.
 */
export default function BusinessAuditLogSettingsLoading() {
  return (
    <div className="flex flex-col gap-6 lg:gap-8">
      <div className="flex flex-col gap-3">
        <Skeleton className="h-8 w-48 rounded-lg" />
        <Skeleton className="h-4 w-full max-w-xl rounded-md" />
      </div>
      <DashboardSettingsSkeleton />
    </div>
  );
}
