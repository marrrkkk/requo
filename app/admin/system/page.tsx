import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { DashboardPage } from "@/components/shared/dashboard-layout";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { AdminSectionsFallback } from "@/features/admin/components/admin-sections-fallback";
import { AdminSystemPage } from "@/features/admin/components/system/admin-system-page";
import { AdminHealthRefresh } from "@/features/admin/components/system/admin-health-refresh";
import { ADMIN_AUDIT_LOGS_PATH } from "@/features/admin/navigation";
import { withAdminViewLog } from "@/features/admin/page-shell";
import { createNoIndexMetadata } from "@/lib/seo/site";

export const instant = true;

export const metadata: Metadata = createNoIndexMetadata({
  absoluteTitle: "System - Requo admin",
  description: "System health, admin access, and configuration.",
});

/**
 * Admin system page — non-blocking structural shell.
 *
 * The shell, `PageHeader`, and its static actions return synchronously so
 * the header paints instantly on sibling navigations. The health report,
 * config matrix, and account/activity sections stream in behind a single
 * Suspense boundary; the view audit row is written from that region.
 */
export default function AdminSystemRoutePage() {
  return (
    <DashboardPage>
      <PageHeader
        title="System"
        description="System health, admin access, and configuration."
        actions={
          <>
            <AdminHealthRefresh />
            <Button asChild size="sm" variant="outline">
              <Link href={ADMIN_AUDIT_LOGS_PATH} prefetch={true}>
                View audit log
              </Link>
            </Button>
          </>
        }
      />
      <Suspense fallback={<AdminSectionsFallback />}>
        <AdminSystemRegion />
      </Suspense>
    </DashboardPage>
  );
}

async function AdminSystemRegion() {
  return withAdminViewLog(
    { action: "view.system", targetType: "system" },
    () => <AdminSystemPage />,
  );
}
