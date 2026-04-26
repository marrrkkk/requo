import Link from "next/link";
import { ArrowRight, BellRing } from "lucide-react";

import {
  DashboardEmptyState,
  DashboardSection,
} from "@/components/shared/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FollowUpItem } from "@/features/follow-ups/components/follow-up-item";
import type { FollowUpOverviewData, FollowUpView } from "@/features/follow-ups/types";
import { getBusinessFollowUpsPath } from "@/features/businesses/routes";

type FollowUpDashboardSectionProps = {
  businessSlug: string;
  overviewPromise: Promise<FollowUpOverviewData>;
};

export async function FollowUpDashboardSection({
  businessSlug,
  overviewPromise,
}: FollowUpDashboardSectionProps) {
  const overview = await overviewPromise;
  const hasFollowUps =
    overview.overdue.length || overview.dueToday.length || overview.upcoming.length;
  const totalPending =
    overview.counts.overdue + overview.counts.dueToday + overview.counts.upcoming;

  return (
    <DashboardSection
      action={
        <Button asChild size="sm" variant="ghost">
          <Link href={getBusinessFollowUpsPath(businessSlug)} prefetch={true}>
            View all
            <ArrowRight data-icon="inline-end" />
          </Link>
        </Button>
      }
      contentClassName="flex flex-col gap-5"
      description="Overdue and due-today reminders for inquiries and quotes."
      title={`Follow-ups${totalPending ? ` (${totalPending})` : ""}`}
    >
      {hasFollowUps ? (
        <div className="grid gap-5 xl:grid-cols-3">
          <FollowUpDashboardGroup
            businessSlug={businessSlug}
            count={overview.counts.overdue}
            emptyTitle="No overdue follow-ups"
            items={overview.overdue}
            title="Overdue"
          />
          <FollowUpDashboardGroup
            businessSlug={businessSlug}
            count={overview.counts.dueToday}
            emptyTitle="No follow-ups due today"
            items={overview.dueToday}
            title="Due today"
          />
          <FollowUpDashboardGroup
            businessSlug={businessSlug}
            count={overview.counts.upcoming}
            emptyTitle="No upcoming follow-ups"
            items={overview.upcoming}
            title="Upcoming"
          />
        </div>
      ) : (
        <DashboardEmptyState
          action={
            <Button asChild variant="outline">
              <Link href={getBusinessFollowUpsPath(businessSlug)} prefetch={true}>
                Open follow-ups
              </Link>
            </Button>
          }
          description="You're all caught up. Follow-ups help you remember which inquiries or quotes need attention next."
          icon={BellRing}
          title="No follow-ups"
          variant="section"
        />
      )}
    </DashboardSection>
  );
}

function FollowUpDashboardGroup({
  businessSlug,
  count,
  emptyTitle,
  items,
  title,
}: {
  businessSlug: string;
  count: number;
  emptyTitle: string;
  items: FollowUpView[];
  title: string;
}) {
  return (
    <section className="flex min-h-[18rem] flex-col rounded-xl border border-border/70 bg-muted/25">
      <div className="flex items-center justify-between gap-3 border-b border-border/70 px-4 py-3">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <span className="text-xs font-medium text-muted-foreground">
          {count}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-3">
        {items.length ? (
          items.map((followUp) => (
            <FollowUpItem
              businessSlug={businessSlug}
              compact
              followUp={followUp}
              key={followUp.id}
              showMessage={false}
            />
          ))
        ) : (
          <DashboardEmptyState
            className="h-full px-4 py-10"
            description={emptyTitle === "No follow-ups due today" ? "No follow-ups due today." : "Nothing needs action in this group."}
            title={emptyTitle}
            variant="flat"
          />
        )}
      </div>
    </section>
  );
}

export function FollowUpDashboardSectionFallback() {
  return (
    <DashboardSection
      action={<Skeleton className="h-9 w-20 rounded-lg" />}
      description={<Skeleton className="h-4 w-full max-w-md rounded-md" />}
      title="Follow-ups"
    >
      <div className="grid gap-5 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            className="flex min-h-[18rem] flex-col rounded-xl border border-border/70 bg-muted/25"
            key={index}
          >
            <div className="flex items-center justify-between gap-3 border-b border-border/70 px-4 py-3">
              <Skeleton className="h-4 w-24 rounded-md" />
              <Skeleton className="h-4 w-6 rounded-md" />
            </div>
            <div className="flex flex-col gap-3 p-3">
              {Array.from({ length: 2 }).map((_, itemIndex) => (
                <div
                  className="soft-panel flex flex-col gap-3 px-4 py-4 shadow-none"
                  key={itemIndex}
                >
                  <Skeleton className="h-4 w-36 rounded-md" />
                  <Skeleton className="h-4 w-full rounded-md" />
                  <Skeleton className="h-8 w-28 rounded-lg" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </DashboardSection>
  );
}
