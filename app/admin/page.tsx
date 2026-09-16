import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { DashboardPage } from "@/components/shared/dashboard-layout";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { AdminOverview } from "@/features/admin/components/overview/admin-overview";
import { AdminSectionsFallback } from "@/features/admin/components/admin-sections-fallback";
import {
  ADMIN_SYSTEM_PATH,
  ADMIN_USAGE_PATH,
} from "@/features/admin/navigation";
import { withAdminViewLog } from "@/features/admin/page-shell";
import { createNoIndexMetadata } from "@/lib/seo/site";

export const instant = true;

export const metadata: Metadata = createNoIndexMetadata({
  absoluteTitle: "Overview - Requo admin",
  description: "Platform health, pipelines, and recent activity.",
});

/**
 * Admin overview — non-blocking structural shell.
 *
 * Returns the `DashboardPage` shell and `PageHeader` synchronously so the
 * header paints instantly on sibling navigations. The aggregates stream
 * in behind a single Suspense boundary; the view audit row is written
 * from that region.
 */
export default function AdminOverviewPage() {
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
      <Suspense fallback={<AdminSectionsFallback />}>
        <AdminOverviewRegion />
      </Suspense>
    </DashboardPage>
  );
}

async function AdminOverviewRegion() {
  return withAdminViewLog(
    { action: "view.dashboard", targetType: "dashboard" },
    () => <AdminOverview />,
  );
}
