import Image from "next/image";
import {
  ArrowRight,
  BarChart3,
  Bell,
  BellRing,
  ChevronRight,
  Clock3,
  FileText,
  Inbox,
  LayoutDashboard,
  Lock,
  Search,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type NavItem = {
  key: string;
  label: string;
  icon: LucideIcon;
  active?: boolean;
};

const navItems: readonly NavItem[] = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard, active: true },
  { key: "inquiries", label: "Inquiries", icon: Inbox },
  { key: "quotes", label: "Quotes", icon: FileText },
  { key: "follow-ups", label: "Follow-ups", icon: BellRing },
  { key: "analytics", label: "Analytics", icon: BarChart3 },
];

const dashboardStats: readonly {
  label: string;
  value: string;
  delta: string;
  up: boolean;
}[] = [
  { label: "New inquiries", value: "4", delta: "+2", up: true },
  { label: "Quotes sent", value: "8", delta: "+3", up: true },
  { label: "Viewed rate", value: "75%", delta: "+6 pts", up: true },
  { label: "Won this week", value: "3", delta: "+1", up: true },
];

type DashboardAlert = {
  tone: "overdue" | "due" | "fresh";
  icon: LucideIcon;
  title: string;
  detail: string;
};

const dashboardAlerts: readonly DashboardAlert[] = [
  {
    tone: "overdue",
    icon: Clock3,
    title: "Q-1042 viewed, no reply in 2 days",
    detail: "Sarah Jenkins · Kitchen remodel",
  },
  {
    tone: "due",
    icon: BellRing,
    title: "Follow-up due today",
    detail: "Maya Fields · Studio fit-out",
  },
  {
    tone: "fresh",
    icon: Inbox,
    title: "New inquiry from Leo Park",
    detail: "Tile repair · 9:02 AM",
  },
];

const weeklyProgress: readonly {
  label: string;
  value: number;
  pct: number;
}[] = [
  { label: "Inquiries captured", value: 14, pct: 100 },
  { label: "Quotes sent", value: 8, pct: 57 },
  { label: "Quotes viewed", value: 6, pct: 43 },
  { label: "Jobs won", value: 3, pct: 21 },
];

export function MarketingShowcase() {
  return (
    <div className="mx-auto w-full max-w-6xl">
      <div
        aria-label="Preview of the Requo dashboard"
        className="relative w-full overflow-hidden rounded-2xl border border-border/80 bg-background/95 shadow-[var(--surface-shadow-lg)]"
        role="img"
      >
        {/* Browser chrome */}
        <div className="flex h-10 shrink-0 items-center gap-3 border-b border-border/70 bg-muted/40 px-3 sm:h-11 sm:px-4">
          <div aria-hidden="true" className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-border" />
            <span className="size-2.5 rounded-full bg-border" />
            <span className="size-2.5 rounded-full bg-border" />
          </div>
          <div className="mx-auto flex h-6 max-w-xs flex-1 items-center gap-1.5 rounded-md border border-border/70 bg-background/70 px-2.5 text-[10px] text-muted-foreground sm:text-[11px]">
            <Lock className="size-3" />
            <span className="truncate font-mono">
              app.requo.com/brightside/dashboard
            </span>
          </div>
          <span aria-hidden="true" className="hidden w-8 sm:block" />
        </div>

        <div className="flex h-[30rem] min-h-0 sm:h-[32rem] lg:h-[34rem]">
          {/* Sidebar */}
          <aside
            aria-hidden="true"
            className="flex w-12 shrink-0 flex-col gap-0.5 border-r border-border/70 bg-muted/20 p-1.5 sm:w-48 sm:p-3"
          >
            <div className="hidden items-center gap-2 px-1 pb-2 sm:flex">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-md border border-border/60 bg-background/80 shadow-sm">
                <Image
                  alt=""
                  className="size-4"
                  height={16}
                  src="/logo.svg"
                  width={16}
                />
              </span>
              <div className="min-w-0 leading-tight">
                <p className="truncate text-[11px] font-semibold text-foreground">
                  BrightSide
                </p>
                <p className="truncate text-[9px] text-muted-foreground">
                  Print studio
                </p>
              </div>
            </div>

            <div className="mx-1 my-1 hidden h-px bg-border/70 sm:block" />

            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-1.5 py-1.5 text-left text-[11px] font-medium sm:px-2 sm:text-sm",
                    item.active
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground",
                  )}
                  key={item.key}
                >
                  <Icon
                    className={cn(
                      "mx-auto size-4 shrink-0 sm:mx-0",
                      item.active ? "text-primary" : "",
                    )}
                  />
                  <span className="hidden truncate sm:block">{item.label}</span>
                </div>
              );
            })}
          </aside>

          {/* Main content */}
          <div className="flex min-w-0 flex-1 flex-col bg-background">
            {/* Top bar */}
            <div className="flex items-center justify-between gap-3 border-b border-border/70 px-3 py-2.5 sm:px-5 sm:py-3.5">
              <div className="min-w-0">
                <div className="flex items-center gap-1 text-[9px] font-medium uppercase tracking-[0.14em] text-muted-foreground sm:text-[10px]">
                  <span className="truncate">BrightSide</span>
                  <ChevronRight className="size-3 shrink-0" />
                  <span className="truncate text-foreground">Workspace</span>
                </div>
                <h3 className="truncate font-heading text-sm font-semibold tracking-tight text-foreground sm:text-base">
                  Dashboard
                </h3>
              </div>
              <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
                <span
                  aria-hidden="true"
                  className="hidden items-center gap-1.5 rounded-md border border-border/70 bg-background/70 px-2 py-1 text-[10px] text-muted-foreground sm:inline-flex sm:text-[11px]"
                >
                  <Search className="size-3" />
                  Search
                </span>
                <span
                  aria-hidden="true"
                  className="relative flex size-7 items-center justify-center rounded-md border border-border/70 bg-background/70"
                >
                  <Bell className="size-3.5 text-muted-foreground" />
                  <span className="absolute right-1 top-1 size-1.5 rounded-full bg-primary" />
                </span>
              </div>
            </div>

            {/* Content — overflow is clipped by the frame; no scroll */}
            <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden px-3 py-4 sm:gap-5 sm:px-5 sm:py-5">
              {/* Stat tiles */}
              <div className="grid shrink-0 grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-2.5">
                {dashboardStats.map((stat) => (
                  <div
                    className="info-tile min-w-0 px-2.5 py-2.5 shadow-none sm:px-3 sm:py-3"
                    key={stat.label}
                  >
                    <p className="truncate text-[9px] font-medium uppercase tracking-[0.12em] text-muted-foreground sm:text-[10px]">
                      {stat.label}
                    </p>
                    <p className="mt-1 truncate font-heading text-base font-semibold tracking-tight text-foreground sm:mt-1.5 sm:text-xl">
                      {stat.value}
                    </p>
                    <p
                      className={cn(
                        "mt-0.5 truncate text-[9px] font-medium sm:text-[10px]",
                        stat.up ? "text-primary" : "text-muted-foreground",
                      )}
                    >
                      {stat.up ? "▲" : "▼"} {stat.delta} this week
                    </p>
                  </div>
                ))}
              </div>

              {/* Needs attention */}
              <div className="soft-panel flex shrink-0 flex-col gap-2 px-3 py-3 shadow-none sm:px-4 sm:py-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="meta-label">Needs attention</p>
                    <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                      Quotes and inquiries waiting on the next step.
                    </p>
                  </div>
                  <Badge className="shrink-0 rounded-full" variant="outline">
                    {dashboardAlerts.length} open
                  </Badge>
                </div>
                <div className="flex flex-col gap-1.5">
                  {dashboardAlerts.map((alert, index) => {
                    const Icon = alert.icon;
                    return (
                      <div
                        className="flex items-center gap-2.5 rounded-md border border-border/60 bg-background/70 px-2.5 py-2 sm:px-3 sm:py-2.5"
                        key={index}
                      >
                        <span
                          className={cn(
                            "flex size-7 shrink-0 items-center justify-center rounded-md",
                            alert.tone === "overdue" &&
                              "bg-destructive/10 text-destructive",
                            alert.tone === "due" &&
                              "bg-primary/12 text-primary",
                            alert.tone === "fresh" &&
                              "bg-muted/60 text-foreground",
                          )}
                        >
                          <Icon className="size-3.5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[11px] font-medium text-foreground sm:text-xs">
                            {alert.title}
                          </p>
                          <p className="truncate text-[10px] text-muted-foreground">
                            {alert.detail}
                          </p>
                        </div>
                        <ArrowRight className="size-3.5 shrink-0 text-muted-foreground" />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* This week */}
              <div className="soft-panel flex shrink-0 flex-col gap-2 px-3 py-3 shadow-none sm:px-4 sm:py-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="meta-label">This week</p>
                  <span className="text-[10px] text-muted-foreground">
                    Last 7 days
                  </span>
                </div>
                <div className="flex flex-col gap-1.5">
                  {weeklyProgress.map((row) => (
                    <div
                      className="grid grid-cols-[minmax(0,1fr)_2.5rem] items-center gap-3"
                      key={row.label}
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-28 truncate text-[11px] text-muted-foreground">
                          {row.label}
                        </span>
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted/40">
                          <div
                            className="h-full rounded-full bg-primary/70"
                            style={{ width: `${row.pct}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-right text-xs font-semibold text-foreground">
                        {row.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
