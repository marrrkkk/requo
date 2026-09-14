import type { Metadata } from "next";
import { Suspense } from "react";

import { DashboardPage } from "@/components/shared/dashboard-layout";
import { PageHeader } from "@/components/shared/page-header";
import { AdminOverview } from "@/features/admin/components/overview/admin-overview";
import { withAdminViewLog } from "@/features/admin/page-shell";
import { createNoIndexMetadata } from "@/lib/seo/site";

import AdminLoading from "./loading";

export const instant = true;

export const metadata: Metadata = createNoIndexMetadata({
  absoluteTitle: "Overview - Requo admin",
  description: "Platform health, pipelines, and recent activity.",
});

export default function AdminOverviewPage() {
  return (
    <Suspense fallback={<AdminLoading />}>
      <AdminOverviewPageContent />
    </Suspense>
  );
}

async function AdminOverviewPageContent() {
  return withAdminViewLog(
    { action: "view.dashboard", targetType: "dashboard" },
    () => (
      <DashboardPage>
        <PageHeader
          eyebrow="Admin"
          title="Overview"
          description="Platform health, pipelines, and recent activity."
        />
        <AdminOverview />
      </DashboardPage>
    ),
  );
}
