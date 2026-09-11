import Link from "next/link";

import { getBusinessFollowUpsPath } from "@/features/businesses/routes";
import { cn } from "@/lib/utils";

export type FollowUpWorkspaceView = "todo" | "upcoming" | "history";

type FollowUpViewTabsProps = {
  businessSlug: string;
  activeView: FollowUpWorkspaceView;
  historyCount?: number;
};

/**
 * Top-level workspace navigation: active work stays on the board ("To do"),
 * while "Upcoming" and "History" link into the filterable list view.
 * History is a first-class view, not a low-emphasis bottom link.
 */
export function FollowUpViewTabs({
  businessSlug,
  activeView,
  historyCount,
}: FollowUpViewTabsProps) {
  const basePath = getBusinessFollowUpsPath(businessSlug);
  const tabs = [
    {
      key: "todo" as const,
      label: "To do",
      href: basePath,
    },
    {
      key: "upcoming" as const,
      label: "Upcoming",
      href: `${basePath}?status=all&due=upcoming`,
    },
    {
      key: "history" as const,
      label:
        typeof historyCount === "number" ? `History (${historyCount})` : "History",
      href: `${basePath}?status=all`,
    },
  ];

  return (
    <nav aria-label="Follow-up views">
      <div className="inline-flex w-fit items-center justify-center gap-0.5 rounded-lg border border-border/80 bg-[var(--table-header-bg)] p-1 text-muted-foreground">
        {tabs.map((tab) => {
          const isActive = tab.key === activeView;

          return (
            <Link
              key={tab.key}
              href={tab.href}
              prefetch={true}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "inline-flex min-h-0 shrink-0 items-center justify-center gap-2 rounded-md border border-transparent px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-all hover:text-foreground focus-visible:border-ring focus-visible:outline-1 focus-visible:outline-ring",
                isActive &&
                  "border-border/80 bg-[var(--control-bg)] text-foreground shadow-[var(--control-shadow)]",
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
