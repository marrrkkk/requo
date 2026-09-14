import type { Metadata } from "next";
import { Suspense } from "react";

import { DashboardPage } from "@/components/shared/dashboard-layout";
import { PageHeader } from "@/components/shared/page-header";
import { AdminAiOverview } from "@/features/admin/components/ai/admin-ai-overview";
import { withAdminViewLog } from "@/features/admin/page-shell";
import { createNoIndexMetadata } from "@/lib/seo/site";

import AdminLoading from "../loading";

export const instant = true;

export const metadata: Metadata = createNoIndexMetadata({
  absoluteTitle: "AI overview - Requo admin",
  description: "Model usage, cost, and reliability at a glance.",
});

export default function AdminAiPage() {
  return (
    <Suspense fallback={<AdminLoading />}>
      <AdminAiPageContent />
    </Suspense>
  );
}

async function AdminAiPageContent() {
  return withAdminViewLog(
    { action: "view.ai", targetType: "dashboard" },
    () => (
      <DashboardPage>
        <PageHeader
          eyebrow="Admin"
          title="AI overview"
          description="Model usage, cost, and reliability at a glance."
        />
        <AdminAiOverview />
      </DashboardPage>
    ),
  );
}
