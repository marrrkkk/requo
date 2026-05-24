import Link from "next/link";
import { BellRing } from "lucide-react";

import { DataListPagination } from "@/components/shared/data-list-pagination";
import {
  DashboardEmptyState,
} from "@/components/shared/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  completeFollowUpAction,
  deleteFollowUpAction,
  editFollowUpAction,
  reassignFollowUpAction,
  rescheduleFollowUpAction,
  skipFollowUpAction,
} from "@/features/follow-ups/actions";
import { FollowUpItem } from "@/features/follow-ups/components/follow-up-item";
import type { TeamMemberOption } from "@/features/follow-ups/components/follow-up-reassign-dialog";
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
  businessName?: string;
  businessSlug: string;
  clearFiltersPath: string;
  filters: FollowUpListFiltersValue;
  followUpsPromise: Promise<FollowUpView[]>;
  hasFilters: boolean;
  members?: TeamMemberOption[];
  searchParams: SearchParamsRecord;
  totalItemsPromise: Promise<number>;
  totalPages: number;
  currentPage: number;
};

export async function FollowUpListContentSection({
  businessName,
  businessSlug,
  clearFiltersPath,
  filters,
  followUpsPromise,
  hasFilters,
  members = [],
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
    <>
      <div className="flex flex-col gap-2">
        {followUps.map((followUp) => (
          <FollowUpItem
            key={followUp.id}
            businessName={businessName}
            businessSlug={businessSlug}
            followUp={followUp}
            members={members}
            completeAction={completeFollowUpAction.bind(null, followUp.id)}
            skipAction={skipFollowUpAction.bind(null, followUp.id)}
            rescheduleAction={rescheduleFollowUpAction.bind(null, followUp.id)}
            editAction={editFollowUpAction.bind(null, followUp.id)}
            deleteAction={deleteFollowUpAction.bind(null, followUp.id)}
            reassignAction={reassignFollowUpAction.bind(null, followUp.id)}
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
    </>
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
    <div className="flex min-h-[320px] flex-col gap-2">
      {Array.from({ length: 5 }).map((_, index) => (
        <div
          className="flex items-center gap-3 rounded-xl border border-border/50 bg-background px-4 py-3 sm:px-5"
          key={index}
        >
          <Skeleton className="size-8 shrink-0 rounded-full" />
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <Skeleton className="h-3.5 w-32 rounded-md" />
            <Skeleton className="h-3 w-48 rounded-md" />
          </div>
          <Skeleton className="h-5 w-16 shrink-0 rounded-full" />
        </div>
      ))}
    </div>
  );
}
