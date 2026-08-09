import {
  ArrowRight,
  BarChart3,
  BellRing,
  CheckCircle2,
  ClipboardList,
  FileText,
  FormInput,
  Home as HomeIcon,
  Inbox,
  Receipt,
  Search,
  Send,
  Target,
  TrendingUp,
  Workflow,
  type LucideIcon,
} from "lucide-react";

import { RequoIcon } from "@/components/shared/requo-icon";
import { cn } from "@/lib/utils";

/**
 * Static, faithful recreation of the Requo dashboard home view used as the
 * marketing hero preview. Mirrors the real shell chrome (sidebar nav, topbar,
 * greeting), the 30-day velocity stat cards, and the priority queue list.
 *
 * No interactivity — it's a presentational mock rendered inside the device frame
 * on the landing hero so the preview matches the shipped product.
 *
 * Source of truth for layout:
 *   - app/(business)/[businessSlug]/(main)/home/page.tsx (regions + StatCard)
 *   - components/shell/dashboard-shell-frame.tsx + dashboard-navigation.tsx
 *   - features/businesses/components/{dashboard-greeting,needs-attention-tabs}.tsx
 */

type NavItem = { label: string; icon: LucideIcon; active?: boolean };

const navItems: readonly NavItem[] = [
  { label: "Home", icon: HomeIcon, active: true },
  { label: "Inquiries", icon: Inbox },
  { label: "Quotes", icon: FileText },
  { label: "Follow-ups", icon: BellRing },
  { label: "Jobs", icon: ClipboardList },
  { label: "Invoices", icon: Receipt },
  { label: "Forms", icon: FormInput },
  { label: "Automations", icon: Workflow },
  { label: "Analytics", icon: BarChart3 },
];

type StatCard = {
  label: string;
  value: string;
  suffix: string;
  highlight?: boolean;
  icon: LucideIcon;
};

const statCards: readonly StatCard[] = [
  { label: "Inquiries", value: "14", suffix: "received", icon: Inbox },
  { label: "Quotes sent", value: "8", suffix: "total", icon: Send },
  {
    label: "Acceptance",
    value: "38%",
    suffix: "win rate",
    highlight: false,
    icon: TrendingUp,
  },
  {
    label: "Coverage",
    value: "72%",
    suffix: "quoted",
    highlight: true,
    icon: Target,
  },
];

type QueueRow = {
  label: string;
  title: string;
  description: string;
  meta: string;
  actionLabel: string;
  urgent?: boolean;
  positive?: boolean;
  category: string;
  icon: LucideIcon;
  iconClass: string;
};

const queueRows: readonly QueueRow[] = [
  {
    label: "Overdue follow-up",
    title: "Kitchen remodel quote",
    description: "Sarah Jenkins · No response yet",
    meta: "Due 2 days ago",
    actionLabel: "Follow up now",
    urgent: true,
    category: "Follow-up",
    icon: BellRing,
    iconClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
  {
    label: "Quote expiring",
    title: "Bathroom renovation",
    description: "Leo Park",
    meta: "Expires tomorrow",
    actionLabel: "Follow up before expiry",
    urgent: true,
    category: "Quote",
    icon: FileText,
    iconClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
  {
    label: "Accepted",
    title: "Deck repair & staining",
    description: "Maya Fields",
    meta: "Accepted yesterday",
    actionLabel: "Create job or invoice",
    positive: true,
    category: "Quote",
    icon: CheckCircle2,
    iconClass: "bg-green-500/10 text-green-600 dark:text-green-400",
  },
  {
    label: "New inquiry",
    title: "Ana Cruz",
    description: "Countertop installation",
    meta: "Submitted 10:24 AM",
    actionLabel: "Create quote",
    category: "Inquiry",
    icon: Inbox,
    iconClass: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  },
];

export function MarketingDashboardPreview() {
  return (
    <div
      aria-hidden="true"
      className="flex h-full w-full bg-background text-left"
    >
      {/* Sidebar */}
      <aside className="hidden w-[180px] shrink-0 flex-col border-r border-sidebar-border bg-sidebar sm:flex">
        {/* Brand */}
        <div className="flex h-11 items-center gap-2 px-3.5">
          <RequoIcon className="size-5 text-primary" />
          <span className="font-brand text-[1.05rem] font-bold tracking-[-0.02em] text-foreground">
            Requo
          </span>
        </div>

        {/* Business switcher */}
        <div className="px-2.5 pb-2.5 pt-1">
          <div className="flex items-center gap-2 rounded-lg border border-sidebar-border/70 bg-sidebar-accent/50 px-2.5 py-2">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-primary/12 text-[0.6rem] font-bold text-primary">
              RC
            </span>
            <div className="min-w-0 flex-1 leading-none">
              <p className="truncate text-[0.72rem] font-semibold text-sidebar-foreground">
                Riverside Contracting
              </p>
              <p className="mt-0.5 text-[0.55rem] text-muted-foreground">
                Owner
              </p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex flex-1 flex-col gap-0.5 px-2.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-2.5 py-[0.45rem]",
                  item.active
                    ? "border border-primary/12 bg-primary/12 text-primary"
                    : "border border-transparent text-muted-foreground",
                )}
              >
                <Icon className="size-[15px] shrink-0" />
                <span className="text-[0.72rem] font-medium">
                  {item.label}
                </span>
              </div>
            );
          })}
        </nav>

        {/* User menu */}
        <div className="border-t border-sidebar-border p-2.5">
          <div className="flex items-center gap-2">
            <span className="size-6 shrink-0 rounded-full bg-gradient-to-br from-primary to-primary/70" />
            <div className="min-w-0 flex-1 leading-none">
              <p className="truncate text-[0.72rem] font-medium text-sidebar-foreground">
                Jamie Rivera
              </p>
              <p className="mt-0.5 truncate text-[0.55rem] text-muted-foreground">
                jamie@riverside.co
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <div className="flex h-11 shrink-0 items-center gap-2.5 border-b border-border/70 bg-background/90 px-4">
          <HomeIcon className="size-4 text-muted-foreground" />
          <span className="h-3.5 w-px bg-border" />
          <div className="flex min-w-0 flex-1 items-center gap-1.5 text-[0.72rem] text-muted-foreground">
            <span className="font-medium text-foreground">Home</span>
          </div>
          <div className="hidden items-center gap-1.5 rounded-lg border border-border/60 bg-muted/20 px-2.5 py-1 text-[0.62rem] text-muted-foreground/70 md:flex">
            <Search className="size-3" />
            <span>Search…</span>
          </div>
          <span className="flex size-6 items-center justify-center rounded-full border border-border/60 text-muted-foreground">
            <BellRing className="size-3.5" />
          </span>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          <div className="mx-auto flex max-w-3xl flex-col gap-4 p-4 sm:gap-5 sm:p-5">
            {/* Greeting */}
            <div className="flex flex-col gap-1">
              <h1 className="font-heading text-base font-semibold tracking-tight text-foreground sm:text-lg">
                Good morning, Jamie
              </h1>
              <p className="text-[0.72rem] text-muted-foreground">
                2 urgent items need attention.
              </p>
            </div>

            {/* Velocity stats */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <p className="text-[0.55rem] font-medium uppercase tracking-wider text-muted-foreground">
                  Last 30 days
                </p>
                <span className="inline-flex items-center gap-0.5 text-[0.55rem] text-muted-foreground">
                  Full analytics
                  <ArrowRight className="size-2.5" />
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {statCards.map((card) => {
                  const Icon = card.icon;
                  return (
                    <div
                      className="rounded-lg border border-border/60 bg-card px-2.5 py-2"
                      key={card.label}
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-[0.6rem] font-medium text-muted-foreground">
                          {card.label}
                        </p>
                        <div
                          className={cn(
                            "rounded-md p-1",
                            card.highlight
                              ? "bg-primary/10 text-primary"
                              : "bg-muted text-muted-foreground",
                          )}
                        >
                          <Icon className="size-2.5" />
                        </div>
                      </div>
                      <p
                        className={cn(
                          "mt-1 text-base font-semibold tracking-tight",
                          card.highlight
                            ? "text-primary"
                            : "text-foreground",
                        )}
                      >
                        {card.value}
                      </p>
                      <p className="text-[0.55rem] text-muted-foreground">
                        {card.suffix}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Priority queue */}
            <div className="flex flex-col">
              <div className="flex items-center justify-between pb-1.5">
                <div className="min-w-0">
                  <h2 className="text-[0.72rem] font-semibold text-foreground">
                    Priority queue
                  </h2>
                </div>
                <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-secondary px-1 text-[0.55rem] font-medium text-muted-foreground">
                  4
                </span>
              </div>

              <div className="flex items-center gap-1 pb-1.5">
                {["All", "Inquiries", "Quotes", "Follow-ups"].map(
                  (filter, index) => (
                    <span
                      key={filter}
                      className={cn(
                        "rounded-md px-1.5 py-0.5 text-[0.6rem] font-medium",
                        index === 0
                          ? "bg-secondary font-semibold text-foreground"
                          : "text-muted-foreground",
                      )}
                    >
                      {filter}
                    </span>
                  ),
                )}
              </div>

              <div className="flex flex-col">
                {queueRows.map((row) => {
                  const Icon = row.icon;
                  return (
                    <div
                      className="flex items-center justify-between gap-3 border-b border-border/40 px-1 py-1.5 last:border-b-0"
                      key={row.title}
                    >
                      <div className="flex min-w-0 flex-1 items-center gap-2.5">
                        <div
                          className={cn(
                            "flex size-7 shrink-0 items-center justify-center rounded-lg",
                            row.iconClass,
                          )}
                        >
                          <Icon className="size-3.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="truncate text-[0.72rem] font-semibold tracking-tight text-foreground">
                              {row.title}
                            </span>
                            <span className="shrink-0 rounded bg-secondary/80 px-1 py-px text-[0.5rem] font-medium uppercase tracking-wider text-muted-foreground">
                              {row.category}
                            </span>
                          </div>
                          <p className="mt-0.5 truncate text-[0.6rem] text-muted-foreground">
                            {row.description}
                            <span className="mx-1 text-muted-foreground/40">
                              ·
                            </span>
                            <span
                              className={cn(
                                row.urgent
                                  ? "font-medium text-destructive"
                                  : "text-muted-foreground/80",
                              )}
                            >
                              {row.meta}
                            </span>
                          </p>
                        </div>
                      </div>
                      <span className="hidden shrink-0 text-[0.6rem] font-semibold text-primary/95 sm:inline">
                        {row.actionLabel}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
