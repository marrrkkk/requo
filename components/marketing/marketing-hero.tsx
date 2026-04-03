import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  FileText,
  MessageSquareText,
  Sparkles,
} from "lucide-react";

import {
  PublicHeroSurface,
  PublicPageShell,
} from "@/components/shared/public-page-shell";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const benefits = [
  {
    icon: ClipboardList,
    title: "Structured intake",
    description: "Collect service details, timing, budget notes, and reference files in one flow.",
  },
  {
    icon: FileText,
    title: "Quote workspace",
    description: "Turn inquiries into tracked quotes without jumping between tabs and documents.",
  },
  {
    icon: Sparkles,
    title: "Practical AI drafts",
    description: "Generate customer-ready replies and quote guidance using your workspace context.",
  },
];

const workflow = [
  "Customer submits a scoped request",
  "Owner reviews, clarifies, and organizes the inquiry",
  "QuoteFlow helps draft the quote and next reply",
];

export function MarketingHero() {
  return (
    <PublicPageShell
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
    >
      <PublicHeroSurface className="lg:py-12">
        <div className="grid gap-10 xl:grid-cols-[minmax(0,1.05fr)_30rem] xl:items-center">
          <div className="flex flex-col gap-6">
            <span className="eyebrow">QuoteFlow for small service businesses</span>
            <div className="flex flex-col gap-4">
              <h1 className="max-w-4xl font-heading text-5xl font-semibold leading-[0.95] tracking-tight text-balance sm:text-6xl">
                A cleaner SaaS workspace for inquiries, quotes, and reply drafting.
              </h1>
              <p className="max-w-2xl text-base leading-8 text-muted-foreground sm:text-lg">
                Keep customer requests, quote prep, public forms, and AI-assisted
                follow-up in one consistent system instead of scattered inboxes and
                documents.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/signup">
                  Create workspace
                  <ArrowRight data-icon="inline-end" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/login">Open demo account</Link>
              </Button>
            </div>

            <p className="text-sm leading-6 text-muted-foreground">
              Start with one owner workspace, a public intake page, and a practical
              quote workflow that stays easy to run.
            </p>

            <div className="grid gap-3 sm:grid-cols-3">
              {[
                ["Owner-first", "Built for fast solo workflows"],
                ["Public forms", "Safe intake without exposing private data"],
                ["Better replies", "Use business context to draft faster"],
              ].map(([title, description]) => (
                <div
                  className="rounded-2xl border border-border/80 bg-background/70 p-4"
                  key={title}
                >
                  <p className="text-sm font-semibold text-foreground">{title}</p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-border/80 bg-background/80 p-4 shadow-sm xl:self-stretch">
            <div className="rounded-[1.35rem] border border-border/80 bg-card">
              <div className="flex items-center justify-between border-b border-border/80 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    BrightSide Print Studio
                  </p>
                  <p className="text-xs text-muted-foreground">Owner dashboard preview</p>
                </div>
                <span className="rounded-md bg-accent px-2 py-1 text-xs font-medium text-accent-foreground">
                  Live workspace
                </span>
              </div>

              <div className="grid gap-4 p-4">
                <div className="grid gap-3 sm:grid-cols-3">
                  <PreviewMetric label="New inquiries" value="18" />
                  <PreviewMetric label="Draft quotes" value="6" />
                  <PreviewMetric label="Accepted" value="4" />
                </div>

                <div className="grid gap-3">
                  <PreviewRow
                    badge="Needs review"
                    subtitle="Taylor Nguyen | New inquiry"
                    title="Window graphics refresh"
                  />
                  <PreviewRow
                    badge="Awaiting reply"
                    subtitle="Quote QF-1008 | Sent"
                    title="Foundry Labs booth kit"
                  />
                  <PreviewRow
                    badge="Workspace context used"
                    subtitle="Suggested follow-up and line items"
                    title="AI draft ready"
                  />
                </div>

                <div className="rounded-2xl border border-dashed border-border/80 bg-muted/25 p-4">
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-accent p-2 text-accent-foreground">
                      <MessageSquareText className="size-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        AI assistant suggested the next customer reply.
                      </p>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        &quot;Thanks for sharing the storefront photos. We can prepare
                        two vinyl options and confirm turnaround once dimensions are
                        finalized.&quot;
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </PublicHeroSurface>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {benefits.map((benefit) => {
          const Icon = benefit.icon;

          return (
            <Card key={benefit.title}>
              <CardHeader className="gap-4">
                <div className="flex size-11 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                  <Icon className="size-4" />
                </div>
                <div className="flex flex-col gap-2">
                  <CardTitle>{benefit.title}</CardTitle>
                  <CardDescription>{benefit.description}</CardDescription>
                </div>
              </CardHeader>
            </Card>
          );
        })}
      </section>

      <section className="section-panel px-5 py-6 sm:px-8">
        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div className="flex flex-col gap-3">
            <span className="eyebrow">How it flows</span>
            <h2 className="font-heading text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
              One calm workflow from customer request to accepted quote.
            </h2>
            <p className="text-sm leading-7 text-muted-foreground sm:text-base">
              QuoteFlow stays intentionally lightweight for MVP teams: a strong
              intake surface, a clean owner dashboard, and enough AI support to
              reduce repetitive writing.
            </p>
          </div>

          <div className="grid gap-3">
            {workflow.map((step, index) => (
              <div
                className="flex items-start gap-4 rounded-2xl border border-border/80 bg-background/70 px-4 py-4"
                key={step}
              >
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground">
                  {index + 1}
                </div>
                <p className="text-sm leading-7 text-foreground">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section-panel px-5 py-6 sm:px-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-3">
            <span className="eyebrow">Ready to start</span>
            <h2 className="font-heading text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
              Launch one workspace and keep the owner workflow tight.
            </h2>
            <div className="flex flex-col gap-2 text-sm leading-6 text-muted-foreground">
              {[
                "Email/password auth with protected app routes",
                "Public inquiry intake scoped to each workspace",
                "Quote creation, tracking, and customer response pages",
              ].map((item) => (
                <div className="flex items-start gap-2" key={item}>
                  <CheckCircle2 className="mt-0.5 size-4 text-primary" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <Button asChild size="lg">
            <Link href="/signup">
              Start free
              <ArrowRight data-icon="inline-end" />
            </Link>
          </Button>
        </div>
      </section>
    </PublicPageShell>
  );
}

function PreviewMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/80 bg-background/80 p-4">
      <p className="meta-label">{label}</p>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
        {value}
      </p>
    </div>
  );
}

function PreviewRow({
  badge,
  subtitle,
  title,
}: {
  badge: string;
  subtitle: string;
  title: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border border-border/80 bg-background/80 px-4 py-4">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-foreground">{title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
      </div>
      <span className="rounded-md border border-border/80 bg-secondary px-2 py-1 text-xs text-secondary-foreground">
        {badge}
      </span>
    </div>
  );
}
