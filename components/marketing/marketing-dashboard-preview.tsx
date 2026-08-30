import {
  ArrowRight,
  BarChart3,
  Bell,
  BellRing,
  CheckCircle2,
  ChevronsUpDown,
  Clock,
  FileText,
  FormInput,
  Home,
  Inbox,
  Package,
  PanelLeft,
  Search,
  Send,
  Target,
  TrendingUp,
  Users,
  type LucideIcon,
} from "lucide-react";

import { BrandMark } from "@/components/shared/brand-mark";
import { cn } from "@/lib/utils";

type NavItem = {
  label: string;
  icon: LucideIcon;
  active?: boolean;
};

const navigationItems: readonly NavItem[] = [
  { label: "Home", icon: Home, active: true },
  { label: "Inquiries", icon: Inbox },
  { label: "Quotes", icon: FileText },
  { label: "Follow-ups", icon: BellRing },
  { label: "Forms", icon: FormInput },
  { label: "Products", icon: Package },
  { label: "Members", icon: Users },
  { label: "Analytics", icon: BarChart3 },
];

type KpiStat = {
  label: string;
  value: string;
  suffix: string;
  highlight?: boolean;
  icon: LucideIcon;
};

const kpiStats: readonly KpiStat[] = [
  {
    label: "Won",
    value: "$18,450",
    suffix: "last 30 days",
    highlight: true,
    icon: TrendingUp,
  },
  {
    label: "In-play",
    value: "$12,200",
    suffix: "4 open",
    icon: Send,
  },
  {
    label: "Acceptance",
    value: "68%",
    suffix: "win rate",
    highlight: true,
    icon: Target,
  },
  {
    label: "Avg. time to quote",
    value: "1.8 hrs",
    suffix: "fast turnaround",
    highlight: true,
    icon: Clock,
  },
];

type PriorityItem = {
  id: string;
  category: "Follow-up" | "Inquiry" | "Quote";
  icon: LucideIcon;
  iconStyle: string;
  title: string;
  description: string;
  meta: string;
  actionLabel: string;
  urgent?: boolean;
};

const priorityItems: readonly PriorityItem[] = [
  {
    id: "1",
    category: "Follow-up",
    icon: BellRing,
    iconStyle: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    title: "Follow up on Kitchen Renovation Quote",
    description: "Sarah Jenkins · Sent quote 3 days ago",
    meta: "Due 2 hours ago",
    actionLabel: "Follow up now",
    urgent: true,
  },
  {
    id: "2",
    category: "Inquiry",
    icon: Inbox,
    iconStyle: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
    title: "Marcus Vance",
    description: "Commercial HVAC Assessment",
    meta: "Submitted 1 hour ago",
    actionLabel: "Create quote",
  },
  {
    id: "3",
    category: "Quote",
    icon: FileText,
    iconStyle: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    title: "Electrical Panel Upgrade & Rewiring",
    description: "David Chen",
    meta: "Updated yesterday",
    actionLabel: "Finish & send",
  },
  {
    id: "4",
    category: "Quote",
    icon: CheckCircle2,
    iconStyle: "bg-green-500/10 text-green-600 dark:text-green-400",
    title: "Full Roof Replacement & Gutters",
    description: "Oakridge Property Management",
    meta: "Accepted today · $8,400",
    actionLabel: "View quote",
  },
];

export function MarketingDashboardPreview() {
  return (
    <div
      aria-hidden="true"
      className="flex h-full w-full select-none bg-background text-left font-sans antialiased"
    >
      {/* Real-width Sidebar */}
      <aside className="flex w-[260px] shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
        {/* Sidebar Header - h-14 to perfectly match topbar line */}
        <div className="flex h-14 items-center justify-between border-b border-sidebar-border px-3.5">
          <BrandMark
            subtitle={null}
            size="default"
            href="#"
            className="pointer-events-none px-2 py-1.5"
          />
          <div className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground">
            <PanelLeft className="size-4" />
          </div>
        </div>

        {/* Business Switcher Card */}
        <div className="px-3 py-3">
          <div className="w-full rounded-[1.1rem] border border-sidebar-border/90 bg-background/92 p-3 text-left shadow-[0_1px_2px_rgba(15,23,42,0.05),inset_0_1px_0_rgba(255,255,255,0.42)] dark:border-white/8 dark:bg-card/90 dark:shadow-[0_1px_2px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.04)]">
            <div className="flex items-start gap-3">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-[0.8rem] border border-sidebar-border bg-muted/80 text-xs font-bold tracking-wider text-sidebar-foreground shadow-xs">
                RC
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[0.62rem] font-semibold uppercase tracking-wider text-sidebar-foreground/60">
                    Business
                  </span>
                  <ChevronsUpDown className="size-3.5 text-muted-foreground" />
                </div>
                <p className="truncate text-xs font-semibold text-sidebar-foreground">
                  Riverside Contractors
                </p>
                <p className="truncate text-[0.68rem] text-muted-foreground">
                  /riverside
                </p>
              </div>
            </div>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              <span className="inline-flex h-5 items-center rounded-full border border-primary/30 bg-primary/10 px-2 text-[0.65rem] font-semibold text-primary">
                Pro
              </span>
              <span className="inline-flex h-5 items-center rounded-full border border-sidebar-border bg-background px-2 text-[0.65rem] font-medium text-sidebar-foreground">
                USD
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex flex-1 flex-col gap-0.5 px-3 pt-0.5">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                className={cn(
                  "flex h-8.5 items-center gap-3 rounded-lg px-2.5 text-[0.82rem] transition-colors",
                  item.active
                    ? "bg-black/8 font-medium text-sidebar-foreground dark:bg-white/10"
                    : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground",
                )}
              >
                <Icon
                  className={cn(
                    "size-4 shrink-0",
                    item.active ? "text-foreground" : "text-muted-foreground",
                  )}
                />
                <span>{item.label}</span>
              </div>
            );
          })}
        </nav>

        {/* Sidebar Footer / User Profile */}
        <div className="border-t border-sidebar-border p-3">
          <div className="flex items-center gap-2.5 rounded-lg p-1.5">
            <div className="flex size-7.5 shrink-0 items-center justify-center rounded-lg bg-muted text-xs font-semibold text-foreground">
              JD
            </div>
            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-xs font-medium text-sidebar-foreground">
                Jamie Davis
              </p>
              <p className="truncate text-[0.65rem] text-muted-foreground">
                jamie@riverside.com
              </p>
            </div>
            <ChevronsUpDown className="size-3.5 text-muted-foreground" />
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col bg-background">
        {/* Topbar - matching exact h-14 height and border line alignment with sidebar header */}
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-border/70 bg-background/90 px-6 backdrop-blur">
          {/* Breadcrumbs */}
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-md text-foreground">
              <Home className="size-4" />
            </div>
            <span aria-hidden="true" className="h-3.5 w-px self-center bg-border" />
            <span className="text-sm font-medium text-foreground">Home</span>
          </div>

          {/* Quick Actions Search & Notifications */}
          <div className="flex items-center gap-2">
            <div className="flex h-8.5 w-60 items-center justify-between rounded-lg border border-border/60 bg-muted/25 px-2.5 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <Search className="size-3.5 shrink-0" />
                <span>Quick actions…</span>
              </div>
              <kbd className="flex items-center gap-0.5 rounded border border-border/70 bg-muted px-1.5 py-0.5 font-mono text-[9px] font-medium text-muted-foreground">
                ⌘K
              </kbd>
            </div>
            <div className="relative flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground">
              <Bell className="size-4" />
              <span className="absolute -right-0.5 -top-0.5 flex size-3.5 items-center justify-center rounded-full bg-foreground text-[8px] font-bold text-background">
                3
              </span>
            </div>
          </div>
        </header>

        {/* Dashboard Canvas */}
        <div className="flex-1 overflow-hidden p-5">
          <div className="flex flex-col gap-4">
            {/* Greeting */}
            <div className="flex flex-col">
              <h1 className="font-heading text-lg font-semibold tracking-tight text-foreground sm:text-xl">
                Good morning, Jamie
              </h1>
              <p className="text-xs text-muted-foreground">
                2 urgent items and 3 new items since your last visit.
              </p>
            </div>

            {/* Last 30 Days KPI Row */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[0.65rem] font-medium uppercase tracking-wider text-muted-foreground">
                  Last 30 days
                </span>
                <span className="inline-flex items-center gap-1 text-[0.7rem] text-muted-foreground">
                  Full analytics
                  <ArrowRight className="size-2.5" />
                </span>
              </div>

              <div className="grid grid-cols-4 gap-2.5">
                {kpiStats.map((stat) => {
                  const Icon = stat.icon;
                  return (
                    <div
                      key={stat.label}
                      className="flex flex-col justify-between rounded-xl border border-border/80 bg-card p-3 shadow-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[0.68rem] font-medium text-muted-foreground">
                          {stat.label}
                        </span>
                        <Icon
                          className={cn(
                            "size-3.5",
                            stat.highlight
                              ? "text-primary"
                              : "text-muted-foreground/70",
                          )}
                        />
                      </div>
                      <div className="mt-1.5 flex flex-col">
                        <span className="text-base font-bold tracking-tight text-foreground">
                          {stat.value}
                        </span>
                        <span className="text-[0.62rem] text-muted-foreground">
                          {stat.suffix}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Priority Queue Section */}
            <div className="flex flex-col">
              <div className="flex items-center justify-between pb-2">
                <div>
                  <h2 className="text-xs font-semibold text-foreground">
                    Priority queue
                  </h2>
                  <p className="text-[0.68rem] text-muted-foreground">
                    Follow up, finish drafts, and confirm wins.
                  </p>
                </div>
                <span className="rounded-md bg-secondary px-1.5 py-0.5 text-[0.65rem] font-semibold text-secondary-foreground">
                  4
                </span>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1 pb-1.5">
                <span className="inline-flex h-6 items-center gap-1 rounded-md bg-secondary px-2 text-[0.68rem] font-semibold text-foreground">
                  All <span className="text-[0.58rem] text-muted-foreground">4</span>
                </span>
                <span className="inline-flex h-6 items-center gap-1 rounded-md px-2 text-[0.68rem] font-medium text-muted-foreground">
                  Inquiries <span className="text-[0.58rem] text-muted-foreground/70">1</span>
                </span>
                <span className="inline-flex h-6 items-center gap-1 rounded-md px-2 text-[0.68rem] font-medium text-muted-foreground">
                  Quotes <span className="text-[0.58rem] text-muted-foreground/70">2</span>
                </span>
                <span className="inline-flex h-6 items-center gap-1 rounded-md px-2 text-[0.68rem] font-medium text-muted-foreground">
                  Follow-ups <span className="text-[0.58rem] text-muted-foreground/70">1</span>
                </span>
              </div>

              {/* Items List */}
              <div className="flex flex-col divide-y divide-border/40">
                {priorityItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.id}
                      className="group flex items-center justify-between gap-3 py-2 px-1.5"
                    >
                      <div className="flex min-w-0 flex-1 items-center gap-2.5">
                        <div
                          className={cn(
                            "flex size-7.5 shrink-0 items-center justify-center rounded-lg",
                            item.iconStyle,
                          )}
                        >
                          <Icon className="size-3.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="truncate text-xs font-semibold tracking-tight text-foreground">
                              {item.title}
                            </span>
                            <span className="shrink-0 rounded bg-secondary/80 px-1 py-0.2 text-[0.55rem] font-semibold uppercase tracking-wider text-muted-foreground">
                              {item.category}
                            </span>
                          </div>
                          <p className="truncate text-[0.68rem] text-muted-foreground">
                            {item.description}
                            <span className="mx-1 text-muted-foreground/40">·</span>
                            <span
                              className={cn(
                                item.urgent
                                  ? "font-medium text-destructive"
                                  : "text-muted-foreground",
                              )}
                            >
                              {item.meta}
                            </span>
                          </p>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-1">
                        <span className="text-[0.68rem] font-semibold text-primary">
                          {item.actionLabel}
                        </span>
                        <ArrowRight className="size-3 text-primary" />
                      </div>
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
