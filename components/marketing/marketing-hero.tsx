import Link from "next/link";
import { ArrowRight, BellRing, Briefcase, Check, ChevronRight, Eye, FileText, Inbox, Receipt, X } from "lucide-react";
import { Suspense } from "react";

import {
  faqItems,
  getMarketingNavHref,
  getMarketingNavKey,
  landingFeatureItems,
  navItems,
} from "@/components/marketing/marketing-data";
import { InViewReveal } from "@/components/marketing/in-view-reveal";
import { MarketingResourcesNav } from "@/components/marketing/marketing-resources-nav";
import { MarketingShowcase } from "@/components/marketing/marketing-showcase";
import {
  PublicHeaderActions,
  PublicHeaderActionsFallback,
} from "@/components/marketing/public-header-actions";
import {
  MarketingFeatureRow,
} from "@/components/marketing/marketing-feature-row";
import { BrandMark } from "@/components/shared/brand-mark";
import { PublicPageShell } from "@/components/shared/public-page-shell";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";

const workflowSteps = [
  {
    title: "Capture",
    description: "Intake form or manual entry. Every detail in one place.",
    icon: Inbox,
  },
  {
    title: "Quote",
    description: "AI drafts from your pricing. Review and send in minutes.",
    icon: FileText,
  },
  {
    title: "Win",
    description: "Track views, follow up on time, close the deal.",
    icon: BellRing,
  },
  {
    title: "Deliver",
    description: "Convert to a job, track progress, invoice when done.",
    icon: Briefcase,
  },
] as const;

function WorkflowArtifact({ step }: { step: number }) {
  if (step === 1) {
    return (
      <div className="flex items-center gap-2.5 rounded-lg border border-border/60 bg-background/70 px-2.5 py-2 shadow-sm">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted/60 text-foreground">
          <Inbox className="size-3.5" />
        </span>
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-[11px] font-medium text-foreground">
            Sarah Jenkins
          </p>
          <p className="truncate text-[10px] text-muted-foreground">
            Kitchen remodel · 10:24 AM
          </p>
        </div>
        <span className="shrink-0 rounded-full border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-primary">
          New
        </span>
      </div>
    );
  }

  if (step === 2) {
    return (
      <div className="rounded-lg border border-border/60 bg-background/70 px-2.5 py-2 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 leading-tight">
            <p className="truncate font-mono text-[10px] text-muted-foreground">
              Q-1042
            </p>
            <p className="truncate text-[11px] font-medium text-foreground">
              Kitchen remodel
            </p>
          </div>
          <p className="shrink-0 font-heading text-[13px] font-semibold text-foreground">
            $4,850
          </p>
        </div>
        <div className="mt-1.5 flex items-center gap-1 text-[9px] text-muted-foreground">
          <span className="inline-flex items-center gap-0.5">
            <span className="size-1 rounded-full bg-primary/60" />
            AI drafted
          </span>
          <span aria-hidden="true">·</span>
          <span>3 matched items</span>
          <span aria-hidden="true">·</span>
          <span>Valid 30 days</span>
        </div>
      </div>
    );
  }

  if (step === 3) {
    return (
      <div className="flex items-center gap-1.5 rounded-lg border border-border/60 bg-background/70 px-2.5 py-2 shadow-sm">
        <span className="inline-flex items-center gap-1 rounded-full bg-muted/60 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
          <Eye className="size-3" />
          Viewed
        </span>
        <ArrowRight className="size-3 text-muted-foreground/60" />
        <span className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
          <Check className="size-3" />
          Accepted
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-background/70 px-2 py-1 text-[10px] font-medium text-foreground shadow-sm">
        <Briefcase className="size-3 text-primary" />
        Job created
      </span>
      <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/70 px-2 py-1 text-[10px] font-medium text-muted-foreground shadow-sm">
        <Receipt className="size-3" />
        Invoiced
      </span>
    </div>
  );
}

const whyRequoStages = [
  {
    stage: "Capture",
    icon: Inbox,
    pain: "Requests scattered across email, DMs, and notes. Context lost before you start.",
    fix: "One record. Form answers, files, conversation, and AI-detected details — ready to quote.",
  },
  {
    stage: "Quote",
    icon: FileText,
    pain: "Every quote rebuilt from scratch. Buyers cool off waiting.",
    fix: "AI drafts from your pricing library. Review, adjust, send in minutes.",
  },
  {
    stage: "Win & Deliver",
    icon: BellRing,
    pain: "After acceptance, everything lives in your head.",
    fix: "Jobs, invoices, and follow-ups — connected from quote to completion.",
  },
] as const;

// Indexes map into `faqItems` in `components/marketing/marketing-data.ts`.
// Keep these ranges in sync if the list changes.
const faqGroups = [
  { label: "The basics", indexes: [0, 8, 9] },
  { label: "Your workflow", indexes: [3, 4, 5, 6] },
  { label: "Customers & team", indexes: [1, 2, 7] },
] as const;

export function MarketingHero() {
  const footerColumns = [
    {
      title: "Product",
      links: [
        { label: "Why Requo", href: getMarketingNavHref(navItems[0]) },
        { label: "How it works", href: getMarketingNavHref(navItems[1]) },
        { label: "FAQ", href: getMarketingNavHref(navItems[3]) },
        { label: "Pricing", href: "/pricing" },
      ],
    },
    {
      title: "Features",
      links: [
        { label: "Inquiries", href: "/#inquiries" },
        { label: "Quotes", href: "/#quotes" },
        { label: "AI Assistant", href: "/#ai" },
        { label: "Analytics", href: "/#analytics" },
      ],
    },
    {
      title: "Legal",
      links: [
        { label: "Privacy Policy", href: "/privacy" },
        { label: "Terms of Service", href: "/terms" },
        { label: "Refund Policy", href: "/refund-policy" },
      ],
    },
  ];

  return (
    <div className="overflow-x-clip">
      <PublicPageShell
        brandSubtitle={null}
        brandSize="lg"
        className="pb-28 lg:pb-40"
        headerRevealOnScroll
        headerAction={
          <Suspense fallback={<PublicHeaderActionsFallback />}>
            <PublicHeaderActions />
          </Suspense>
        }
        headerClassName="public-page-header--integrated bg-background/92 py-2 shadow-none backdrop-blur-xl supports-backdrop-filter:bg-background/88 sm:py-2.5"
        headerNav={
          <nav className="public-page-header-nav">
            {navItems.map((item) => (
              <Link
                className="public-page-header-link transition-none"
                href={getMarketingNavHref(item)}
                key={getMarketingNavKey(item)}
              >
                {item.label}
              </Link>
            ))}
            <MarketingResourcesNav />
          </nav>
        }
      >
      <section className="relative overflow-hidden border-b border-border/70 px-5 py-12 sm:px-6 sm:py-14 lg:px-8 lg:py-20 xl:px-10 xl:py-24">
        <div className="flex flex-col gap-12 lg:gap-14">
          <div className="mx-auto flex w-full max-w-4xl flex-col items-center gap-6 text-center">
            <div className="flex flex-col items-center gap-4">
              <h1 className="max-w-4xl font-heading text-[2rem] font-semibold leading-[1.05] tracking-tight text-balance sm:text-5xl sm:leading-[0.96] lg:text-6xl xl:text-[4.15rem] xl:leading-[0.94]">
                Turn inquiries into accepted quotes.
              </h1>
              <p className="max-w-2xl text-[0.95rem] leading-relaxed text-muted-foreground text-balance sm:text-base sm:leading-8 lg:text-lg">
                Capture requests, send quotes, follow up, and track every deal from inquiry to invoice.
              </p>
            </div>

            <div className="flex w-full max-w-sm flex-col gap-3 sm:w-auto sm:max-w-none sm:flex-row">
              <Button asChild className="w-full sm:w-auto" size="lg">
                <Link href="/signup">
                  Send your first quote
                  <ArrowRight data-icon="inline-end" />
                </Link>
              </Button>
              <Button asChild className="w-full sm:w-auto" size="lg" variant="outline">
                <Link href="/pricing">See pricing</Link>
              </Button>
            </div>

            <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
              Built for freelancers, contractors, home services, studios, and shops.
            </p>
          </div>

          <MarketingShowcase />
        </div>
      </section>

      <section
        className="mx-auto mt-32 w-full max-w-6xl px-5 sm:mt-40 sm:px-6 lg:mt-48 lg:px-8 xl:px-0"
        id="why-requo"
      >
        <div className="grid gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-16">
          <InViewReveal className="flex flex-col items-start gap-5 lg:sticky lg:top-32 lg:h-fit">
            <p className="eyebrow">WHY REQUO</p>
            <h2 className="font-heading text-3xl font-semibold tracking-tight text-balance sm:text-4xl lg:text-5xl">
              You lose work between the cracks, not at the price.
            </h2>
            <p className="text-base leading-normal sm:leading-8 text-muted-foreground sm:text-lg">
              Slow replies, forgotten follow-ups, no clear next step. Requo keeps every inquiry moving toward revenue.
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-[0.72rem] font-medium text-muted-foreground">
              {["Capture", "Quote", "Win & Deliver"].map((label, index, arr) => (
                <span className="flex items-center gap-2" key={label}>
                  <span className="inline-flex items-center rounded-full border border-border/70 bg-background/60 px-2.5 py-1 text-foreground shadow-sm">
                    {label}
                  </span>
                  {index < arr.length - 1 ? (
                    <ChevronRight className="size-3 text-muted-foreground/50" />
                  ) : null}
                </span>
              ))}
            </div>
          </InViewReveal>

          <div className="flex flex-col gap-3 sm:gap-4">
            {whyRequoStages.map((item, index) => {
              const Icon = item.icon;
              return (
                <InViewReveal delay={80 + index * 60} key={item.stage}>
                  <article className="group relative overflow-hidden rounded-2xl border border-border/70 bg-background/70 p-5 shadow-sm transition-colors hover:border-border hover:bg-background sm:p-6">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                          <Icon className="size-5" />
                        </div>
                        <p className="meta-label">{item.stage}</p>
                      </div>
                      <span className="font-heading text-sm font-bold text-muted-foreground/30">
                        0{index + 1}
                      </span>
                    </div>

                    <div className="mt-5 grid gap-4 sm:grid-cols-[1fr_auto_1fr] sm:items-stretch sm:gap-5">
                      <div className="flex items-start gap-2.5">
                        <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-muted-foreground/15">
                          <X className="size-2.5 text-muted-foreground/70" />
                        </span>
                        <div className="flex flex-col gap-1">
                          <p className="text-[0.68rem] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                            Without Requo
                          </p>
                          <p className="text-sm leading-6 text-muted-foreground">
                            {item.pain}
                          </p>
                        </div>
                      </div>

                      <div
                        aria-hidden="true"
                        className="hidden items-center justify-center sm:flex"
                      >
                        <div className="flex size-6 items-center justify-center rounded-full border border-border/70 bg-background text-muted-foreground shadow-sm">
                          <ArrowRight className="size-3" />
                        </div>
                      </div>

                      <div className="flex items-start gap-2.5">
                        <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-primary/15">
                          <Check className="size-2.5 text-primary" />
                        </span>
                        <div className="flex flex-col gap-1">
                          <p className="text-[0.68rem] font-medium uppercase tracking-[0.14em] text-primary">
                            With Requo
                          </p>
                          <p className="text-sm leading-6 font-medium text-foreground">
                            {item.fix}
                          </p>
                        </div>
                      </div>
                    </div>
                  </article>
                </InViewReveal>
              );
            })}
          </div>
        </div>
      </section>

      <section
        className="mx-auto mt-32 w-full max-w-6xl px-5 sm:mt-40 sm:px-6 lg:mt-48 lg:px-8 xl:px-0"
        id="workflow"
      >
        <InViewReveal className="flex flex-col items-start gap-4">
          <p className="eyebrow">HOW IT WORKS</p>
          <h2 className="font-heading text-3xl font-semibold tracking-tight text-balance sm:text-4xl lg:text-5xl">
            Inquiry to invoice. No scramble.
          </h2>
          <p className="max-w-2xl text-base leading-normal sm:leading-8 text-muted-foreground sm:text-lg">
            Inquiry to invoice, connected the whole way.
          </p>
        </InViewReveal>

        <InViewReveal className="relative mt-12 sm:mt-14 lg:mt-16" delay={80}>
          {/* Desktop horizontal connector line */}
          <div
            aria-hidden="true"
            className="absolute left-6 right-6 top-[1.75rem] hidden h-px bg-gradient-to-r from-transparent via-border/80 to-transparent lg:block"
          />
          {/* Mobile vertical connector line */}
          <div
            aria-hidden="true"
            className="absolute bottom-3 left-[1.125rem] top-3 w-px bg-gradient-to-b from-transparent via-border/80 to-transparent lg:hidden"
          />

          <ol className="grid gap-8 sm:gap-10 lg:grid-cols-4 lg:gap-0">
            {workflowSteps.map((step, index) => {
              const Icon = step.icon;
              const stepNumber = index + 1;

              return (
                <li
                  className="relative flex gap-4 pl-10 lg:flex-col lg:gap-4 lg:border-l lg:border-border/50 lg:pl-6 lg:first:border-l-0 lg:first:pl-0"
                  key={step.title}
                >
                  {/* Step badge — sits on top of the connector line */}
                  <div className="absolute left-0 top-0 z-10 flex size-10 shrink-0 items-center justify-center rounded-full border border-border/70 bg-background shadow-[var(--surface-shadow-sm)] lg:static">
                    <Icon className="size-4 text-primary" />
                    <span className="absolute -bottom-1 -right-1 flex size-4 items-center justify-center rounded-full bg-primary font-mono text-[9px] font-semibold text-primary-foreground shadow-sm">
                      {stepNumber}
                    </span>
                  </div>

                  <div className="flex min-w-0 flex-1 flex-col gap-2 lg:mt-1">
                    <h3 className="font-heading text-lg font-semibold tracking-tight text-foreground sm:text-xl lg:text-lg">
                      {step.title}
                    </h3>
                    <p className="text-sm leading-6 text-muted-foreground">
                      {step.description}
                    </p>

                    <div className="mt-2">
                      <WorkflowArtifact step={stepNumber} />
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </InViewReveal>
      </section>

      <section
        className="relative left-1/2 mt-32 w-screen -translate-x-1/2 overflow-x-clip sm:mt-40 lg:mt-48"
        id="features"
      >
        <InViewReveal className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-5 sm:px-6 lg:px-8 xl:px-0">
          <h2 className="font-heading text-3xl font-semibold tracking-tight text-balance sm:text-5xl">
            Everything you need between inquiry and quote.
          </h2>
          <p className="text-sm leading-normal sm:leading-8 text-muted-foreground sm:text-lg">
            Collect the right details, send quotes faster, stay on top of
            follow-up, and keep your team in sync.
          </p>
        </InViewReveal>

        <div className="mt-12 flex flex-col gap-16 sm:mt-14 sm:gap-20 lg:gap-24">
          {landingFeatureItems.map((item, index) => (
            <InViewReveal className="w-full" delay={80 + index * 45} key={item.id}>
              <MarketingFeatureRow
                description={item.description}
                featureId={item.id}
                previewDescription={item.previewDescription}
                previewTitle={item.previewTitle}
                reverse={index % 2 === 1}
                title={item.title}
              />
            </InViewReveal>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-32 w-full max-w-4xl px-5 sm:mt-40 sm:px-6 lg:mt-48 lg:px-8" id="faq">
        <InViewReveal className="flex flex-col items-start gap-4">
          <p className="eyebrow">FAQ</p>
          <h2 className="font-heading text-3xl font-semibold tracking-tight text-balance sm:text-4xl lg:text-5xl">
            Answers before you sign up.
          </h2>
          <p className="max-w-2xl text-base leading-normal sm:leading-8 text-muted-foreground sm:text-lg">
            Short, direct answers about inquiries, quotes, follow-ups, and how Requo fits your setup.
          </p>
        </InViewReveal>

        <div className="mt-10 flex flex-col gap-10 sm:mt-12 sm:gap-12">
          {faqGroups.map((group, groupIndex) => (
            <InViewReveal
              className="flex flex-col gap-3"
              delay={80 + groupIndex * 60}
              key={group.label}
            >
              <div className="flex items-baseline gap-3">
                <span className="font-mono text-[10px] font-semibold text-muted-foreground/60">
                  0{groupIndex + 1}
                </span>
                <p className="meta-label">{group.label}</p>
              </div>

              <Accordion
                className="w-full border-t border-border/70"
                collapsible
                defaultValue={groupIndex === 0 ? "faq-0-0" : undefined}
                type="single"
              >
                {group.indexes.map((itemIndex, qIndex) => {
                  const item = faqItems[itemIndex];

                  if (!item) return null;

                  return (
                    <AccordionItem
                      className="border-b border-border/70"
                      key={item.question}
                      value={`faq-${groupIndex}-${qIndex}`}
                    >
                      <AccordionTrigger className="py-4 text-left text-base font-medium tracking-tight text-foreground sm:text-lg hover:text-foreground/80 transition-colors">
                        {item.question}
                      </AccordionTrigger>
                      <AccordionContent className="pb-5 text-sm leading-normal sm:leading-7 text-muted-foreground sm:text-base">
                        {item.answer}
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            </InViewReveal>
          ))}
        </div>
      </section>

      <InViewReveal
        className="mx-auto mt-32 w-full max-w-4xl px-5 sm:mt-40 sm:px-6 lg:mt-48 lg:px-8 xl:px-0"
        delay={120}
      >
        <section className="flex flex-col items-center gap-8 py-12 text-center sm:py-16">
          <h2 className="max-w-3xl font-heading text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl xl:text-7xl">
            Your next quote is one click away.
          </h2>

          <Button asChild size="lg" className="rounded-full px-6 text-base font-semibold">
            <Link href="/signup">
              Get started
              <ArrowRight data-icon="inline-end" />
            </Link>
          </Button>

          <p className="text-sm text-muted-foreground">
            Free plan available. No credit card required.
          </p>
        </section>
      </InViewReveal>

      <InViewReveal className="mx-auto mt-8 w-full max-w-6xl sm:mt-12 lg:mt-16" delay={160}>
        <footer className="section-panel overflow-hidden">
          <div className="grid gap-10 border-b border-border/70 px-5 py-8 sm:px-6 sm:py-10 lg:grid-cols-[minmax(0,1.35fr)_repeat(3,minmax(0,0.72fr))] lg:gap-8 xl:gap-12">
            <div className="flex max-w-md flex-col gap-4">
              <BrandMark subtitle="Inquiry-to-quote workflow" />
              <p className="text-sm leading-normal sm:leading-7 text-muted-foreground">
                Requo helps owner-led service businesses capture better
                inquiries, send clearer quotes, and keep follow-up visible from
                first inquiry to customer response.
              </p>
            </div>

            {footerColumns.map((column) => (
              <div className="flex flex-col gap-3" key={column.title}>
                <p className="meta-label">{column.title}</p>
                <div className="flex flex-col gap-2.5 text-sm text-muted-foreground">
                  {column.links.map((link) => (
                    <Link
                      className="transition-colors hover:text-foreground"
                      href={link.href}
                      key={link.label}
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-2 px-5 py-4 text-sm text-muted-foreground sm:px-6 lg:flex-row lg:items-center lg:justify-between">
            <p>Built for owner-led service businesses.</p>
            <p>© 2026 Requo</p>
          </div>
        </footer>
      </InViewReveal>
      </PublicPageShell>
    </div>
  );
}
