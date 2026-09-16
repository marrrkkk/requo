import Link from "next/link";

import { DashboardPage } from "@/components/shared/dashboard-layout";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { AdminSectionsFallback } from "@/features/admin/components/admin-sections-fallback";
import {
  ADMIN_SYSTEM_PATH,
  ADMIN_USAGE_PATH,
} from "@/features/admin/navigation";

/**
 * Content-area loading state for the admin overview route.
 *
 * Mirrors the page shell exactly (header + section fallbacks). The console
 * layout already renders the persistent chrome (rail + topbar), so this
 * only stands in for the page body on cold loads — sibling navigations
 * paint the prefetched shell instead.
 */
export default function AdminLoading() {
  return (
    <DashboardPage>
      <PageHeader
        title="Overview"
        description="Platform health, pipelines, and recent activity."
        actions={
          <>
            <Button asChild size="sm" variant="outline">
              <Link href={ADMIN_USAGE_PATH} prefetch={true}>
                View usage
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href={ADMIN_SYSTEM_PATH} prefetch={true}>
                System details
              </Link>
            </Button>
          </>
        }
      />
      <AdminSectionsFallback />
    </DashboardPage>
  );
}
