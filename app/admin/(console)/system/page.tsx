import type { Metadata } from "next";
import { Suspense } from "react";

import { requireAdminUser } from "@/features/admin/access";
import { wrapAdminRouteWithViewLog } from "@/features/admin/audit";
import { AdminSystemPage } from "@/features/admin/components/system/admin-system-page";
import { createNoIndexMetadata } from "@/lib/seo/site";

import { AdminSystemLoading } from "@/features/admin/components/system/admin-system-loading";

export const unstable_instant = false;

export const metadata: Metadata = createNoIndexMetadata({
  absoluteTitle: "System - Requo admin",
  description: "Integration health and environment configuration.",
});

export default function AdminSystemRoutePage() {
  return (
    <Suspense fallback={<AdminSystemLoading />}>
      <AdminSystemRouteContent />
    </Suspense>
  );
}

async function AdminSystemRouteContent() {
  const { session, user: admin } = await requireAdminUser();

  const renderPage = wrapAdminRouteWithViewLog(
    async () => <AdminSystemPage />,
    {
      adminUserId: admin.id,
      adminEmail: admin.email,
      impersonatedUserId: session.session?.impersonatedBy
        ? session.user.id
        : null,
    },
    {
      action: "view.system",
      targetType: "dashboard",
    },
  );

  return renderPage();
}
