import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  FileText,
  Globe2,
  Inbox,
  type LucideIcon,
  MessageSquareText,
  Sparkles,
} from "lucide-react";

import { BrandMark } from "@/components/shared/brand-mark";
import {
  PublicHeroSurface,
  PublicPageShell,
} from "@/components/shared/public-page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "#product", label: "Product" },
  { href: "#dashboard", label: "Dashboard" },
  { href: "#workflow", label: "Workflow" },
] as const;

const heroHighlights = [
  {
    label: "Public intake",
    value: "Clean request page",
  },
  {
    label: "Quote tracking",
    value: "Draft to accepted",
  },
  {
    label: "AI assist",
    value: "Reply drafts",
  },
] as const;

const proofItems = [
  {
    title: "Owner-first workflow",
    description: "Built for the person handling the request, pricing, and follow-up.",
  },
  {
    title: "Public inquiry page",
    description: "Collect scope, files, and contact details without exposing private data.",
  },
  {
    title: "Tracked quotes",
    description: "Move from draft to sent to accepted without chasing documents.",
  },
  {
    title: "Practical AI drafts",
    description: "Use your knowledge and business context to write replies faster.",
  },
] as const;

const featureCards = [
  {
    icon: Globe2,
    title: "Capture better requests",
    description: "Collect scope, files, and timing up front.",
    points: ["Public form", "Uploads", "Structured fields"],
    featured: true,
  },
  {
    icon: Inbox,
    title: "Work from one queue",
    description: "Review new inquiries without digging through email.",
    points: ["New inquiries", "Need reply"],
  },
  {
    icon: FileText,
    title: "Track every quote",
    description: "Keep pricing, status, and customer response in one flow.",
    points: ["Draft to sent", "Customer response"],
  },
  {
    icon: Sparkles,
    title: "Write faster",
    description: "Draft practical replies using your workspace context.",
    points: ["Knowledge files", "Reply drafts"],
  },
] as const;

const showcasePanels = [
  {
    icon: Inbox,
    label: "Overview",
    title: "See what needs attention first.",
  },
  {
    icon: FileText,
    label: "Quote detail",
    title: "Keep scope, status, and customer response on one screen.",
  },
  {
    icon: Globe2,
    label: "Public pages",
    title: "Use one clean page for intake and one for quote response.",
  },
] as const;

const workflowSteps = [
  "Customer submits a request through the public inquiry page.",
  "You review the scope, organize the work, and draft the quote.",
  "The customer receives a clean quote page and responds from there.",
] as const;

const heroInboxItems = [
  {
    title: "Northline Cafe",
    subtitle: "Storefront signage refresh",
    status: "new",
  },
  {
    title: "Monarch Dental",
    subtitle: "Reception wall graphics",
    status: "quoted",
  },
  {
    title: "Harbor Studio",
    subtitle: "Window decal update",
    status: "waiting",
  },
] as const;

const heroQuoteItems = [
  {
    title: "RL-1042",
    subtitle: "Spring promo signage",
    status: "sent",
  },
  {
    title: "RL-1041",
    subtitle: "Vehicle wrap refresh",
    status: "draft",
  },
] as const;

export function MarketingHero() {
  return (
    <PublicPageShell
      brandSubtitle={null}
      headerAction={
        <>
          <Button asChild variant="ghost">
            <Link href="/login">Log in</Link>
          </Button>
          <Button asChild>
            <Link href="/signup">
              Start free
              <ArrowRight data-icon="inline-end" />
            </Link>
          </Button>
        </>
      }
      headerClassName="sticky top-0 z-40 rounded-none border-x-0 border-t-0 bg-background/92 px-0 py-4 shadow-none backdrop-blur-xl supports-backdrop-filter:bg-background/88 md:px-0"
      headerNav={
        <nav className="public-page-header-nav">
          {navItems.map((item) => (
            <Link className="public-page-header-link" href={item.href} key={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>
      }
    >
      <PublicHeroSurface className="overflow-visible rounded-none border-0 bg-transparent px-0 py-8 shadow-none lg:py-12">
        <div className="flex flex-col gap-10">
          <div className="mx-auto flex w-full max-w-4xl flex-col items-center gap-6 pt-2 text-center sm:pt-4">
            <Badge className="w-fit" variant="outline">
              Relay for small service businesses
            </Badge>

            <div className="flex flex-col items-center gap-4">
              <h1 className="max-w-4xl font-heading text-5xl font-semibold leading-[0.94] tracking-tight text-balance sm:text-6xl xl:text-[4.35rem]">
                Turn customer inquiries into clear, sent quotes.
              </h1>
              <p className="max-w-2xl text-base leading-8 text-muted-foreground sm:text-lg">
                Collect requests, draft pricing, and follow up from one calm
                workspace built for service businesses.
              </p>
            </div>

            <div className="flex flex-col items-center gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href="/signup">
                  Start free
                  <ArrowRight data-icon="inline-end" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="#dashboard">See the dashboard</Link>
              </Button>
            </div>

            <p className="text-sm leading-6 text-muted-foreground">
              Start with one owner workspace, a public inquiry page, and a quote
              workflow that stays easy to run.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-2.5">
              {heroHighlights.map((item) => (
                <HeroSignalPill key={item.label} label={item.label} value={item.value} />
              ))}
            </div>
          </div>

          <div className="mx-auto w-full max-w-6xl rounded-xl border border-border/70 bg-background/72 p-4 sm:p-5">
            <div className="overflow-hidden rounded-lg border border-border/65 bg-background/90">
              <div className="flex items-center justify-between gap-3 border-b border-border/70 px-4 py-3.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">
                    BrightSide Print Studio
                  </p>
                  <p className="text-xs text-muted-foreground">Owner dashboard</p>
                </div>
                <Badge
                  className="border-emerald-200/80 bg-emerald-50 text-emerald-700 dark:border-emerald-500/25 dark:bg-emerald-500/12 dark:text-emerald-200"
                  variant="secondary"
                >
                  Live workspace
                </Badge>
              </div>

              <div className="grid gap-4 p-4 sm:p-5">
                <div className="grid gap-3 sm:grid-cols-3">
                  <HeroPreviewMetric label="New today" value="4" />
                  <HeroPreviewMetric label="Ready to send" value="2" />
                  <HeroPreviewMetric label="Accepted" value="7" />
                </div>

                <div className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_17rem]">
                  <div className="overflow-hidden rounded-lg border border-border/65 bg-background/88">
                    <div className="flex items-center justify-between gap-3 border-b border-border/70 px-4 py-3">
                      <p className="text-sm font-semibold text-foreground">Inbox</p>
                      <span className="text-xs text-muted-foreground">Recent</span>
                    </div>
                    <div className="flex flex-col px-4">
                      {heroInboxItems.map((item, index) => (
                        <div key={item.title}>
                          <PreviewListRow
                            status={item.status}
                            subtitle={item.subtitle}
                            title={item.title}
                          />
                          {index < heroInboxItems.length - 1 ? (
                            <Separator className="bg-border/70" />
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-4">
                    <div className="rounded-lg border border-border/65 bg-background/88 px-4 py-4">
                      <p className="meta-label">Open quotes</p>
                      <div className="mt-3 flex flex-col gap-3">
                        {heroQuoteItems.map((item) => (
                          <div className="flex items-start justify-between gap-3" key={item.title}>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-foreground">
                                {item.title}
                              </p>
                              <p className="truncate text-xs text-muted-foreground">
                                {item.subtitle}
                              </p>
                            </div>
                            <PreviewStatusBadge status={item.status}>
                              {item.status}
                            </PreviewStatusBadge>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-lg border border-dashed border-border/65 bg-background/80 px-4 py-4">
                      <div className="flex items-start gap-3">
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                          <MessageSquareText className="size-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground">
                            AI draft ready
                          </p>
                          <p className="mt-1 text-sm leading-6 text-muted-foreground">
                            Thanks for the photos. We can quote two vinyl options and
                            confirm turnaround once measurements are finalized.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </PublicHeroSurface>

      <section className="marketing-proof-grid">
        {proofItems.map((item) => (
          <div className="soft-panel px-5 py-5" key={item.title}>
            <p className="text-sm font-semibold text-foreground">{item.title}</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {item.description}
            </p>
          </div>
        ))}
      </section>

      <section
        className="grid gap-6 xl:grid-cols-[18rem_minmax(0,1fr)] xl:items-start"
        id="product"
      >
        <div className="flex flex-col gap-3 xl:sticky xl:top-28">
          <Badge className="w-fit" variant="outline">
            Product
          </Badge>
          <h2 className="font-heading text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            Built around the actual owner workflow.
          </h2>
          <p className="text-sm leading-7 text-muted-foreground sm:text-base">
            Collect, organize, price, and follow up without bouncing between inboxes,
            docs, and spreadsheets.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {featureCards.map((feature) => (
            <MarketingFeatureCard
              className={cn("featured" in feature && feature.featured && "md:col-span-2")}
              description={feature.description}
              icon={feature.icon}
              key={feature.title}
              points={feature.points}
              title={feature.title}
            />
          ))}
        </div>
      </section>

      <section className="section-panel overflow-hidden" id="dashboard">
        <div className="marketing-showcase-grid">
          <div className="flex flex-col gap-5 px-5 py-5 sm:px-6 sm:py-6">
            <Badge className="w-fit" variant="outline">
              Dashboard
            </Badge>

            <div className="flex flex-col gap-3">
              <h2 className="font-heading text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
                See the important work first.
              </h2>
              <p className="text-sm leading-7 text-muted-foreground sm:text-base">
                Overview, inbox, and quote detail stay focused on what needs action.
              </p>
            </div>

            <div className="grid gap-3">
              {showcasePanels.map((item) => (
                <div className="soft-panel px-4 py-4" key={item.label}>
                  <div className="flex items-start gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                      <item.icon className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="meta-label">{item.label}</p>
                      <p className="mt-2 text-sm font-medium leading-6 text-foreground">
                        {item.title}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <Button asChild className="w-full sm:w-auto" variant="secondary">
              <Link href="/signup">Create workspace</Link>
            </Button>
          </div>

          <div className="border-t border-border/70 px-5 py-5 sm:px-6 sm:py-6 lg:border-t-0 lg:border-l">
            <div className="hero-panel p-4">
              <div className="soft-panel overflow-hidden">
                <div className="flex items-center justify-between gap-3 border-b border-border/70 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">Overview</Badge>
                    <Badge variant="ghost">Inquiries</Badge>
                    <Badge variant="ghost">Quotes</Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">Owner workspace</span>
                </div>

                <div className="grid gap-4 p-4">
                  <div className="grid gap-3 md:grid-cols-3">
                    <ShowcaseMetric
                      label="Need reply"
                      tone="blue"
                      value="3"
                    />
                    <ShowcaseMetric
                      label="Quote follow-up"
                      tone="green"
                      value="2"
                    />
                    <ShowcaseMetric
                      label="Win rate"
                      tone="neutral"
                      value="68%"
                    />
                  </div>

                  <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_18rem]">
                    <div className="section-panel overflow-hidden">
                      <div className="flex items-center justify-between gap-3 border-b border-border/70 px-4 py-3">
                        <p className="text-sm font-semibold text-foreground">
                          Work queue
                        </p>
                        <Link
                          className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                          href="/login"
                        >
                          View dashboard
                        </Link>
                      </div>
                      <div className="grid gap-4 px-4 py-4">
                        <div className="soft-panel px-4 py-4">
                          <p className="meta-label">Recent inquiries</p>
                          <div className="mt-3 flex flex-col gap-3">
                            <CompactQueueRow
                              meta="New inquiry"
                              title="Window graphics refresh"
                            />
                            <CompactQueueRow
                              meta="Needs reply"
                              title="Seasonal menu board update"
                            />
                          </div>
                        </div>

                        <div className="soft-panel px-4 py-4">
                          <p className="meta-label">Open quotes</p>
                          <div className="mt-3 flex flex-col gap-3">
                            <CompactQueueRow
                              meta="Sent"
                              title="Retail display package"
                            />
                            <CompactQueueRow
                              meta="Draft"
                              title="Fleet signage refresh"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-4">
                      <div className="soft-panel px-4 py-4">
                        <p className="meta-label">Quote</p>
                        <p className="mt-2 text-sm font-semibold text-foreground">
                          RL-1042 - Spring promo signage
                        </p>
                        <p className="mt-1 text-xs leading-6 text-muted-foreground">
                          Line items, totals, and status stay on one detail page.
                        </p>
                      </div>

                      <div className="soft-panel px-4 py-4">
                        <p className="meta-label">Customer response</p>
                        <p className="mt-2 text-sm font-semibold text-foreground">
                          Sent, viewed, and ready for follow-up.
                        </p>
                        <p className="mt-1 text-xs leading-6 text-muted-foreground">
                          Keep the next step clear without extra back-and-forth.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_23rem]"
        id="workflow"
      >
        <div className="section-panel px-5 py-5 sm:px-6 sm:py-6">
          <div className="flex flex-col gap-3">
            <Badge className="w-fit" variant="outline">
              Workflow
            </Badge>
            <h2 className="font-heading text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
              Three steps. No extra admin.
            </h2>
          </div>

          <div className="mt-6 grid gap-3">
            {workflowSteps.map((step, index) => (
              <WorkflowStep index={index + 1} key={step} step={step} />
            ))}
          </div>
        </div>

        <aside className="hero-panel px-5 py-5 sm:px-6 sm:py-6">
          <div className="flex h-full flex-col gap-5">
            <div className="flex flex-col gap-3">
              <Badge className="w-fit" variant="secondary">
                Start
              </Badge>
              <h3 className="font-heading text-2xl font-semibold tracking-tight text-balance">
                Launch one workspace and start collecting requests.
              </h3>
              <p className="text-sm leading-7 text-muted-foreground">
                Email/password auth, a public inquiry page, and quote tracking are
                ready from day one.
              </p>
            </div>

            <div className="grid gap-2 text-sm leading-6 text-foreground">
              {[
                "Protected owner dashboard",
                "Public intake scoped to each workspace",
                "Quote creation, sending, and response tracking",
              ].map((item) => (
                <div className="flex items-start gap-2.5" key={item}>
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span>{item}</span>
                </div>
              ))}
            </div>

            <div className="mt-auto flex flex-col gap-3">
              <Button asChild size="lg">
                <Link href="/signup">
                  Start free
                  <ArrowRight data-icon="inline-end" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/login">Log in</Link>
              </Button>
            </div>
          </div>
        </aside>
      </section>

      <section className="hero-panel overflow-hidden">
        <div className="flex flex-col gap-6 px-5 py-6 sm:px-6 sm:py-7 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-3">
            <Badge className="w-fit" variant="outline">
              Relay
            </Badge>
            <h2 className="font-heading text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
              Keep inquiries, quotes, and follow-up in one place.
            </h2>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/signup">
                Create workspace
                <ArrowRight data-icon="inline-end" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/login">Log in</Link>
            </Button>
          </div>
        </div>

        <Separator className="bg-border/70" />

        <div className="flex flex-col gap-4 px-5 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <BrandMark subtitle={null} />
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            {navItems.map((item) => (
              <Link className="transition-colors hover:text-foreground" href={item.href} key={item.href}>
                {item.label}
              </Link>
            ))}
            <Link className="transition-colors hover:text-foreground" href="/login">
              Log in
            </Link>
          </div>
        </div>
      </section>
    </PublicPageShell>
  );
}

function HeroSignalPill({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-border/75 bg-background/88 px-3.5 py-2 text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}

function HeroPreviewMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="info-tile px-4 py-4">
      <p className="meta-label">{label}</p>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
        {value}
      </p>
    </div>
  );
}

function PreviewListRow({
  title,
  subtitle,
  status,
}: {
  title: string;
  subtitle: string;
  status: "new" | "quoted" | "waiting";
}) {
  return (
    <div className="flex items-start justify-between gap-3 py-3.5 first:pt-3.5 last:pb-3.5">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-foreground">{title}</p>
        <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
      </div>
      <PreviewStatusBadge status={status}>{status}</PreviewStatusBadge>
    </div>
  );
}

function MarketingFeatureCard({
  icon: Icon,
  title,
  description,
  points,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  points: readonly string[];
  className?: string;
}) {
  return (
    <Card className={className} size="sm">
      <CardHeader className="gap-4">
        <div className="flex size-11 items-center justify-center rounded-xl border border-border/70 bg-accent/85 text-accent-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.34)]">
          <Icon className="size-4" />
        </div>
        <div className="flex flex-col gap-2">
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex flex-wrap gap-2">
          {points.map((point) => (
            <Badge className="h-7 px-3 text-[0.72rem]" key={point} variant="secondary">
              {point}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ShowcaseMetric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "blue" | "green" | "neutral";
}) {
  return (
    <div
      className={cn(
        "info-tile px-4 py-4",
        tone === "blue" && "bg-sky-50/70",
        tone === "green" && "bg-emerald-50/70",
      )}
    >
      <p className="meta-label">{label}</p>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
        {value}
      </p>
    </div>
  );
}

function CompactQueueRow({
  title,
  meta,
}: {
  title: string;
  meta: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <p className="text-sm font-medium text-foreground">{title}</p>
      <span className="shrink-0 text-[0.68rem] font-medium uppercase tracking-[0.12em] text-muted-foreground">
        {meta}
      </span>
    </div>
  );
}

function WorkflowStep({
  index,
  step,
}: {
  index: number;
  step: string;
}) {
  return (
    <div className="marketing-step">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground shadow-[0_10px_18px_-16px_rgba(0,128,96,0.45)]">
        {index}
      </div>
      <p className="text-sm leading-7 text-foreground">{step}</p>
    </div>
  );
}

function PreviewStatusBadge({
  status,
  children,
}: {
  status: "new" | "quoted" | "waiting" | "draft" | "sent";
  children: string;
}) {
  const className = {
    new: "border-sky-200/80 bg-sky-50 text-sky-700 dark:border-sky-500/25 dark:bg-sky-500/12 dark:text-sky-200",
    quoted:
      "border-violet-200/80 bg-violet-50 text-violet-700 dark:border-violet-500/25 dark:bg-violet-500/12 dark:text-violet-200",
    waiting:
      "border-amber-200/80 bg-amber-50 text-amber-700 dark:border-amber-500/25 dark:bg-amber-500/12 dark:text-amber-200",
    draft:
      "border-sky-200/80 bg-sky-50 text-sky-700 dark:border-sky-500/25 dark:bg-sky-500/12 dark:text-sky-200",
    sent:
      "border-emerald-200/80 bg-emerald-50 text-emerald-700 dark:border-emerald-500/25 dark:bg-emerald-500/12 dark:text-emerald-200",
  }[status];

  return (
    <Badge className={className} variant="secondary">
      {children}
    </Badge>
  );
}
