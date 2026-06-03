import type { Metadata } from "next";
import { Suspense } from "react";

import { DashboardPage } from "@/components/shared/dashboard-layout";
import { PageHeader } from "@/components/shared/page-header";
import { requireAdminUser } from "@/features/admin/access";
import { wrapAdminRouteWithViewLog } from "@/features/admin/audit";
import { AdminDashboard } from "@/features/admin/components/admin-dashboard";
import { createNoIndexMetadata } from "@/lib/seo/site";

import AdminLoading from "./loading";

export const unstable_instant = {
  prefetch: "static",
  unstable_disableValidation: true,
};

export const metadata: Metadata = createNoIndexMetadata({
  absoluteTitle: "Admin - Requo",
  description: "Internal Requo admin dashboard with key operational counts.",
});

export default function AdminDashboardPage() {
  return (
    <Suspense fallback={<AdminLoading />}>
      <AdminDashboardPageContent />
    </Suspense>
  );
}

async function AdminDashboardPageContent() {
  const { session, user: admin } = await requireAdminUser();

  const renderPage = wrapAdminRouteWithViewLog(
    async () => (
      <DashboardPage>
        <PageHeader
          eyebrow="Admin"
          title="Dashboard"
          description="System status, platform metrics, and admin shortcuts."
        />
        <AdminDashboard />
      </DashboardPage>
    ),
    {
      adminUserId: admin.id,
      adminEmail: admin.email,
      impersonatedUserId: session.session?.impersonatedBy
        ? session.user.id
        : null,
    },
    {
      action: "view.dashboard",
      targetType: "dashboard",
    },
  );

  return renderPage();
}
