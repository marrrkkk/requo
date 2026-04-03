import Link from "next/link";
import { ArrowRight, Inbox } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { InquiryListCards } from "@/features/inquiries/components/inquiry-list-cards";
import { InquiryListFilters as InquiryListToolbar } from "@/features/inquiries/components/inquiry-list-filters";
import { InquiryListTable } from "@/features/inquiries/components/inquiry-list-table";
import { inquiryListFiltersSchema } from "@/features/inquiries/schemas";
import { getInquiryListForWorkspace } from "@/features/inquiries/queries";
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
  const hasFilters = Boolean(filters.q || filters.status !== "all");

  return (
    <div className="dashboard-page">
      <PageHeader
        eyebrow="Inquiry inbox"
        title="Customer requests"
        description="Search, filter, and open each inquiry."
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
          <InquiryListTable inquiries={inquiryList} />
          <InquiryListCards inquiries={inquiryList} />
        </>
      ) : (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Inbox />
            </EmptyMedia>
            <EmptyTitle>
              {hasFilters
                ? "No inquiries match these filters."
                : "Your inquiry inbox is still empty."}
            </EmptyTitle>
            <EmptyDescription>
              {hasFilters
                ? "Try a different search or status."
                : "New submissions will appear here."}
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            {hasFilters ? (
              <Button asChild variant="outline">
                <Link href="/dashboard/inquiries">Clear filters</Link>
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
            )}
          </EmptyContent>
        </Empty>
      )}
    </div>
  );
}
