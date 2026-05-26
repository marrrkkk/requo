"use client";

import { useEffect, useRef, useState } from "react";
import {
  BellRing,
  ChevronsUpDown,
  FileText,
  Home,
  Inbox,
  BarChart3,
  FormInput,
  Lock,
  PanelLeft,
  Search,
  Sparkles,
  Bell,
  CheckCircle,
  ArrowRight,
  Send,
  ClipboardList,
  Receipt,
  Workflow,
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
  { key: "home", label: "Home", icon: Home, active: true },
  { key: "inquiries", label: "Inquiries", icon: Inbox },
  { key: "quotes", label: "Quotes", icon: FileText },
  { key: "follow-ups", label: "Follow-ups", icon: BellRing },
  { key: "jobs", label: "Jobs", icon: ClipboardList },
  { key: "invoices", label: "Invoices", icon: Receipt },
  { key: "automations", label: "Automations", icon: Workflow },
  { key: "forms", label: "Forms", icon: FormInput },
  { key: "analytics", label: "Analytics", icon: BarChart3 },
];

type AttentionItem = {
  tone: "urgent" | "normal" | "positive";
  icon: LucideIcon;
  label: string;
  title: string;
  description: string;
  meta: string;
};

const attentionItems: readonly AttentionItem[] = [
  {
    tone: "urgent",
    icon: BellRing,
    label: "Overdue follow-up",
    title: "Kitchen remodel follow-up",
    description: "Sarah Jenkins · No reply in 3 days",
    meta: "Due May 22",
  },
  {
    tone: "urgent",
    icon: FileText,
    label: "Quote expiring",
    title: "Studio fit-out",
    description: "Maya Fields · $6,200",
    meta: "Expires tomorrow",
  },
  {
    tone: "normal",
    icon: Inbox,
    label: "New inquiry",
    title: "Leo Park",
    description: "Tile repair · Bathroom regrout",
    meta: "9:02 AM",
  },
  {
    tone: "normal",
    icon: BellRing,
    label: "Due today",
    title: "Deck staining check-in",
    description: "Carlos Rivera · Quote viewed",
    meta: "Due today",
  },
  {
    tone: "positive",
    icon: CheckCircle,
    label: "Accepted",
    title: "Office painting Q-1038",
    description: "Brightwork Co · $3,400",
    meta: "Accepted May 24",
  },
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
      {/* Laptop frame — thin bezel using border + ring */}
      <div
        aria-label="Preview of the Requo dashboard"
        className="relative w-full overflow-hidden rounded-xl border border-border/70 bg-background ring-1 ring-border/30 ring-offset-2 ring-offset-background shadow-[0_20px_60px_rgba(0,0,0,0.1),0_4px_16px_rgba(0,0,0,0.05)] dark:border-white/10 dark:ring-white/5 dark:shadow-[0_20px_60px_rgba(0,0,0,0.5)]"
        role="img"
      >
        {/* Browser chrome */}
        <div className="flex h-8 shrink-0 items-center gap-3 border-b border-border/40 bg-muted/20 px-3.5 sm:h-9">
          <div aria-hidden="true" className="flex items-center gap-1.5">
            <span className="size-[9px] rounded-full bg-[#ff5f57]" />
            <span className="size-[9px] rounded-full bg-[#febc2e]" />
            <span className="size-[9px] rounded-full bg-[#28c840]" />
          </div>
          <div className="mx-auto flex h-5 max-w-xs flex-1 items-center gap-1.5 rounded-md border border-border/40 bg-background/50 px-2.5 text-[10px] text-muted-foreground">
            <Lock className="size-2.5 text-muted-foreground/60" />
            <span className="truncate font-mono">
              app.requo.com/brightside/home
            </span>
          </div>
          <span aria-hidden="true" className="hidden w-8 sm:block" />
        </div>

        <div className="flex h-[30rem] min-h-0 sm:h-[32rem] lg:h-[34rem]">
          {/* ─── Sidebar ─── */}
          <aside
            aria-hidden="true"
            className="flex w-14 shrink-0 flex-col border-r border-border/50 bg-sidebar sm:w-[16rem]"
          >
            {/* Sidebar Header */}
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

            <div className="mx-2.5 h-px bg-border/40" />

            {/* Business Switcher */}
            <div className="hidden px-3 py-2.5 sm:block">
              <div className="w-full rounded-xl border border-sidebar-border/70 bg-background/80 p-3 text-left shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:border-white/6 dark:bg-card/70">
                <div className="flex items-center gap-3">
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

            {/* Navigation */}
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

            <div className="mx-2.5 h-px bg-border/50" />

            {/* User footer */}
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

          {/* ─── Main Content ─── */}
          <div className="flex min-w-0 flex-1 flex-col bg-background">
            {/* Top bar */}
            <div className="sticky top-0 z-30 border-b border-border/50 bg-background/95 backdrop-blur-sm">
              <div className="flex min-h-10 items-center gap-2 px-3 py-2 sm:px-5 sm:py-3 md:gap-2.5">
                <button
                  type="button"
                  className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground/70"
                  tabIndex={-1}
                >
                  <PanelLeft className="size-3.5" />
                </button>
                <span aria-hidden="true" className="hidden h-4 w-px shrink-0 self-center bg-border md:block" />
                <div className="hidden min-w-0 flex-1 md:block">
                  <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">Home</span>
                  </nav>
                </div>
                <div className="min-w-0 flex-1 md:hidden">
                  <p className="truncate font-heading text-base font-semibold tracking-tight text-foreground">
                    Home
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <span
                    aria-hidden="true"
                    className="hidden items-center gap-1.5 rounded-md border border-border/50 bg-muted/15 px-2.5 py-1.5 text-[11px] text-muted-foreground md:inline-flex lg:w-72"
                  >
                    <Search className="size-3" />
                    <span>Search quotes, inquiries...</span>
                    <kbd className="ml-auto rounded border border-border/50 bg-background/60 px-1.5 py-0.5 font-mono text-[9px]">⌘K</kbd>
                  </span>
                  <span className="relative flex size-8 items-center justify-center rounded-md text-muted-foreground">
                    <Bell className="size-3.5" />
                  </span>
                </div>
              </div>
            </div>

            {/* Home content — centered like the real page */}
            <div className="flex min-h-0 flex-1 flex-col items-center overflow-hidden px-4 py-6 sm:px-6 sm:py-8">
              <div className="flex w-full max-w-md flex-col gap-5">
                {/* Greeting */}
                <div
                  className={cn(
                    "flex flex-col gap-1 transition-all duration-500",
                    phase >= 1
                      ? "translate-y-0 opacity-100"
                      : "translate-y-2 opacity-0",
                  )}
                >
                  <h1 className="font-heading text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                    Good morning, Jamie
                  </h1>
                  <p className="text-xs text-muted-foreground sm:text-sm">
                    2 new inquiries · 1 follow-up due · 3 quotes sent this week
                  </p>
                </div>

                {/* AI Chat Input */}
                <div
                  className={cn(
                    "transition-all duration-500",
                    phase >= 1
                      ? "translate-y-0 opacity-100"
                      : "translate-y-2 opacity-0",
                  )}
                  style={{ transitionDelay: phase >= 1 ? "100ms" : "0ms" }}
                >
                  <div className="flex items-center gap-2 rounded-xl border border-border/70 bg-muted/20 px-3.5 py-2.5 shadow-sm">
                    <Sparkles className="size-3.5 shrink-0 text-muted-foreground/60" />
                    <span className="flex-1 text-[11px] text-muted-foreground sm:text-xs">
                      Ask anything about your business...
                    </span>
                    <span className="flex size-6 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <Send className="size-3" />
                    </span>
                  </div>
                </div>

                {/* Needs attention header */}
                <div
                  className={cn(
                    "flex items-center justify-between transition-all duration-500",
                    phase >= 2
                      ? "translate-y-0 opacity-100"
                      : "translate-y-2 opacity-0",
                  )}
                >
                  <h2 className="text-sm font-semibold text-foreground">
                    Needs attention
                  </h2>
                  <Badge variant="secondary" className="text-[10px]">
                    {attentionItems.length} open
                  </Badge>
                </div>

                {/* Attention items list */}
                <div className="flex flex-col gap-1">
                  {attentionItems.map((item, index) => {
                    const Icon = item.icon;
                    return (
                      <div
                        className={cn(
                          "flex items-center gap-2.5 rounded-lg px-2.5 py-2 transition-all duration-400",
                          "hover:bg-muted/30",
                          phase >= 2
                            ? "translate-y-0 opacity-100"
                            : "translate-y-2 opacity-0",
                        )}
                        key={index}
                        style={{
                          transitionDelay:
                            phase >= 2 ? `${index * 80 + 100}ms` : "0ms",
                        }}
                      >
                        <span
                          className={cn(
                            "flex size-1.5 shrink-0 rounded-full",
                            item.tone === "urgent" && "bg-destructive",
                            item.tone === "normal" && "bg-primary",
                            item.tone === "positive" && "bg-emerald-500",
                          )}
                        />
                        <Icon
                          className={cn(
                            "size-3.5 shrink-0",
                            item.tone === "urgent" && "text-destructive/70",
                            item.tone === "normal" && "text-muted-foreground",
                            item.tone === "positive" && "text-emerald-500/70",
                          )}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[11px] font-medium text-foreground sm:text-xs">
                            {item.title}
                          </p>
                          <p className="truncate text-[10px] text-muted-foreground">
                            {item.description}
                          </p>
                        </div>
                        <span className="hidden shrink-0 text-[10px] text-muted-foreground sm:block">
                          {item.meta}
                        </span>
                        <ArrowRight className="size-3 shrink-0 text-muted-foreground/40" />
                      </div>
                    );
                  })}
                </div>

                {/* Live activity */}
                <div
                  className={cn(
                    "flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 transition-all duration-500",
                    phase >= 3
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
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
