import type { Metadata } from "next";
import { Suspense } from "react";

import { DashboardPage } from "@/components/shared/dashboard-layout";
import { PageHeader } from "@/components/shared/page-header";
import { AdminSettingsPage } from "@/features/admin/components/system/admin-settings-page";
import { withAdminViewLog } from "@/features/admin/page-shell";
import { createNoIndexMetadata } from "@/lib/seo/site";

import AdminLoading from "../loading";

export const instant = true;

export const metadata: Metadata = createNoIndexMetadata({
  absoluteTitle: "Settings - Requo admin",
  description: "Admin access, health checks, and configuration.",
});

export default function AdminSettingsRoutePage() {
  return (
    <Suspense fallback={<AdminLoading />}>
      <AdminSettingsPageContent />
    </Suspense>
  );
}

async function AdminSettingsPageContent() {
  return withAdminViewLog(
    { action: "view.settings", targetType: "settings" },
    () => (
      <DashboardPage>
        <PageHeader
          eyebrow="Admin"
          title="Settings"
          description="Admin access, health checks, and configuration."
        />
        <AdminSettingsPage />
      </DashboardPage>
    ),
  );
}
