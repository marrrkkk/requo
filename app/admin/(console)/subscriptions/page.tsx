import type { Metadata } from "next";
import { Suspense } from "react";

import { DashboardPage } from "@/components/shared/dashboard-layout";
import { PageHeader } from "@/components/shared/page-header";
import { requireAdminUser } from "@/features/admin/access";
import { wrapAdminRouteWithViewLog } from "@/features/admin/audit";
import {
  AdminListContentFallback,
  AdminListControlsFallback,
  AdminSubscriptionsListContentSection,
  AdminSubscriptionsListControlsSection,
} from "@/features/admin/components/admin-subscriptions-list-sections";
import { createNoIndexMetadata } from "@/lib/seo/site";

export const unstable_instant = false;

export const metadata: Metadata = createNoIndexMetadata({
  absoluteTitle: "Subscriptions - Requo admin",
  description: "Inspect account subscriptions and billing state.",
});

type SearchParamsRecord = Record<string, string | string[] | undefined>;

type AdminSubscriptionsPageProps = {
  searchParams: Promise<SearchParamsRecord>;
};

export default function AdminSubscriptionsPage({
  searchParams,
}: AdminSubscriptionsPageProps) {
  return (
    <Suspense
      fallback={
        <DashboardPage>
          <PageHeader
            description="Inspect account subscriptions and billing state."
            eyebrow="Admin"
            title="Subscriptions"
          />
          <AdminListControlsFallback />
          <AdminListContentFallback />
        </DashboardPage>
      }
    >
      <AdminSubscriptionsPageContent searchParams={searchParams} />
    </Suspense>
  );
}

async function AdminSubscriptionsPageContent({
  searchParams,
}: AdminSubscriptionsPageProps) {
  const { session, user: admin } = await requireAdminUser();
  const rawParams = await searchParams;

  const renderPage = wrapAdminRouteWithViewLog(
    async () => (
      <DashboardPage>
        <PageHeader
          description="Inspect account subscriptions and billing state."
          eyebrow="Admin"
          title="Subscriptions"
        />
        <Suspense fallback={<AdminListControlsFallback />}>
          <AdminSubscriptionsListControlsSection rawParams={rawParams} />
        </Suspense>
        <Suspense fallback={<AdminListContentFallback />}>
          <AdminSubscriptionsListContentSection rawParams={rawParams} />
        </Suspense>
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
      action: "view.subscriptions",
      targetType: "dashboard",
    },
  );

  return renderPage();
}
