import Link from "next/link";
import { Suspense } from "react";
import { Search, ServerCrash } from "lucide-react";

import { DashboardPage } from "@/components/shared/dashboard-layout";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import {
  AdminOverviewDashboard,
  AdminOverviewFallback,
} from "@/features/admin/components/admin-overview";
import { requireAdminPage } from "@/features/admin/page-guard";

export default async function AdminOverviewPage() {
  await requireAdminPage();

  return (
    <DashboardPage>
      <PageHeader
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/admin/users" prefetch={true}>
                <Search data-icon="inline-start" />
                Find user
              </Link>
            </Button>
            <Button asChild>
              <Link href="/admin/system" prefetch={true}>
                <ServerCrash data-icon="inline-start" />
                System status
              </Link>
            </Button>
          </>
        }
        description="Start with operational queues that can block customers or billing, then scan workflow health and growth."
        title="Admin command center"
      />

      <Suspense fallback={<AdminOverviewFallback />}>
        <AdminOverviewDashboard />
      </Suspense>
    </DashboardPage>
  );
}
