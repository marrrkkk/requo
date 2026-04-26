import Link from "next/link";
import { BellRing } from "lucide-react";

import { DataListPagination } from "@/components/shared/data-list-pagination";
import {
  DashboardEmptyState,
  DashboardSection,
} from "@/components/shared/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FollowUpItem } from "@/features/follow-ups/components/follow-up-item";
import { FollowUpListFilters } from "@/features/follow-ups/components/follow-up-list-filters";
import type { FollowUpListFilters as FollowUpListFiltersValue, FollowUpView } from "@/features/follow-ups/types";
import { getBusinessFollowUpsPath } from "@/features/businesses/routes";

type SearchParamsRecord = Record<string, string | string[] | undefined>;

type FollowUpListControlsSectionProps = {
  filters: FollowUpListFiltersValue;
  totalItemsPromise: Promise<number>;
};

export async function FollowUpListControlsSection({
  filters,
  totalItemsPromise,
}: FollowUpListControlsSectionProps) {
  const totalItems = await totalItemsPromise;

  return <FollowUpListFilters filters={filters} resultCount={totalItems} />;
}

type FollowUpListContentSectionProps = {
  businessSlug: string;
  clearFiltersPath: string;
  filters: FollowUpListFiltersValue;
  followUpsPromise: Promise<FollowUpView[]>;
  hasFilters: boolean;
  searchParams: SearchParamsRecord;
  totalItemsPromise: Promise<number>;
  totalPages: number;
  currentPage: number;
};

export async function FollowUpListContentSection({
  businessSlug,
  clearFiltersPath,
  filters,
  followUpsPromise,
  hasFilters,
  searchParams,
  totalItemsPromise,
  totalPages,
  currentPage,
}: FollowUpListContentSectionProps) {
  const [followUps, totalItems] = await Promise.all([
    followUpsPromise,
    totalItemsPromise,
  ]);

  if (!totalItems) {
    return (
      <DashboardEmptyState
        action={
          hasFilters ? (
            <Button asChild variant="outline">
              <Link href={clearFiltersPath} prefetch={true}>
                Clear filters
              </Link>
            </Button>
          ) : (
            <Button asChild variant="outline">
              <Link href={getBusinessFollowUpsPath(businessSlug)} prefetch={true}>
                View pending follow-ups
              </Link>
            </Button>
          )
        }
        description={
          hasFilters
            ? "Try another search, status, or due date."
            : filters.status === "pending"
              ? "You're all caught up. Follow-ups help you remember which inquiries or quotes need attention next."
              : "Completed and skipped follow-ups will show here as you use the workflow."
        }
        icon={BellRing}
        title={
          hasFilters
            ? "No follow-ups match these filters."
            : filters.due === "today"
              ? "No follow-ups due today."
              : "No follow-ups"
        }
        variant="list"
      />
    );
  }

  return (
    <DashboardSection contentClassName="flex flex-col gap-4" title="Follow-ups">
      <div className="flex flex-col gap-3">
        {followUps.map((followUp) => (
          <FollowUpItem
            businessSlug={businessSlug}
            followUp={followUp}
            key={followUp.id}
          />
        ))}
      </div>
      <DataListPagination
        currentPage={currentPage}
        pathname={getBusinessFollowUpsPath(businessSlug)}
        searchParams={searchParams}
        totalItems={totalItems}
        totalPages={totalPages}
      />
    </DashboardSection>
  );
}

export function FollowUpListControlsFallback() {
  return (
    <div className="toolbar-panel">
      <div className="flex flex-col gap-4">
        <div className="data-list-toolbar-summary">
          <Skeleton className="h-4 w-full max-w-sm rounded-md" />
          <Skeleton className="h-7 w-28 rounded-full" />
        </div>
        <div className="data-list-toolbar-grid">
          <Skeleton className="h-10 w-full rounded-xl" />
          <Skeleton className="h-10 w-full rounded-xl" />
          <Skeleton className="h-10 w-full rounded-xl" />
          <Skeleton className="h-10 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}

export function FollowUpListContentFallback() {
  return (
    <DashboardSection title="Follow-ups">
      <div className="flex flex-col gap-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            className="soft-panel flex flex-col gap-3 px-4 py-4 shadow-none"
            key={index}
          >
            <Skeleton className="h-4 w-40 rounded-md" />
            <Skeleton className="h-4 w-full rounded-md" />
            <Skeleton className="h-4 w-64 rounded-md" />
            <Skeleton className="h-9 w-32 rounded-lg" />
          </div>
        ))}
      </div>
    </DashboardSection>
  );
}
