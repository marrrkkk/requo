import type { FollowUpSummaryCounts } from "@/features/follow-ups/types";

type FollowUpSummaryStripProps = {
  counts: FollowUpSummaryCounts;
};

/**
 * Compact outcome-oriented summary above the queue. Answers "what needs me
 * today?" and connects follow-ups to quote outcomes rather than task counts.
 */
export function FollowUpSummaryStrip({ counts }: FollowUpSummaryStripProps) {
  const items = [
    {
      label: "Needs attention now",
      value: counts.needsAttention,
      hint: "Overdue quote follow-ups",
    },
    {
      label: "Due today",
      value: counts.dueToday,
      hint: "Your next customer conversations",
    },
    {
      label: "Waiting",
      value: counts.waiting,
      hint:
        counts.activeSequences > 0
          ? `Upcoming + ${counts.activeSequences} active auto sequence${counts.activeSequences === 1 ? "" : "s"}`
          : "Upcoming follow-ups",
    },
    {
      label: "History",
      value: counts.history,
      hint: "Contacted & dismissed",
    },
  ];

  return (
    <section
      aria-label="Follow-up summary"
      className="grid grid-cols-2 gap-3 lg:grid-cols-4"
    >
      {items.map((item) => (
        <div
          key={item.label}
          className="section-panel flex flex-col gap-1 px-4 py-3"
          data-padding="none"
        >
          <span className="meta-label">{item.label}</span>
          <span className="text-2xl font-semibold tracking-tight text-foreground tabular-nums">
            {item.value}
          </span>
          <span className="text-xs text-muted-foreground">{item.hint}</span>
        </div>
      ))}
    </section>
  );
}
