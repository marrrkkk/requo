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
import {
  getInquiryListForWorkspace,
  getWorkspaceInquiryFormOptionsForWorkspace,
} from "@/features/inquiries/queries";
import { getWorkspacePublicInquiryUrl } from "@/features/settings/utils";
import { getWorkspaceInquiriesPath } from "@/features/workspaces/routes";
import { requireCurrentWorkspaceContext } from "@/lib/db/workspace-access";

type InquiriesPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function InquiriesPage({
  searchParams,
}: InquiriesPageProps) {
  const [{ workspaceContext }, resolvedSearchParams] = await Promise.all([
    requireCurrentWorkspaceContext(),
    searchParams,
  ]);
  const parsedFilters = inquiryListFiltersSchema.safeParse(resolvedSearchParams);
  const filters = parsedFilters.success
    ? parsedFilters.data
    : {
        q: undefined,
        status: "all" as const,
        form: "all",
      };

  const [inquiryList, inquiryFormOptions] = await Promise.all([
    getInquiryListForWorkspace({
      workspaceId: workspaceContext.workspace.id,
      filters,
    }),
    getWorkspaceInquiryFormOptionsForWorkspace(workspaceContext.workspace.id),
  ]);
  const workspaceSlug = workspaceContext.workspace.slug;
  const hasFilters = Boolean(
    filters.q || filters.status !== "all" || filters.form !== "all",
  );
  const publicInquiryUrl = getWorkspacePublicInquiryUrl(workspaceSlug);

  return (
    <DashboardPage>
      <PageHeader
        eyebrow="Requests"
        title="Customer requests"
        actions={
          <Button asChild variant="outline">
            <Link href={publicInquiryUrl} prefetch={false}>
              Open public page
              <ArrowRight data-icon="inline-end" />
            </Link>
          </Button>
        }
      />

      <InquiryListToolbar
        key={`${filters.status}:${filters.form}:${filters.q ?? ""}`}
        filters={filters}
        formOptions={[
          {
            value: "all",
            label: "All forms",
          },
          ...inquiryFormOptions.map((form) => ({
            value: form.slug,
            label: form.isDefault ? `${form.name} (Default)` : form.name,
          })),
        ]}
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
                <Link href={getWorkspaceInquiriesPath(workspaceSlug)} prefetch={true}>Clear filters</Link>
              </Button>
            ) : (
              <Button asChild>
                <Link
                  href={publicInquiryUrl}
                  prefetch={false}
                >
                  Preview public inquiry page
                </Link>
              </Button>
            )
          }
          description={
            hasFilters
              ? "Try another search or status."
              : "Requests show up here."
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
