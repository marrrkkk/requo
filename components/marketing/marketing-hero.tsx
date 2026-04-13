import Link from "next/link";
import { Suspense } from "react";
import {
  ArrowRight,
  CheckCircle2,
  FileText,
  Globe2,
  Inbox,
  MessageSquareText,
  Sparkles,
  Upload,
} from "lucide-react";

import { BrandMark } from "@/components/shared/brand-mark";
import { workspacesHubPath } from "@/features/workspaces/routes";
import { getCurrentUser } from "@/lib/auth/session";
import {
  PublicHeroSurface,
  PublicPageShell,
} from "@/components/shared/public-page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  audienceSegments,
  faqItems,
  featureFormFields,
  featureFormUploads,
  featureKnowledgeItems,
  featureQueueItems,
  featureSummaryItems,
  heroDetails,
  heroSignals,
  inquiryChecklist,
  navItems,
  proofItems,
  quoteLineItems,
  replyDraftLines,
  whyAfterItems,
  whyBeforeItems,
  whyOutcomeSignals,
  whyRequoCards,
  workflowSteps,
  workflowSummary,
} from "@/components/marketing/marketing-data";
import {
  FaqItem,
  HeroDetail,
  HeroSignalPill,
  QueueSignal,
  StatusBadge,
  WorkflowStep,
} from "@/components/marketing/marketing-parts";
import { MarketingMobileNav } from "@/components/marketing/marketing-mobile-nav";

export function MarketingHero() {
  return (
    <PublicPageShell
      brandSubtitle={null}
      className="pb-14 lg:pb-20"
      headerAction={
        <Suspense fallback={<MarketingSignedOutHeaderActions />}>
          <MarketingHeaderActions />
        </Suspense>
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
      <PublicHeroSurface className="surface-grid overflow-hidden px-5 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8 xl:px-10 xl:py-10">
        <div className="flex flex-col gap-8 lg:gap-10">
          <div className="mx-auto flex w-full max-w-4xl flex-col items-center gap-6 text-center">
            <div className="flex flex-col items-center gap-4">
              <Badge className="w-fit" variant="outline">
                Owner-led service workflow software
              </Badge>

              <div className="flex flex-col items-center gap-4">
                <h1 className="max-w-4xl font-heading text-4xl font-semibold leading-[0.94] tracking-tight text-balance sm:text-6xl xl:text-[4.2rem]">
                  Capture inquiries, qualify leads, send quotes, and follow up.
                </h1>
                <p className="max-w-2xl text-base leading-8 text-muted-foreground sm:text-lg">
                  Requo gives owner-led service businesses one calm place to
                  collect inbound requests, review fit, send professional quotes,
                  and keep follow-up moving.
                </p>
              </div>
            </div>

            <div className="flex w-full max-w-sm flex-col gap-3 sm:w-auto sm:max-w-none sm:flex-row">
              <Button asChild className="w-full sm:w-auto" size="lg">
                <Link href="/signup">
                  Start free
                  <ArrowRight data-icon="inline-end" />
                </Link>
              </Button>
              <Button asChild className="w-full sm:w-auto" size="lg" variant="outline">
                <Link href="#how-it-works">Request a demo</Link>
              </Button>
            </div>

            <div className="flex flex-col items-center gap-3">
              <p className="text-sm font-medium text-foreground">
                Works well for owner-led service businesses like:
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2.5">
                {audienceSegments.map((segment) => (
                  <Badge className="h-8 px-3 text-[0.72rem]" key={segment} variant="secondary">
                    {segment}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="grid w-full gap-3 md:grid-cols-3">
              {heroSignals.map((item) => (
                <HeroSignalPill key={item.label} label={item.label} value={item.value} />
              ))}
            </div>
          </div>

          <div className="hero-panel mx-auto w-full max-w-6xl overflow-hidden p-4 sm:p-5">
            <div className="grid gap-4">
              <div className="flex flex-col items-start gap-3 rounded-lg border border-border/70 bg-background/82 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">
                    BrightSide Print Studio
                  </p>
                  <p className="text-xs text-muted-foreground">Sample inquiry-to-quote workflow</p>
                </div>
                <Badge variant="secondary">Capture to follow-up</Badge>
              </div>

              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_15rem]">
                <div className="soft-panel overflow-hidden">
                  <div className="flex flex-col items-start gap-3 border-b border-border/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex size-8 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                        <Inbox className="size-4" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">New inquiry</p>
                        <p className="text-xs text-muted-foreground">
                          Window graphics refresh
                        </p>
                      </div>
                    </div>
                    <StatusBadge tone="new">Needs review</StatusBadge>
                  </div>

                  <div className="grid gap-4 px-4 py-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                      {heroDetails.map((item) => (
                        <HeroDetail
                          icon={item.icon}
                          key={item.label}
                          label={item.label}
                          value={item.value}
                        />
                      ))}
                    </div>

                    <div className="grid gap-2.5">
                      {inquiryChecklist.map((item) => (
                        <div className="flex items-start gap-2.5 text-sm leading-6 text-foreground" key={item}>
                          <CheckCircle2 className="mt-1 size-4 shrink-0 text-primary" />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-4">
                  <div className="info-tile px-4 py-4">
                    <p className="meta-label">Owner queue</p>
                    <div className="mt-3 grid gap-2">
                      <QueueSignal label="Needs qualification" tone="new" />
                      <QueueSignal label="Quote in progress" tone="draft" />
                      <QueueSignal label="Follow up due" tone="waiting" />
                    </div>
                  </div>

                  <div className="soft-panel px-4 py-4">
                    <div className="flex items-start gap-3">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                        <Sparkles className="size-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground">
                          AI draft ready
                        </p>
                        <div className="mt-2 grid gap-1.5">
                          {replyDraftLines.map((line) => (
                            <p className="text-sm leading-6 text-muted-foreground" key={line}>
                              {line}
                            </p>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="section-panel overflow-hidden">
                <div className="flex flex-col items-start gap-3 border-b border-border/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Quote ready</p>
                    <p className="text-xs text-muted-foreground">
                      Spring storefront update
                    </p>
                  </div>
                  <StatusBadge tone="sent">Ready to send</StatusBadge>
                </div>

                <div className="grid gap-4 px-4 py-4 sm:grid-cols-[minmax(0,1fr)_14rem]">
                  <div className="grid gap-3">
                    {quoteLineItems.map((item) => (
                      <div
                        className="flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-background/82 px-3.5 py-3"
                        key={item.label}
                      >
                        <span className="text-sm text-muted-foreground">{item.label}</span>
                        <span className="text-sm font-medium text-foreground">{item.value}</span>
                      </div>
                    ))}
                  </div>

                  <div className="soft-panel px-4 py-4">
                    <p className="meta-label">Customer view</p>
                    <p className="mt-2 text-sm font-semibold text-foreground">
                      Clean quote page
                    </p>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      Send the quote once and keep response plus follow-up in the same flow.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </PublicHeroSurface>

      <section className="marketing-proof-grid">
        {proofItems.map((item) => (
          <div className="marketing-proof-card" key={item.title}>
            <p className="text-sm font-semibold text-foreground">{item.title}</p>
            <p className="text-sm leading-6 text-muted-foreground">{item.description}</p>
          </div>
        ))}
      </section>

      <section className="marketing-section-grid" id="why-requo">
        <div className="section-panel overflow-hidden xl:col-span-2">
          <div className="flex flex-col gap-3 border-b border-border/70 px-5 py-5 sm:px-6 sm:py-6">
            <Badge className="w-fit" variant="outline">
              Why Requo
            </Badge>
            <h2 className="font-heading text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
              Most of the admin happens before pricing is even ready.
            </h2>
            <p className="max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base">
              Requo is built for the messy middle between a new inquiry and a
              sent quote. It turns scattered lead admin into one clearer
              workflow.
            </p>
          </div>

          <div className="grid gap-5 px-5 py-5 sm:px-6 sm:py-6 xl:grid-cols-[minmax(0,1.05fr)_0.95fr]">
            <div className="hero-panel overflow-hidden">
              <div className="grid gap-px bg-border/70 lg:grid-cols-2">
                <div className="flex flex-col gap-5 bg-background/75 px-5 py-5">
                  <div className="flex flex-col gap-2">
                    <p className="meta-label">Without Requo</p>
                    <p className="text-lg font-semibold tracking-tight text-foreground">
                      The work is there, but the lead context is scattered.
                    </p>
                  </div>

                  <div className="grid gap-3">
                    {whyBeforeItems.map((item) => (
                      <div className="soft-panel px-4 py-4" key={item}>
                        <p className="text-sm leading-6 text-foreground">{item}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-5 bg-accent/25 px-5 py-5">
                  <div className="flex flex-col gap-2">
                    <p className="meta-label">With Requo</p>
                    <p className="text-lg font-semibold tracking-tight text-foreground">
                      The inquiry, quote, and next step stay connected.
                    </p>
                  </div>

                  <div className="grid gap-3">
                    {whyAfterItems.map((item) => (
                      <div className="rounded-lg border border-primary/15 bg-background/84 px-4 py-4 shadow-[var(--surface-shadow-sm)]" key={item}>
                        <div className="flex items-start gap-2.5">
                          <CheckCircle2 className="mt-1 size-4 shrink-0 text-primary" />
                          <p className="text-sm leading-6 text-foreground">{item}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {whyOutcomeSignals.map((item) => (
                      <Badge className="h-8 px-3" key={item} variant="secondary">
                        {item}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-4">
              {whyRequoCards.map((item) => (
                <div className="marketing-proof-card" key={item.title}>
                  <div className="flex items-start gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                      <item.icon className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">{item.title}</p>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        {item.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}

              <div className="soft-panel px-5 py-5">
                <p className="meta-label">The point</p>
                <p className="mt-2 text-base font-semibold tracking-tight text-foreground">
                  Requo helps the owner spend less time rebuilding lead context
                  and more time qualifying, quoting, and following through.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section-panel overflow-hidden" id="features">
        <div className="flex flex-col gap-3 border-b border-border/70 px-5 py-5 sm:px-6 sm:py-6">
          <Badge className="w-fit" variant="outline">
            Features
          </Badge>
          <h2 className="font-heading text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            Features built around the shared workflow.
          </h2>
          <p className="max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base">
            Requo is easier to understand when the product is shown doing the
            work: capturing the inquiry, qualifying the lead, preparing the
            quote, and supporting the next follow-up.
          </p>
        </div>

        <div className="marketing-proof-grid border-b border-border/70 px-5 py-5 sm:px-6 sm:py-6">
          {featureSummaryItems.map((item) => (
            <div className="marketing-proof-card" key={item.title}>
              <div className="flex items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                  <item.icon className="size-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">{item.title}</p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid gap-4 px-5 py-5 sm:px-6 sm:py-6 lg:grid-cols-2">
          <div className="soft-panel overflow-hidden">
            <div className="flex flex-col items-start gap-3 border-b border-border/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                  <Globe2 className="size-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Public inquiry form</p>
                  <p className="text-xs text-muted-foreground">Customer-facing lead capture</p>
                </div>
              </div>
              <Badge variant="secondary">Live page</Badge>
            </div>

            <div className="grid gap-3 px-4 py-4">
              <div className="grid gap-3 sm:grid-cols-2">
                {featureFormFields.slice(0, 2).map((item) => (
                  <div
                    className="rounded-lg border border-border/70 bg-background/82 px-3.5 py-3"
                    key={item.label}
                  >
                    <p className="meta-label">{item.label}</p>
                    <p className="mt-2 text-sm text-foreground">{item.value}</p>
                  </div>
                ))}
              </div>

              {featureFormFields.slice(2).map((item) => (
                <div
                  className="rounded-lg border border-border/70 bg-background/82 px-3.5 py-3"
                  key={item.label}
                >
                  <p className="meta-label">{item.label}</p>
                  <p className="mt-2 text-sm text-foreground">{item.value}</p>
                </div>
              ))}

              <div className="rounded-lg border border-border/70 bg-background/82 px-3.5 py-3">
                <p className="meta-label">Message and details</p>
                <p className="mt-2 text-sm leading-6 text-foreground">
                  Need two front-window vinyl panels and a smaller door decal for
                  a spring refresh.
                </p>
              </div>

              <div className="rounded-lg border border-dashed border-border/70 bg-background/72 px-3.5 py-3">
                <div className="flex items-center gap-2">
                  <Upload className="size-4 text-primary" />
                  <p className="text-sm font-medium text-foreground">Attachments</p>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {featureFormUploads.map((item) => (
                    <Badge key={item} variant="secondary">
                      {item}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="rounded-md border border-primary/20 bg-primary px-4 py-2.5 text-center text-sm font-medium text-primary-foreground shadow-[var(--control-primary-shadow)]">
                Send inquiry
              </div>
            </div>
          </div>

          <div className="soft-panel overflow-hidden">
            <div className="flex flex-col items-start gap-3 border-b border-border/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                  <Inbox className="size-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Owner queue</p>
                  <p className="text-xs text-muted-foreground">What needs action next</p>
                </div>
              </div>
              <Badge variant="secondary">Dashboard</Badge>
            </div>

            <div className="grid gap-4 px-4 py-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="info-tile px-4 py-4">
                  <p className="meta-label">New</p>
                  <p className="mt-3 text-2xl font-semibold tracking-tight text-foreground">4</p>
                </div>
                <div className="info-tile px-4 py-4">
                  <p className="meta-label">Drafts</p>
                  <p className="mt-3 text-2xl font-semibold tracking-tight text-foreground">2</p>
                </div>
                <div className="info-tile px-4 py-4">
                  <p className="meta-label">Waiting</p>
                  <p className="mt-3 text-2xl font-semibold tracking-tight text-foreground">3</p>
                </div>
              </div>

              <div className="grid gap-3">
                {featureQueueItems.map((item) => (
                  <div
                    className="rounded-lg border border-border/70 bg-background/82 px-4 py-4"
                    key={item.title}
                  >
                    <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground">{item.title}</p>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">
                          {item.detail}
                        </p>
                      </div>
                      <StatusBadge tone={item.tone}>{item.meta}</StatusBadge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="soft-panel overflow-hidden">
            <div className="flex flex-col items-start gap-3 border-b border-border/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                  <FileText className="size-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Quote workflow</p>
                  <p className="text-xs text-muted-foreground">Pricing tied to the lead</p>
                </div>
              </div>
              <StatusBadge tone="sent">Sent</StatusBadge>
            </div>

            <div className="grid gap-4 px-4 py-4">
              <div className="rounded-lg border border-border/70 bg-background/82 px-4 py-4">
                <p className="meta-label">Quote</p>
                <p className="mt-2 text-sm font-semibold text-foreground">
                  Q-1042 - Spring storefront update
                </p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Harbor Roast - Customer quote page ready to share
                </p>
              </div>

              <div className="grid gap-3">
                {quoteLineItems.map((item) => (
                  <div
                    className="flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-background/82 px-4 py-3"
                    key={item.label}
                  >
                    <span className="text-sm text-muted-foreground">{item.label}</span>
                    <span className="text-sm font-medium text-foreground">{item.value}</span>
                  </div>
                ))}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-border/70 bg-background/82 px-4 py-4">
                  <p className="meta-label">Total</p>
                  <p className="mt-2 text-lg font-semibold tracking-tight text-foreground">
                    $1,480
                  </p>
                </div>
                <div className="rounded-lg border border-border/70 bg-background/82 px-4 py-4">
                  <p className="meta-label">Customer status</p>
                  <p className="mt-2 text-sm font-medium text-foreground">
                    Viewed 2 hours ago
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="soft-panel overflow-hidden">
            <div className="flex flex-col items-start gap-3 border-b border-border/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                  <Sparkles className="size-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">AI draft help</p>
                  <p className="text-xs text-muted-foreground">Grounded in your business context</p>
                </div>
              </div>
              <Badge variant="secondary">Draft ready</Badge>
            </div>

            <div className="grid gap-4 px-4 py-4">
              <div className="rounded-lg border border-border/70 bg-background/82 px-4 py-4">
                <p className="meta-label">Knowledge sources</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {featureKnowledgeItems.map((item) => (
                    <Badge key={item} variant="secondary">
                      {item}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-dashed border-border/70 bg-background/76 px-4 py-4">
                <div className="flex items-start gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                    <MessageSquareText className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">Draft reply</p>
                    <div className="mt-2 grid gap-1.5">
                      {replyDraftLines.map((line) => (
                        <p className="text-sm leading-6 text-muted-foreground" key={line}>
                          {line}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-md border border-border/70 bg-background/82 px-4 py-2.5 text-center text-sm font-medium text-foreground">
                  Insert draft
                </div>
                <div className="rounded-md border border-border/70 bg-background/82 px-4 py-2.5 text-center text-sm font-medium text-foreground">
                  Trim and send
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section-panel overflow-hidden" id="how-it-works">
        <div className="flex flex-col items-center gap-3 border-b border-border/70 px-5 py-5 text-center sm:px-6 sm:py-6">
          <Badge className="w-fit" variant="outline">
            How it works
          </Badge>
          <h2 className="max-w-3xl font-heading text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            How Requo supports the workflow.
          </h2>
          <p className="max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
            Requo helps you move from inbound inquiry to quote follow-up without
            rebuilding context at each step.
          </p>
        </div>

        <div className="grid gap-4 px-5 py-5 sm:px-6 sm:py-6 lg:grid-cols-2 xl:grid-cols-4">
          {workflowSteps.map((step, index) => (
            <WorkflowStep
              description={step.description}
              index={index + 1}
              key={step.title}
              title={step.title}
            />
          ))}
        </div>

        <div className="border-t border-border/70 px-5 py-5 sm:px-6 sm:py-6">
          <div className="soft-panel px-4 py-4 sm:px-5">
            <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:justify-center sm:text-left">
              <p className="text-sm font-medium text-foreground">In plain terms:</p>
              <div className="flex flex-wrap items-center justify-center gap-2.5">
                {workflowSummary.map((item, index) => (
                  <div className="flex items-center gap-2.5" key={item}>
                    {index > 0 ? (
                      <ArrowRight className="hidden size-4 text-muted-foreground sm:block" />
                    ) : null}
                    <Badge className="h-8 px-3" variant="secondary">
                      {item}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="marketing-section-grid" id="faq">
        <div className="flex flex-col gap-3 xl:sticky xl:top-28">
          <Badge className="w-fit" variant="outline">
            FAQ
          </Badge>
          <h2 className="font-heading text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            Common questions, answered clearly.
          </h2>
          <p className="text-sm leading-7 text-muted-foreground sm:text-base">
            The page stays focused on what Requo already does today and avoids
            promises that depend on future product work.
          </p>
        </div>

        <div className="grid gap-3">
          {faqItems.map((item) => (
            <FaqItem answer={item.answer} key={item.question} question={item.question} />
          ))}
        </div>
      </section>

      <section className="hero-panel overflow-hidden">
        <div className="flex flex-col gap-6 px-5 py-6 sm:px-6 sm:py-7 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex max-w-2xl flex-col gap-3">
            <Badge className="w-fit" variant="outline">
              Requo
            </Badge>
            <h2 className="font-heading text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
              Run inquiries, quotes, and follow-up from one place.
            </h2>
            <p className="text-sm leading-7 text-muted-foreground sm:text-base">
              Stop rebuilding the same context across forms, inboxes, docs, and
              spreadsheets. Start with a clearer owner workflow.
            </p>
          </div>

          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <Button asChild className="w-full sm:w-auto" size="lg">
              <Link href="/signup">
                Start free
                <ArrowRight data-icon="inline-end" />
              </Link>
            </Button>
            <Button asChild className="w-full sm:w-auto" size="lg" variant="outline">
              <Link href="/login">Log in</Link>
            </Button>
          </div>
        </div>

        <Separator className="bg-border/70" />

        <div className="flex flex-col gap-4 px-5 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <BrandMark subtitle="Inquiry-to-quote workflow" />
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            {navItems.map((item) => (
              <Link className="transition-colors hover:text-foreground" href={item.href} key={item.href}>
                {item.label}
              </Link>
            ))}
            <Link className="transition-colors hover:text-foreground" href="/login">
              Log in
            </Link>
            <Link className="transition-colors hover:text-foreground" href="/privacy">
              Privacy Policy
            </Link>
            <Link className="transition-colors hover:text-foreground" href="/terms">
              Terms of Service
            </Link>
          </div>
        </div>
      </section>
    </PublicPageShell>
  );
}

async function MarketingHeaderActions() {
  const isAuthenticated = Boolean(await getCurrentUser());

  return isAuthenticated ? (
    <MarketingSignedInHeaderActions />
  ) : (
    <MarketingSignedOutHeaderActions />
  );
}

function MarketingSignedInHeaderActions() {
  return (
    <>
      <Button asChild className="hidden sm:inline-flex lg:hidden" size="sm">
        <Link href={workspacesHubPath}>
          Visit app
          <ArrowRight data-icon="inline-end" />
        </Link>
      </Button>
      <Button asChild className="hidden lg:inline-flex">
        <Link href={workspacesHubPath}>
          Visit app
          <ArrowRight data-icon="inline-end" />
        </Link>
      </Button>
      <MarketingMobileNav isAuthenticated={true} />
    </>
  );
}

function MarketingSignedOutHeaderActions() {
  return (
    <>
      <Button
        asChild
        className="hidden sm:inline-flex lg:hidden"
        size="sm"
        variant="ghost"
      >
        <Link href="/login">Log in</Link>
      </Button>
      <Button asChild className="hidden lg:inline-flex" variant="ghost">
        <Link href="/login">Log in</Link>
      </Button>
      <Button asChild className="hidden sm:inline-flex lg:hidden" size="sm">
        <Link href="/signup">
          Start free
          <ArrowRight data-icon="inline-end" />
        </Link>
      </Button>
      <Button asChild className="hidden lg:inline-flex">
        <Link href="/signup">
          Start free
          <ArrowRight data-icon="inline-end" />
        </Link>
      </Button>
      <MarketingMobileNav isAuthenticated={false} />
    </>
  );
}
