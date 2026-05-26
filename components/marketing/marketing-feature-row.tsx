import {
  BarChart3,
  Bell,
  BellRing,
  ClipboardList,
  ChevronsUpDown,
  FileText,
  FormInput,
  Home,
  Inbox,
  Lock,
  PanelLeft,
  Receipt,
  Search,
  Sparkles,
  Workflow,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type { LandingFeatureId } from "@/components/marketing/marketing-data";
import { MarketingFeatureMock } from "@/components/marketing/marketing-feature-mocks";
import { cn } from "@/lib/utils";

export function MarketingFeatureRow({
  title,
  description,
  previewTitle,
  previewDescription,
  featureId,
  reverse = false,
}: {
  title: string;
  description: string;
  previewTitle: string;
  previewDescription: string;
  featureId: LandingFeatureId;
  reverse?: boolean;
}) {
  return (
    <article
      className="[--page-gutter:1.25rem] overflow-x-clip py-5 sm:[--page-gutter:1.5rem] sm:py-7 lg:[--page-gutter:2rem] lg:py-8 xl:[--page-gutter:max(2rem,calc((100vw-72rem)/2))]"
      id={featureId}
    >
      <div className="grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-12">
        <div
          className={cn(
            "px-[var(--page-gutter)]",
            reverse
              ? "lg:order-2 lg:pl-10 lg:pr-[var(--page-gutter)]"
              : "lg:pl-[var(--page-gutter)] lg:pr-10",
          )}
        >
          <div
            className={cn(
              "flex w-full max-w-[28rem] flex-col gap-4",
              reverse ? "lg:ml-auto" : "lg:mr-auto",
            )}
          >
            <h3 className="font-heading text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
              {title}
            </h3>
            <p className="text-sm leading-normal sm:leading-7 text-muted-foreground sm:text-base">
              {description}
            </p>
          </div>
        </div>

        <div
          className={cn(
            "min-w-0 px-[var(--page-gutter)] lg:px-0",
            reverse && "lg:order-1",
          )}
        >
          <MarketingFeaturePreview
            description={previewDescription}
            featureId={featureId}
            reverse={reverse}
            title={previewTitle}
          />
        </div>
      </div>
    </article>
  );
}

type PreviewNavItem = {
  key: string;
  label: string;
  icon: LucideIcon;
  featureId?: LandingFeatureId;
};

const previewNavItems: readonly PreviewNavItem[] = [
  { key: "home", label: "Home", icon: Home },
  { key: "inquiries", label: "Inquiries", icon: Inbox, featureId: "inquiries" },
  { key: "quotes", label: "Quotes", icon: FileText, featureId: "quotes" },
  { key: "follow-ups", label: "Follow-ups", icon: BellRing },
  { key: "jobs", label: "Jobs", icon: ClipboardList, featureId: "jobs" },
  { key: "invoices", label: "Invoices", icon: Receipt },
  { key: "automations", label: "Automations", icon: Workflow },
  { key: "forms", label: "Forms", icon: FormInput },
  { key: "analytics", label: "Analytics", icon: BarChart3, featureId: "analytics" },
];

const featurePageTitle: Record<LandingFeatureId, string> = {
  inquiries: "Inquiries",
  quotes: "Quotes",
  jobs: "Jobs",
  ai: "AI Assistant",
  analytics: "Analytics",
};

function MarketingFeaturePreview({
  featureId,
  title,
  reverse = false,
}: {
  featureId: LandingFeatureId;
  title: string;
  description: string;
  reverse?: boolean;
}) {
  const pageTitle = featurePageTitle[featureId];
  const activeNavKey = featureId === "ai" ? "home" : featureId === "jobs" ? "jobs" : featureId;

  return (
    <div
      aria-label={`Preview of ${title}`}
      className={cn(
        "relative w-full overflow-hidden rounded-xl border border-border/70 bg-background ring-1 ring-border/30 ring-offset-2 ring-offset-background shadow-[0_20px_60px_rgba(0,0,0,0.1),0_4px_16px_rgba(0,0,0,0.05)] dark:border-white/10 dark:ring-white/5 dark:shadow-[0_20px_60px_rgba(0,0,0,0.5)]",
        reverse
          ? "lg:rounded-l-none lg:border-l-0 lg:ring-l-0"
          : "lg:rounded-r-none lg:border-r-0 lg:ring-r-0",
      )}
      role="img"
    >
      {/* Browser chrome */}
      <div className="flex h-7 shrink-0 items-center gap-3 border-b border-border/40 bg-muted/20 px-3 sm:h-8">
        <div aria-hidden="true" className="flex items-center gap-1.5">
          <span className="size-[8px] rounded-full bg-[#ff5f57]" />
          <span className="size-[8px] rounded-full bg-[#febc2e]" />
          <span className="size-[8px] rounded-full bg-[#28c840]" />
        </div>
        <div className="mx-auto flex h-4 max-w-xs flex-1 items-center gap-1.5 rounded-md border border-border/40 bg-background/50 px-2 text-[9px] text-muted-foreground sm:h-5 sm:text-[10px]">
          <Lock className="size-2 text-muted-foreground/60 sm:size-2.5" />
          <span className="truncate font-mono">
            app.requo.com/brightside/{activeNavKey === "home" ? "home" : activeNavKey}
          </span>
        </div>
        <span aria-hidden="true" className="hidden w-6 sm:block" />
      </div>

      <div className="flex h-[30rem] min-h-0 sm:h-[32rem] lg:h-[28rem] xl:h-[30rem]">
        {/* Sidebar */}
        <aside
          aria-hidden="true"
          className="hidden w-[11rem] shrink-0 flex-col border-r border-border/50 bg-sidebar sm:flex lg:w-[12rem]"
        >
          {/* Business switcher */}
          <div className="px-2 py-2.5">
            <div className="w-full rounded-lg border border-sidebar-border/70 bg-background/80 p-2 text-left shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:border-white/6 dark:bg-card/70">
              <div className="flex items-center gap-2">
                <div className="flex size-6 shrink-0 items-center justify-center rounded-md border border-sidebar-border/70 bg-muted/50 text-[8px] font-semibold uppercase tracking-wider text-sidebar-foreground/80 dark:border-white/6">
                  BS
                </div>
                <div className="min-w-0 flex-1 leading-tight">
                  <p className="truncate text-[11px] font-semibold text-sidebar-foreground">
                    BrightSide
                  </p>
                </div>
                <ChevronsUpDown className="size-3 shrink-0 text-muted-foreground/60" />
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex-1 overflow-hidden px-2 pb-2">
            <div className="flex flex-col gap-px pt-1">
              {previewNavItems.map((item) => {
                const Icon = item.icon;
                const isActive =
                  item.featureId === featureId ||
                  (featureId === "ai" && item.key === "home");
                return (
                  <div
                    className={cn(
                      "flex min-h-7 w-full items-center gap-2 rounded-md px-2 py-1 text-left text-[11px] font-medium",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground",
                    )}
                    key={item.key}
                  >
                    <Icon
                      className={cn(
                        "size-3 shrink-0",
                        isActive ? "text-primary" : "text-muted-foreground/70",
                      )}
                    />
                    <span className="truncate">{item.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </aside>

        {/* Main content */}
        <div className="flex min-w-0 flex-1 flex-col bg-background">
          {/* Top bar */}
          <div className="flex min-h-9 shrink-0 items-center gap-2 border-b border-border/50 bg-background/95 px-3 py-1.5 sm:px-4 sm:py-2">
            <button
              type="button"
              className="flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground/70 sm:hidden"
              tabIndex={-1}
            >
              <PanelLeft className="size-3" />
            </button>
            <div className="min-w-0 flex-1">
              <nav className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{pageTitle}</span>
              </nav>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <span
                aria-hidden="true"
                className="hidden items-center gap-1.5 rounded-md border border-border/50 bg-muted/15 px-2 py-1 text-[10px] text-muted-foreground md:inline-flex"
              >
                <Search className="size-2.5" />
                <span>Search...</span>
                <kbd className="ml-2 rounded border border-border/50 bg-background/60 px-1 py-0.5 font-mono text-[8px]">
                  ⌘K
                </kbd>
              </span>
              <span className="flex size-6 items-center justify-center rounded-md text-muted-foreground">
                <Sparkles className="size-3" />
              </span>
              <span className="flex size-6 items-center justify-center rounded-md text-muted-foreground">
                <Bell className="size-3" />
              </span>
            </div>
          </div>

          {/* Feature content */}
          <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-5 sm:py-5">
            <MarketingFeatureMock featureId={featureId} />
          </div>
        </div>
      </div>
    </div>
  );
}
