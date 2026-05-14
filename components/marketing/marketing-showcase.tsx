"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  ArrowRight,
  BarChart3,
  Bell,
  BellRing,
  ChevronRight,
  Clock3,
  Eye,
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
          // Stagger the animation phases
          const timers: ReturnType<typeof setTimeout>[] = [];
          timers.push(setTimeout(() => setPhase(1), 200));  // Stats appear
          timers.push(setTimeout(() => setPhase(2), 600));  // Alerts appear
          timers.push(setTimeout(() => setPhase(3), 1000)); // Progress bars fill
          timers.push(setTimeout(() => setPhase(4), 1400)); // Notification pulse
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
/*                            Component                                        */
/* -------------------------------------------------------------------------- */

export function MarketingShowcase() {
  const { phase, containerRef } = useShowcaseAnimation();

  return (
    <div className="mx-auto w-full max-w-6xl" ref={containerRef}>
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
                  <span className="truncate text-foreground">Dashboard</span>
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
                  className={cn(
                    "relative flex size-7 items-center justify-center rounded-md border border-border/70 bg-background/70 transition-all duration-300",
                    phase >= 4 && "ring-2 ring-primary/30 ring-offset-1",
                  )}
                >
                  <Bell className="size-3.5 text-muted-foreground" />
                  <span
                    className={cn(
                      "absolute right-1 top-1 size-1.5 rounded-full bg-primary transition-transform duration-300",
                      phase >= 4 ? "scale-100" : "scale-0",
                    )}
                  />
                </span>
              </div>
            </div>

            {/* Content — overflow is clipped by the frame; no scroll */}
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

              {/* Live activity indicator — appears last */}
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
