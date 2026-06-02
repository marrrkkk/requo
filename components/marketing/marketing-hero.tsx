import Link from "next/link";
import {
  ArrowRight,
  BellRing,
  Briefcase,
  Check,
  Eye,
  FileText,
  Inbox,
  Receipt,
  Sparkles,
  X,
} from "lucide-react";

import {
  faqItems,
  getMarketingNavHref,
  landingFeatureItems,
  navItems,
} from "@/components/marketing/marketing-data";
import dynamic from "next/dynamic";
import { InViewReveal } from "@/components/marketing/in-view-reveal";
import { MarketingHeader } from "@/components/marketing/marketing-header";
const MarketingShowcase = dynamic(
  () =>
    import("@/components/marketing/marketing-showcase").then(
      (m) => m.MarketingShowcase,
    ),
  {
    loading: () => <div className="mx-auto h-64 w-full max-w-5xl rounded-xl sm:h-80 lg:h-96" />
  },
);
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
    pain: "Requests come in from five different places. By the time you piece it together, the customer is gone.",
    fix: "Every inquiry lands in one place — form answers, files, notes, and AI-extracted details. Ready to quote instantly.",
  },
  {
    stage: "Quote",
    icon: FileText,
    pain: "Building quotes from scratch takes hours. Customers who were ready to buy lose interest waiting.",
    fix: "AI drafts line items from your pricing library. You review, tweak, and send a polished quote in minutes.",
  },
  {
    stage: "Follow up",
    icon: BellRing,
    pain: "You meant to check in last week. Now it's awkward, and they've moved on.",
    fix: "Automatic nudges at the right time. Know when quotes are viewed. Never let a warm lead go cold.",
  },
  {
    stage: "Deliver",
    icon: Briefcase,
    pain: "The customer said yes — now what? Scope, schedule, and invoicing live in your head.",
    fix: "Accepted quotes become jobs. Track progress, invoice on completion. Everything connected end to end.",
  },
] as const;

const leakPoints = [
  "Replies that arrive a day too late",
  "Quotes stuck in a drafts folder",
  "Follow-ups nobody remembered to send",
  "Won deals with no clear next step",
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
        header={<MarketingHeader />}
      >
      <section className="relative overflow-hidden px-4 pb-14 pt-10 sm:px-6 sm:pb-20 sm:pt-14 lg:px-8 lg:pb-24 lg:pt-16 xl:px-10">
        {/* Soft brand glow anchoring the headline */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 z-0 mx-auto h-[420px] w-full max-w-3xl rounded-full opacity-70 blur-3xl"
          style={{
            background:
              "radial-gradient(closest-side, color-mix(in srgb, var(--primary) 14%, transparent), transparent)",
          }}
        />
        <div className="relative z-10 flex flex-col gap-10 sm:gap-14 lg:gap-16">
          <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-6 text-center sm:gap-7">
            <Link
              className="group inline-flex items-center gap-2 rounded-full border border-border/80 bg-secondary/70 py-1 pl-1.5 pr-3 text-xs font-medium text-muted-foreground shadow-[var(--surface-shadow-sm)] backdrop-blur-sm transition-colors hover:text-foreground"
              href={getMarketingNavHref(navItems[2])}
            >
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[0.7rem] font-semibold text-primary">
                <Sparkles className="size-3" />
                AI quotes
              </span>
              Draft from your pricing in minutes
              <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>

            <div className="flex flex-col items-center gap-4 sm:gap-5">
              <h1 className="max-w-3xl font-heading text-[2.4rem] font-semibold leading-[0.98] tracking-tight text-balance sm:text-6xl sm:leading-[0.96] lg:text-7xl">
                Quote software for{" "}
                <span className="text-primary">owner-led service businesses</span>.
              </h1>
              <p className="max-w-xl text-base leading-relaxed text-muted-foreground text-balance sm:text-lg sm:leading-8">
                Turn inquiries into accepted quotes. Capture every request, send
                professional estimates, follow up on time, and track each deal
                from first contact to paid invoice.
              </p>
            </div>

            <div className="flex w-full max-w-sm flex-col gap-3 sm:w-auto sm:max-w-none sm:flex-row">
              <Button asChild className="w-full sm:w-auto" size="lg">
                <Link href="/signup">
                  Start free
                  <ArrowRight data-icon="inline-end" />
                </Link>
              </Button>
              <Button
                asChild
                className="w-full sm:w-auto"
                size="lg"
                variant="outline"
              >
                <Link href="/pricing">See pricing</Link>
              </Button>
            </div>

            <p className="text-xs text-muted-foreground sm:text-sm">
              Free plan available · No credit card required · Built for
              freelancers, contractors, studios, and shops.
            </p>
          </div>

          <MarketingShowcase />
        </div>
      </section>

      <div className="border-b border-border/70" />

      <section
        className="mx-auto mt-24 w-full max-w-6xl px-4 sm:mt-32 sm:px-6 lg:mt-40 lg:px-8 xl:px-0"
        id="why-requo"
      >
        <InViewReveal className="mx-auto flex max-w-3xl flex-col items-center gap-4 text-center sm:gap-5">
          <p className="eyebrow">WHY REQUO</p>
          <h2 className="font-heading text-2xl font-semibold tracking-tight text-balance sm:text-3xl lg:text-4xl xl:text-[2.75rem]">
            You don&apos;t lose jobs on price.{" "}
            <span className="text-muted-foreground">You lose them in the gaps.</span>
          </h2>
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base sm:leading-7 lg:text-lg lg:leading-8">
            Scattered requests, slow quotes, forgotten follow-ups. Every gap is
            revenue walking out the door. Requo closes them all.
          </p>
        </InViewReveal>

        <div className="mt-12 flex flex-col gap-4 sm:mt-16 lg:mt-20">
          {whyRequoStages.map((item, index) => {
            const Icon = item.icon;
            return (
              <InViewReveal key={item.stage} delay={index * 60}>
                <article className="group relative overflow-hidden rounded-2xl border border-border/70 bg-card/50 p-6 sm:p-8">
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:gap-8">
                    {/* Stage label */}
                    <div className="flex items-center gap-4 lg:w-44 lg:shrink-0">
                      <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary/15">
                        <Icon className="size-5" />
                      </span>
                      <div className="flex flex-col lg:hidden">
                        <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/60">
                          Step {index + 1}
                        </span>
                        <p className="font-heading text-lg font-semibold tracking-tight">
                          {item.stage}
                        </p>
                      </div>
                      <div className="hidden flex-col lg:flex">
                        <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/60">
                          Step {index + 1}
                        </span>
                        <p className="font-heading text-lg font-semibold tracking-tight">
                          {item.stage}
                        </p>
                      </div>
                    </div>

                    {/* Pain & fix */}
                    <div className="grid min-w-0 flex-1 gap-4 sm:grid-cols-2 sm:gap-6">
                      <div className="flex items-start gap-3">
                        <span className="mt-1 flex size-5 shrink-0 items-center justify-center rounded-full bg-muted-foreground/10">
                          <X className="size-3 text-muted-foreground/60" />
                        </span>
                        <p className="text-sm leading-relaxed text-muted-foreground">
                          {item.pain}
                        </p>
                      </div>
                      <div className="flex items-start gap-3 rounded-xl bg-primary/[0.05] px-4 py-3">
                        <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/15">
                          <Check className="size-3 text-primary" />
                        </span>
                        <p className="text-sm font-medium leading-relaxed text-foreground">
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
      </section>

      <section
        className="mx-auto mt-24 w-full max-w-6xl px-4 sm:mt-32 sm:px-6 lg:mt-40 lg:px-8 xl:px-0"
        id="workflow"
      >
        <div className="grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-12 xl:gap-16">
          <InViewReveal className="flex flex-col items-start gap-4 lg:sticky lg:top-32 lg:h-fit lg:gap-5">
            <p className="eyebrow">HOW IT WORKS</p>
            <h2 className="font-heading text-2xl font-semibold tracking-tight text-balance sm:text-3xl lg:text-4xl xl:text-5xl">
              Inquiry to invoice. No scramble.
            </h2>
            <p className="text-sm leading-normal text-muted-foreground sm:text-base sm:leading-7 lg:text-lg lg:leading-8">
              Four connected steps. Every inquiry tracked from first contact to final payment.
            </p>
          </InViewReveal>

          <div className="flex flex-col gap-3 sm:gap-4">
            {workflowSteps.map((step, index) => {
              const Icon = step.icon;
              const stepNumber = index + 1;

              return (
                <InViewReveal delay={80 + index * 60} key={step.title}>
                  <article className="group overflow-hidden rounded-2xl border border-border/70 bg-gradient-to-br from-background/95 to-background/70 p-5 shadow-sm transition-all hover:border-border hover:shadow-md sm:p-6">
                    <div className="relative">
                      <div className="flex items-start gap-3 sm:gap-4">
                        <div className="relative flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform group-hover:scale-105 sm:size-14">
                          <Icon className="size-5 sm:size-6" />
                        </div>
                        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                          <h3 className="font-heading text-lg font-semibold tracking-tight text-foreground sm:text-xl">
                            {step.title}
                          </h3>
                          <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm sm:leading-6">
                            {step.description}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 rounded-xl border border-border/60 bg-background/90 p-3 backdrop-blur-sm sm:mt-5 sm:p-4">
                        <WorkflowArtifact step={stepNumber} />
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
        className="relative left-1/2 mt-24 w-screen -translate-x-1/2 overflow-x-clip sm:mt-32 lg:mt-40"
        id="features"
      >
        <InViewReveal className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 sm:gap-4 sm:px-6 lg:px-8 xl:px-0">
          <h2 className="font-heading text-2xl font-semibold tracking-tight text-balance sm:text-3xl lg:text-4xl xl:text-5xl">
            Built for the full workflow.
          </h2>
          <p className="text-sm leading-normal text-muted-foreground sm:text-base sm:leading-7 lg:text-lg lg:leading-8">
            From first inquiry to paid invoice. Every step connected.
          </p>
        </InViewReveal>

        <div className="mt-10 flex flex-col gap-12 sm:mt-12 sm:gap-16 lg:gap-20">
          {landingFeatureItems.map((item, index) => (
            <InViewReveal className="w-full" delay={80 + index * 45} key={item.id}>
              <MarketingFeatureRow
                description={item.description}
                featureId={item.id}
                reverse={index % 2 === 1}
                title={item.title}
              />
            </InViewReveal>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-24 w-full max-w-4xl px-4 sm:mt-32 sm:px-6 lg:mt-40 lg:px-8" id="faq">
        <InViewReveal className="flex flex-col items-start gap-3 sm:gap-4">
          <p className="eyebrow">FAQ</p>
          <h2 className="font-heading text-2xl font-semibold tracking-tight text-balance sm:text-3xl lg:text-4xl xl:text-5xl">
            Answers before you sign up.
          </h2>
          <p className="max-w-2xl text-sm leading-normal text-muted-foreground sm:text-base sm:leading-7 lg:text-lg lg:leading-8">
            Short, direct answers about inquiries, quotes, follow-ups, and how Requo fits your setup.
          </p>
        </InViewReveal>

        <div className="mt-8 flex flex-col gap-8 sm:mt-10 sm:gap-10">
          {faqGroups.map((group, groupIndex) => (
            <InViewReveal
              className="flex flex-col gap-2.5 sm:gap-3"
              delay={80 + groupIndex * 60}
              key={group.label}
            >
              <div className="flex items-baseline gap-2.5 sm:gap-3">
                <span className="font-mono text-[9px] font-semibold text-muted-foreground/60 sm:text-[10px]">
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
                      <AccordionTrigger className="py-3.5 text-left text-sm font-medium tracking-tight text-foreground sm:py-4 sm:text-base lg:text-lg hover:text-foreground/80 transition-colors">
                        {item.question}
                      </AccordionTrigger>
                      <AccordionContent className="pb-4 text-xs leading-normal text-muted-foreground sm:pb-5 sm:text-sm sm:leading-6 lg:text-base lg:leading-7">
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
        className="mx-auto mt-24 w-full max-w-4xl px-4 sm:mt-32 sm:px-6 lg:mt-40 lg:px-8 xl:px-0"
        delay={120}
      >
        <section className="flex flex-col items-center gap-6 py-10 text-center sm:gap-8 sm:py-14">
          <h2 className="max-w-3xl font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl xl:text-6xl">
            Your next quote is one click away.
          </h2>

          <Button asChild size="lg" className="rounded-full px-6 text-base font-semibold">
            <Link href="/signup">
              Get started
              <ArrowRight data-icon="inline-end" />
            </Link>
          </Button>

          <p className="text-xs text-muted-foreground sm:text-sm">
            Free plan available. No credit card required.
          </p>
        </section>
      </InViewReveal>

      </PublicPageShell>
      <footer className="bg-primary text-primary-foreground">
          <div className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-14 sm:py-16 lg:flex-row lg:gap-20">
            {/* Left — Brand + socials */}
            <div className="flex flex-col gap-5">
              <BrandMark subtitle={null} size="lg" className="!text-primary-foreground [&_span]:!text-primary-foreground" />
              <div className="flex items-center gap-4">
                <a href="https://www.instagram.com/requoapp" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="text-primary-foreground/80 transition-colors hover:text-primary-foreground">
                  <svg className="size-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                </a>
                <a href="https://www.facebook.com/requoapp" target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="text-primary-foreground/80 transition-colors hover:text-primary-foreground">
                  <svg className="size-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                </a>
                <a href="https://www.linkedin.com/company/requo" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" className="text-primary-foreground/80 transition-colors hover:text-primary-foreground">
                  <svg className="size-5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                </a>
                <a href="https://x.com/requoapp" target="_blank" rel="noopener noreferrer" aria-label="X" className="text-primary-foreground/80 transition-colors hover:text-primary-foreground">
                  <svg className="size-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                </a>
              </div>
            </div>

            {/* Right — Link columns grouped together */}
            <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:ml-auto lg:gap-12">
              {footerColumns.map((column) => (
                <div className="flex flex-col gap-3" key={column.title}>
                  <p className="text-xs font-semibold uppercase tracking-wider text-primary-foreground">
                    {column.title}
                  </p>
                  <div className="flex flex-col gap-2.5 text-sm text-primary-foreground/75">
                    {column.links.map((link) => (
                      <Link
                        className="transition-colors hover:text-primary-foreground"
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
          </div>

          <div className="mx-auto max-w-6xl border-t border-primary-foreground/20 px-6 py-5">
            <p className="text-sm text-primary-foreground/70">
              © 2026 Requo. All rights reserved
            </p>
          </div>
        </footer>
    </div>
  );
}
