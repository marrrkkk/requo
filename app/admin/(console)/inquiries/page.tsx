import type { Metadata } from "next";
import { Suspense } from "react";

import { DashboardPage } from "@/components/shared/dashboard-layout";
import { PageHeader } from "@/components/shared/page-header";
import {
  AdminListContentFallback,
  AdminListControlsFallback,
  AdminInquiriesListContentSection,
  AdminInquiriesListControlsSection,
} from "@/features/admin/components/product/inquiries/admin-inquiries-list-sections";
import { withAdminViewLog } from "@/features/admin/page-shell";
import { createNoIndexMetadata } from "@/lib/seo/site";

export const instant = true;

export const metadata: Metadata = createNoIndexMetadata({
  absoluteTitle: "Inquiries - Requo admin",
  description: "Inbound customer requests across every business.",
});

type SearchParamsRecord = Record<string, string | string[] | undefined>;

type AdminInquiriesPageProps = {
  searchParams: Promise<SearchParamsRecord>;
};

export default function AdminInquiriesPage({
  searchParams,
}: AdminInquiriesPageProps) {
  return (
    <Suspense fallback={<AdminInquiriesListFallback />}>
      <AdminInquiriesPageContent searchParams={searchParams} />
    </Suspense>
  );
}

function AdminInquiriesListFallback() {
  return (
    <DashboardPage>
      <PageHeader
        description="Inbound customer requests across every business."
        eyebrow="Admin"
        title="Inquiries"
      />
      <div className="dashboard-table-shell" data-list-card>
        <AdminListControlsFallback />
        <AdminListContentFallback />
      </div>
    </DashboardPage>
  );
}

async function AdminInquiriesPageContent({
  searchParams,
}: AdminInquiriesPageProps) {
  const rawParams = await searchParams;

  return withAdminViewLog(
    { action: "view.inquiries", targetType: "inquiry" },
    () => (
      <DashboardPage>
        <PageHeader
          description="Inbound customer requests across every business."
          eyebrow="Admin"
          title="Inquiries"
        />
        <div className="dashboard-table-shell" data-list-card>
          <Suspense fallback={<AdminListControlsFallback />}>
            <AdminInquiriesListControlsSection rawParams={rawParams} />
          </Suspense>
          <Suspense fallback={<AdminListContentFallback />}>
            <AdminInquiriesListContentSection rawParams={rawParams} />
          </Suspense>
        </div>
      </DashboardPage>
    ),
  );
}
