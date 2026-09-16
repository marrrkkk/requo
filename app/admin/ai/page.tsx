import type { Metadata } from "next";
import { Suspense } from "react";

import { DashboardPage } from "@/components/shared/dashboard-layout";
import { PageHeader } from "@/components/shared/page-header";
import { AdminAiOverview } from "@/features/admin/components/ai/admin-ai-overview";
import { AdminSectionsFallback } from "@/features/admin/components/admin-sections-fallback";
import { withAdminViewLog } from "@/features/admin/page-shell";
import { createNoIndexMetadata } from "@/lib/seo/site";

export const instant = true;

export const metadata: Metadata = createNoIndexMetadata({
  absoluteTitle: "AI overview - Requo admin",
  description: "Model usage, cost, and reliability at a glance.",
});

/**
 * Admin AI overview — non-blocking structural shell.
 *
 * Returns the `DashboardPage` shell and `PageHeader` synchronously so the
 * header paints instantly on sibling navigations. The overview aggregates
 * stream in behind a single Suspense boundary; the view audit row is
 * written from that region.
 */
export default function AdminAiPage() {
  return (
    <DashboardPage>
      <PageHeader
        title="AI overview"
        description="Model usage, cost, and reliability at a glance."
      />
      <Suspense fallback={<AdminSectionsFallback />}>
        <AdminAiRegion />
      </Suspense>
    </DashboardPage>
  );
}

async function AdminAiRegion() {
  return withAdminViewLog({ action: "view.ai", targetType: "dashboard" }, () => (
    <AdminAiOverview />
  ));
}
