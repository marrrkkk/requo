"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  Bell,
  BellRing,
  ChevronsUpDown,
  Clock3,
  Eye,
  FileText,
  FormInput,
  Inbox,
  LayoutDashboard,
  Lock,
  PanelLeft,
  Search,
  Settings2,
  Sparkles,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/*                         Static data mirroring real shell                    */
/* -------------------------------------------------------------------------- */

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
  { key: "ask", label: "Ask", icon: Sparkles },
  { key: "analytics", label: "Analytics", icon: BarChart3 },
  { key: "forms", label: "Forms", icon: FormInput },
  { key: "members", label: "Members", icon: Users },
  { key: "settings", label: "Settings", icon: Settings2 },
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
  status?: string;
};

const dashboardAlerts: readonly DashboardAlert[] = [
  {
    tone: "overdue",
    icon: Clock3,
    title: "Q-1042 viewed, no reply in 2 days",
    detail: "Sarah Jenkins · Kitchen remodel",
    status: "Follow up",
  },
  {
    tone: "due",
    icon: BellRing,
    title: "Follow-up due today",
    detail: "Maya Fields · Studio fit-out",
    status: "Due today",
  },
  {
    tone: "fresh",
    icon: Inbox,
    title: "New inquiry from Leo Park",
    detail: "Tile repair · 9:02 AM",
    status: "New",
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

/* -------------------------------------------------------------------------- */
/*                            Animation hook                                   */
/* -------------------------------------------------------------------------- */

function useShowcaseAnimation() {
  const [phase, setPhase] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          const timers: ReturnType<typeof setTimeout>[] = [];
          timers.push(setTimeout(() => setPhase(1), 200));
          timers.push(setTimeout(() => setPhase(2), 600));
          timers.push(setTimeout(() => setPhase(3), 1000));
          timers.push(setTimeout(() => setPhase(4), 1400));
          return () => timers.forEach(clearTimeout);
        }
      },
      { threshold: 0.3 },
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  return { phase, containerRef };
}

/* -------------------------------------------------------------------------- */
/*                            Requo Logo SVG                                   */
/* -------------------------------------------------------------------------- */

function RequoLogoIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 100 100"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path d="m18.762 27.812c7.4922 0.94531 13.793-5.3555 12.848-12.848-0.64453-5.1055-4.7656-9.2266-9.8711-9.8711-7.4922-0.94531-13.793 5.3555-12.848 12.848 0.64453 5.1055 4.7656 9.2266 9.8711 9.8711z" />
      <path d="m71.438 24.273c3.1484 3.3516 8.2305 4.8633 13.543 2.457 2.2383-1.0117 4.0625-2.8281 5.0664-5.0703 3.7852-8.457-2.2969-16.66-10.301-16.66-4.8711 0-8.9922 3.0586-10.648 7.3516-0.058594 0.15625-0.20703 0.26172-0.375 0.26172h-23.945c-0.95312 0-1.875 0.43359-2.4219 1.2148-2.1875 3.1211-0.011719 6.4688 2.9531 6.4688h13.195c0.22656 0 0.26953 0.3125 0.058594 0.38672-10.301 3.6211-17.023 8.7188-20.945 12.262-17.57 15.891-22.605 40.23-22.621 40.305 0 0.003906-0.007813 0.042969-0.027344 0.089844-0.035156 0.082031-0.097656 0.14844-0.17578 0.19141-4.9258 2.6836-7.7109 8.8008-4.8516 15.207 1.0039 2.25 2.8164 4.082 5.0625 5.0938 8.4688 3.8203 16.695-2.2734 16.695-10.285 0-4.3555-2.457-8.1055-6.0391-10.039-0.16016-0.085937-0.25-0.26562-0.21094-0.44531 4.8281-23.574 22.625-42.469 45.582-48.902 0.14453-0.039062 0.30078 0.003906 0.40234 0.11328z" />
      <path d="m83.59 71.867v-29.711c0-2.0078-1.4688-3.7969-3.4648-3.9883-2.293-0.21875-4.2188 1.5781-4.2188 3.8242v29.867c0 0.53906-0.30469 1.0391-0.79688 1.2578-4.1836 1.8594-7.0586 6.1133-6.7969 11.047 0.29297 5.543 5.4062 10.594 10.953 10.824 6.5469 0.26953 11.938-4.957 11.938-11.445 0-4.668-2.8086-8.6445-6.8164-10.426-0.49219-0.21875-0.79688-0.71484-0.79688-1.25z" />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/*                            Component                                        */
/* -------------------------------------------------------------------------- */

export function MarketingShowcase() {
  const { phase, containerRef } = useShowcaseAnimation();

  return (
    <div className="mx-auto w-full max-w-6xl" ref={containerRef}>
      <div
        aria-label="Preview of the Requo dashboard"
        className="relative w-full overflow-hidden rounded-2xl border border-border/60 bg-background shadow-[0_8px_40px_rgba(0,0,0,0.08),0_1px_3px_rgba(0,0,0,0.04)] dark:shadow-[0_8px_40px_rgba(0,0,0,0.4)]"
        role="img"
      >
        {/* Browser chrome */}
        <div className="flex h-9 shrink-0 items-center gap-3 border-b border-border/50 bg-muted/30 px-3 sm:h-10 sm:px-4">
          <div aria-hidden="true" className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-border/80" />
            <span className="size-2 rounded-full bg-border/80" />
            <span className="size-2 rounded-full bg-border/80" />
          </div>
          <div className="mx-auto flex h-5.5 max-w-xs flex-1 items-center gap-1.5 rounded-md border border-border/50 bg-background/60 px-2.5 text-[10px] text-muted-foreground sm:text-[11px]">
            <Lock className="size-2.5" />
            <span className="truncate font-mono">
              app.requo.com/brightside/dashboard
            </span>
          </div>
          <span aria-hidden="true" className="hidden w-8 sm:block" />
        </div>

        <div className="flex h-[30rem] min-h-0 sm:h-[32rem] lg:h-[34rem]">
          {/* ─── Sidebar (mirrors DashboardShell sidebar) ─── */}
          <aside
            aria-hidden="true"
            className="flex w-14 shrink-0 flex-col border-r border-border/50 bg-sidebar sm:w-[16rem]"
          >
            {/* Sidebar Header — BrandMark */}
            <div className="flex h-[3.5rem] items-center px-2 sm:px-3">
              <div className="flex items-center gap-2 px-2 py-1.5">
                <span className="flex size-6 shrink-0 items-center justify-center text-primary sm:size-7">
                  <RequoLogoIcon className="size-full" />
                </span>
                <span className="hidden min-w-0 flex-col leading-none sm:flex">
                  <span className="truncate font-heading text-lg font-semibold tracking-[-0.025em] text-foreground">
                    requo
                  </span>
                </span>
              </div>
            </div>

            {/* Separator */}
            <div className="mx-2.5 h-px bg-border/40" />

            {/* Business Switcher */}
            <div className="hidden px-3 py-2.5 sm:block">
              <div className="w-full rounded-xl border border-sidebar-border/70 bg-background/80 p-3 text-left shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:border-white/6 dark:bg-card/70">
                <div className="flex items-center gap-3">
                  {/* Business Avatar */}
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-sidebar-border/70 bg-muted/50 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/80 dark:border-white/6">
                    BS
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-sidebar-foreground">
                      BrightSide
                    </p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      /brightside
                    </p>
                  </div>
                  <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground/60" />
                </div>
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  <Badge className="h-5 rounded-full border-primary/20 bg-primary/8 px-2 text-[10px] text-primary" variant="outline">
                    Pro
                  </Badge>
                  <Badge className="h-5 rounded-full border-sidebar-border/70 bg-transparent px-2 text-[10px] text-muted-foreground" variant="outline">
                    USD
                  </Badge>
                </div>
              </div>
            </div>

            {/* Navigation Items */}
            <div className="flex-1 overflow-hidden px-1 pb-3 sm:px-2.5">
              <div className="flex flex-col gap-px pt-2">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      className={cn(
                        "flex min-h-9 w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[13px] font-medium",
                        item.active
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground",
                      )}
                      key={item.key}
                    >
                      <Icon
                        className={cn(
                          "mx-auto size-3.5 shrink-0 sm:mx-0",
                          item.active ? "text-primary" : "text-muted-foreground/70",
                        )}
                      />
                      <span className="hidden truncate sm:block">{item.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Separator */}
            <div className="mx-2.5 h-px bg-border/50" />

            {/* User Menu Footer */}
            <div className="hidden p-2.5 pt-2 sm:block">
              <div className="flex items-center gap-2.5 rounded-lg px-2 py-1.5">
                <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted/60 text-[9px] font-semibold text-foreground/80">
                  JD
                </div>
                <div className="min-w-0 flex-1 leading-tight">
                  <p className="truncate text-[12px] font-medium text-sidebar-foreground">
                    Jamie Davis
                  </p>
                  <p className="truncate text-[10px] text-muted-foreground">
                    jamie@brightside.co
                  </p>
                </div>
              </div>
            </div>
          </aside>

          {/* ─── Main Content (mirrors SidebarInset) ─── */}
          <div className="flex min-w-0 flex-1 flex-col bg-background">
            {/* Top bar — mirrors dashboard-topbar */}
            <div className="sticky top-0 z-30 border-b border-border/50 bg-background/95 backdrop-blur-sm">
              <div className="flex min-h-10 items-center gap-2 px-3 py-2 sm:px-5 sm:py-3 md:gap-2.5">
                {/* SidebarTrigger */}
                <button
                  type="button"
                  className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground/70"
                  tabIndex={-1}
                >
                  <PanelLeft className="size-3.5" />
                </button>
                {/* Separator */}
                <span
                  aria-hidden="true"
                  className="hidden h-4 w-px shrink-0 self-center bg-border md:block"
                />
                {/* Breadcrumbs */}
                <div className="hidden min-w-0 flex-1 md:block">
                  <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <span className="text-foreground font-medium">Dashboard</span>
                  </nav>
                </div>
                {/* Mobile page label */}
                <div className="min-w-0 flex-1 md:hidden">
                  <p className="truncate font-heading text-base font-semibold tracking-tight text-foreground">
                    Dashboard
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    BrightSide
                  </p>
                </div>
                {/* Command menu + notification bell */}
                <div className="flex shrink-0 items-center gap-1.5">
                  <span
                    aria-hidden="true"
                    className="hidden items-center gap-1.5 rounded-md border border-border/50 bg-muted/15 px-2.5 py-1.5 text-[11px] text-muted-foreground md:inline-flex lg:w-72"
                  >
                    <Search className="size-3" />
                    <span>Search quotes, inquiries...</span>
                    <kbd className="ml-auto rounded border border-border/50 bg-background/60 px-1.5 py-0.5 font-mono text-[9px]">⌘K</kbd>
                  </span>
                  <span
                    aria-hidden="true"
                    className={cn(
                      "relative flex size-8 items-center justify-center rounded-md transition-all duration-300",
                      phase >= 4
                        ? "bg-primary/8 text-primary"
                        : "text-muted-foreground",
                    )}
                  >
                    <Bell className="size-3.5" />
                    <span
                      className={cn(
                        "absolute right-1.5 top-1.5 size-1.5 rounded-full bg-primary transition-transform duration-300",
                        phase >= 4 ? "scale-100" : "scale-0",
                      )}
                    />
                  </span>
                </div>
              </div>
            </div>

            {/* Dashboard content area */}
            <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden px-3 py-4 sm:gap-5 sm:px-5 sm:py-5">
              {/* Stat tiles */}
              <div className="grid shrink-0 grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-2.5">
                {dashboardStats.map((stat, index) => (
                  <div
                    className={cn(
                      "info-tile min-w-0 px-2.5 py-2.5 shadow-none sm:px-3 sm:py-3 transition-all duration-500",
                      phase >= 1
                        ? "translate-y-0 opacity-100"
                        : "translate-y-2 opacity-0",
                    )}
                    key={stat.label}
                    style={{
                      transitionDelay: phase >= 1 ? `${index * 80}ms` : "0ms",
                    }}
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
              <div
                className={cn(
                  "soft-panel flex shrink-0 flex-col gap-2 px-3 py-3 shadow-none sm:px-4 sm:py-4 transition-all duration-500",
                  phase >= 2
                    ? "translate-y-0 opacity-100"
                    : "translate-y-3 opacity-0",
                )}
              >
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
                        className={cn(
                          "flex items-center gap-2.5 rounded-md border border-border/60 bg-background/70 px-2.5 py-2 sm:px-3 sm:py-2.5 transition-all duration-400",
                          phase >= 2
                            ? "translate-x-0 opacity-100"
                            : "translate-x-3 opacity-0",
                        )}
                        key={index}
                        style={{
                          transitionDelay:
                            phase >= 2 ? `${index * 100 + 100}ms` : "0ms",
                        }}
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
                        {alert.status ? (
                          <span
                            className={cn(
                              "hidden shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-medium sm:inline-flex",
                              alert.tone === "overdue" &&
                                "bg-destructive/10 text-destructive",
                              alert.tone === "due" &&
                                "border border-primary/30 bg-primary/10 text-primary",
                              alert.tone === "fresh" &&
                                "border border-border/70 bg-muted/40 text-muted-foreground",
                            )}
                          >
                            {alert.status}
                          </span>
                        ) : (
                          <ArrowRight className="size-3.5 shrink-0 text-muted-foreground" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* This week */}
              <div
                className={cn(
                  "soft-panel flex shrink-0 flex-col gap-2 px-3 py-3 shadow-none sm:px-4 sm:py-4 transition-all duration-500",
                  phase >= 3
                    ? "translate-y-0 opacity-100"
                    : "translate-y-3 opacity-0",
                )}
                style={{ transitionDelay: phase >= 3 ? "100ms" : "0ms" }}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="meta-label">This week</p>
                  <span className="text-[10px] text-muted-foreground">
                    Last 7 days
                  </span>
                </div>
                <div className="flex flex-col gap-1.5">
                  {weeklyProgress.map((row, index) => (
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
                            className="h-full rounded-full bg-primary/70 transition-all duration-700 ease-out"
                            style={{
                              width: phase >= 3 ? `${row.pct}%` : "0%",
                              transitionDelay:
                                phase >= 3 ? `${index * 120}ms` : "0ms",
                            }}
                          />
                        </div>
                      </div>
                      <span className="text-right text-xs font-semibold text-foreground">
                        {phase >= 3 ? row.value : 0}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Live activity indicator */}
              <div
                className={cn(
                  "flex shrink-0 items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 transition-all duration-500",
                  phase >= 4
                    ? "translate-y-0 opacity-100"
                    : "translate-y-2 opacity-0",
                )}
              >
                <span className="relative flex size-2">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary/60" />
                  <span className="relative inline-flex size-2 rounded-full bg-primary" />
                </span>
                <p className="truncate text-[10px] font-medium text-primary sm:text-[11px]">
                  Quote Q-1042 just viewed by Sarah Jenkins
                </p>
                <div className="ml-auto flex shrink-0 items-center gap-1 text-[9px] text-primary/70">
                  <Eye className="size-3" />
                  <span className="hidden sm:inline">Just now</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
