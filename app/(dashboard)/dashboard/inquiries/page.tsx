import Link from "next/link";
import { ArrowRight, Inbox } from "lucide-react";

import {
  DashboardEmptyState,
  DashboardPage,
} from "@/components/shared/dashboard-layout";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { InquiryListCards } from "@/features/inquiries/components/inquiry-list-cards";
import { InquiryListFilters as InquiryListToolbar } from "@/features/inquiries/components/inquiry-list-filters";
import { InquiryListTable } from "@/features/inquiries/components/inquiry-list-table";
import { inquiryListFiltersSchema } from "@/features/inquiries/schemas";
import { getInquiryListForWorkspace } from "@/features/inquiries/queries";
import { getWorkspaceInquiriesPath } from "@/features/workspaces/routes";
import { requireCurrentWorkspaceContext } from "@/lib/db/workspace-access";

type InquiriesPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function InquiriesPage({
  searchParams,
}: InquiriesPageProps) {
  const { workspaceContext } = await requireCurrentWorkspaceContext();
  const parsedFilters = inquiryListFiltersSchema.safeParse(await searchParams);
  const filters = parsedFilters.success
    ? parsedFilters.data
    : {
        q: undefined,
        status: "all" as const,
      };

  const inquiryList = await getInquiryListForWorkspace({
    workspaceId: workspaceContext.workspace.id,
    filters,
  });
  const workspaceSlug = workspaceContext.workspace.slug;
  const hasFilters = Boolean(filters.q || filters.status !== "all");

  return (
    <DashboardPage>
      <PageHeader
        eyebrow="Requests"
        title="Customer requests"
        description="Search, filter, and open each request."
        actions={
          <Button asChild variant="outline">
            <Link href={`/inquire/${workspaceContext.workspace.slug}`} prefetch={false}>
              Open public page
              <ArrowRight data-icon="inline-end" />
            </Link>
          </Button>
        }
      />

      <InquiryListToolbar
        key={`${filters.status}:${filters.q ?? ""}`}
        filters={filters}
        resultCount={inquiryList.length}
      />

      {inquiryList.length ? (
        <>
          <InquiryListTable inquiries={inquiryList} workspaceSlug={workspaceSlug} />
          <InquiryListCards inquiries={inquiryList} workspaceSlug={workspaceSlug} />
        </>
      ) : (
        <DashboardEmptyState
          action={
            hasFilters ? (
              <Button asChild variant="outline">
                <Link href={getWorkspaceInquiriesPath(workspaceSlug)}>Clear filters</Link>
              </Button>
            ) : (
              <Button asChild>
                <Link
                  href={`/inquire/${workspaceContext.workspace.slug}`}
                  prefetch={false}
                >
                  Preview public inquiry page
                </Link>
              </Button>
            )
          }
          description={
            hasFilters
              ? "Try a different search or status."
              : "New customer requests will appear here."
          }
          icon={Inbox}
          title={
            hasFilters
              ? "No requests match these filters."
              : "Your request inbox is still empty."
          }
          variant="list"
        />
      )}
    </DashboardPage>
  );
}
