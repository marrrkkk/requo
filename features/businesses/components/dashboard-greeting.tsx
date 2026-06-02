import type { BusinessOverviewCounts } from "@/features/businesses/types";
import type { FollowUpOverviewData } from "@/features/follow-ups/types";
import type { BusinessDashboardSummaryData } from "@/features/businesses/types";

type DashboardGreetingProps = {
  userName: string;
  counts: BusinessOverviewCounts;
  followUpCounts: FollowUpOverviewData["counts"];
  summary?: BusinessDashboardSummaryData | null;
};

export function DashboardGreeting({
  userName,
  counts,
  followUpCounts,
}: DashboardGreetingProps) {
  const firstName = userName.split(" ")[0] || userName;
  const greeting = getTimeOfDayGreeting();

  const urgentCount =
    counts.overdueInquiries +
    counts.expiringSoonQuotes +
    followUpCounts.overdue;

  const newCount = counts.newInquiries + followUpCounts.dueToday;

  let statusLine: string;

  if (urgentCount === 0 && newCount === 0) {
    statusLine = "You're all caught up — no urgent items right now.";
  } else if (urgentCount > 0 && newCount > 0) {
    statusLine = `${urgentCount} urgent ${urgentCount === 1 ? "item" : "items"} and ${newCount} new ${newCount === 1 ? "item" : "items"} since your last visit.`;
  } else if (urgentCount > 0) {
    statusLine = `${urgentCount} urgent ${urgentCount === 1 ? "item needs" : "items need"} attention.`;
  } else {
    statusLine = `${newCount} new ${newCount === 1 ? "item" : "items"} since your last visit.`;
  }

  return (
    <div className="flex flex-col gap-1">
      <h1 className="font-heading text-[1.5rem] font-semibold tracking-tight text-foreground sm:text-[1.75rem]">
        {greeting}, {firstName}
      </h1>
      <p className="text-sm text-muted-foreground">{statusLine}</p>
    </div>
  );
}

function getTimeOfDayGreeting(): string {
  const hour = new Date().getHours();

  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}
