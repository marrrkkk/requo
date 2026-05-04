import Link from "next/link";
import { Activity, ArrowRight, Check, ChevronRight, FileText, Inbox, Send, X } from "lucide-react";
import { Suspense } from "react";

import {
  faqItems,
  getMarketingNavHref,
  getMarketingNavKey,
  landingFeatureItems,
  navItems,
  workflowSteps,
  whyPoints,
} from "@/components/marketing/marketing-data";
import { InViewReveal } from "@/components/marketing/in-view-reveal";
import { MarketingShowcase } from "@/components/marketing/marketing-showcase";
import {
  PublicHeaderActions,
  PublicHeaderActionsFallback,
} from "@/components/marketing/public-header-actions";
import {
  MarketingFeatureRow,
  WorkflowStep,
} from "@/components/marketing/marketing-parts";
import { BrandMark } from "@/components/shared/brand-mark";
import { PublicPageShell } from "@/components/shared/public-page-shell";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";

const connectedWorkflowSteps = [
  {
    title: "Capture inquiry",
    description: "Collect customer details from your form or add leads manually from calls, DMs, email, and referrals.",
    outcome: "Customer request saved",
    icon: Inbox,
  },
  {
    title: "Build quote",
    description: "Turn the inquiry into a clear quote with line items, totals, notes, and expiry.",
    outcome: "Quote ready to share",
    icon: FileText,
  },
  {
    title: "Share link",
    description: "Send the quote link through email, WhatsApp, Messenger, Instagram, SMS, or wherever the customer replies.",
    outcome: "Customer can view online",
    icon: Send,
  },
  {
    title: "Track & follow up",
    description: "See when quotes are viewed, accepted, rejected, or need a follow-up before the job goes cold.",
    outcome: "Next step stays visible",
    icon: Activity,
  },
];

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
        { label: "Quotes", href: "/#quotes" },
        { label: "Forms", href: "/#forms" },
        { label: "Analytics", href: "/#analytics" },
        { label: "Collaboration", href: "/#collaboration" },
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
    <PublicPageShell
      brandSubtitle={null}
      className="pb-28 lg:pb-40"
      headerAction={
        <Suspense fallback={<PublicHeaderActionsFallback />}>
          <PublicHeaderActions />
        </Suspense>
      }
      headerClassName="sticky top-0 z-40 rounded-none border-x-0 border-t-0 bg-background/92 px-0 py-4 shadow-none backdrop-blur-xl supports-backdrop-filter:bg-background/88 md:px-0"
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
        </nav>
      }
    >
      <section className="surface-grid relative overflow-hidden border-b border-border/70 px-5 py-12 sm:px-6 sm:py-14 lg:px-8 lg:py-20 xl:px-10 xl:py-24">
        <div className="flex flex-col gap-12 lg:gap-14">
          <div className="mx-auto flex w-full max-w-4xl flex-col items-center gap-6 text-center">
            <div className="flex flex-col items-center gap-4">
              <h1 className="max-w-4xl font-heading text-4xl font-semibold leading-[0.94] tracking-tight text-balance sm:text-6xl xl:text-[4.15rem]">
                Turn customer inquiries into tracked quotes.
              </h1>
              <p className="max-w-2xl text-base leading-normal sm:leading-8 text-muted-foreground sm:text-lg">
                Requo helps service businesses capture inquiries, create professional quotes, share quote links, track customer activity, and follow up before jobs go cold.
              </p>
            </div>

            <div className="flex w-full max-w-sm flex-col gap-3 sm:w-auto sm:max-w-none sm:flex-row">
              <Button asChild className="w-full sm:w-auto" size="lg">
                <Link href="/signup">
                  Start free
                  <ArrowRight data-icon="inline-end" />
                </Link>
              </Button>
              <Button asChild className="w-full sm:w-auto" size="lg" variant="outline">
                <Link href="/pricing">See pricing</Link>
              </Button>
            </div>

            <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
              Built for freelancers, local service teams, home services, shops, studios, and contractors.
            </p>
          </div>

          <MarketingShowcase />
        </div>
      </section>

      <section
        className="mx-auto mt-24 w-full max-w-6xl px-5 sm:mt-32 sm:px-6 lg:mt-40 lg:px-8 xl:px-0"
        id="why-requo"
      >
        <InViewReveal className="mx-auto flex max-w-3xl flex-col items-center gap-4 text-center">
          <p className="eyebrow self-center">WHY REQUO</p>
          <h2 className="font-heading text-3xl font-semibold tracking-tight text-balance sm:text-5xl">
            Most quotes are not lost at the price. They are lost in the process.
          </h2>
          <p className="text-sm leading-normal sm:leading-8 text-muted-foreground sm:text-lg">
            Customer details get scattered across forms, calls, emails, DMs, and notes. Requo keeps every inquiry, quote, share link, customer response, and follow-up in one clear workflow.
          </p>
        </InViewReveal>

        <InViewReveal className="mt-12 lg:mt-16" delay={80}>
          <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-2 lg:gap-8">
            <div className="flex flex-col gap-6 rounded-3xl border border-border/40 bg-background/30 p-8 sm:p-10">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-full bg-destructive/10 text-destructive/80">
                  <X className="size-5" />
                </div>
                <h3 className="font-heading text-xl font-medium tracking-tight text-muted-foreground">
                  The old way
                </h3>
              </div>
              <ul className="mt-2 flex flex-col gap-6">
                {[
                  "Details are scattered across chats, calls, notes, and tabs.",
                  "Quotes slow down because the request has to be rebuilt.",
                  "Follow-ups depend on memory.",
                  "Accepted jobs can miss the next step.",
                ].map((item, i) => (
                  <li className="flex items-start gap-4" key={i}>
                    <X className="mt-0.5 size-4 shrink-0 text-muted-foreground/30" />
                    <span className="text-base leading-relaxed text-muted-foreground/80">
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="relative flex flex-col gap-6 overflow-hidden rounded-3xl border border-border/70 bg-background/80 p-8 shadow-[var(--surface-shadow-sm)] sm:p-10">
              {/* Subtle accent glow */}
              <div className="absolute right-0 top-0 -z-10 h-64 w-64 -translate-y-1/2 translate-x-1/3 rounded-full bg-primary/10 blur-3xl" />
              
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Check className="size-5" />
                </div>
                <h3 className="font-heading text-xl font-semibold tracking-tight text-foreground">
                  With Requo
                </h3>
              </div>
              <ul className="mt-2 flex flex-col gap-6">
                {[
                  "Each inquiry has one organized place.",
                  "Quotes start from the customer request.",
                  "Viewed, accepted, rejected, and follow-up status stays visible.",
                  "Won quotes move into post-win actions.",
                ].map((item, i) => (
                  <li className="flex items-start gap-4" key={i}>
                    <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                    <span className="text-base leading-relaxed text-foreground/90">
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </InViewReveal>
      </section>

      <section
        className="mx-auto mt-24 w-full max-w-6xl px-5 sm:mt-32 sm:px-6 lg:mt-40 lg:px-8 xl:px-0"
        id="workflow"
      >
        <div className="flex flex-col gap-12 sm:gap-16">
          <InViewReveal className="mx-auto flex max-w-2xl flex-col items-center text-center">
            <p className="eyebrow">HOW IT WORKS</p>
            <h2 className="mt-4 font-heading text-3xl font-semibold tracking-tight text-balance sm:text-5xl">
              From inquiry to accepted quote in one workflow.
            </h2>
            <p className="mt-4 text-sm leading-normal sm:leading-7 text-muted-foreground sm:text-base">
              Requo keeps every customer request connected to the quote, share link, response status, and next follow-up.
            </p>
          </InViewReveal>

          <div className="relative flex flex-col gap-6 lg:flex-row lg:gap-4">
            {connectedWorkflowSteps.map((step, index) => (
              <InViewReveal
                className="relative flex flex-1 flex-col"
                delay={120 + index * 45}
                key={step.title}
              >
                <article className="group relative flex h-full flex-col gap-4 rounded-2xl border border-border/70 bg-background/50 p-6 shadow-sm transition-colors hover:bg-background/80">
                  <div className="flex items-center justify-between">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <step.icon className="size-5" />
                    </div>
                    <p className="font-heading text-lg font-bold text-muted-foreground/30">
                      0{index + 1}
                    </p>
                  </div>
                  <div className="mt-1 flex min-w-0 flex-1 flex-col gap-2">
                    <h3 className="font-heading text-xl font-semibold tracking-tight text-foreground">
                      {step.title}
                    </h3>
                    <p className="text-sm leading-6 text-muted-foreground">
                      {step.description}
                    </p>
                  </div>
                  <div className="mt-4 flex items-center gap-2 border-t border-border/50 pt-4">
                    <span className="text-xs font-medium text-muted-foreground">
                      {step.outcome}
                    </span>
                    <ArrowRight className="ml-auto size-3 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </article>
              </InViewReveal>
            ))}
          </div>

          <InViewReveal className="flex flex-col items-center gap-6" delay={300}>
            <p className="text-sm font-medium text-muted-foreground">
              Requo keeps every step visible.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
              {[
                "New inquiry",
                "Quote ready",
                "Link shared",
                "Viewed",
                "Follow-up due",
                "Accepted",
              ].map((status, i, arr) => (
                <div className="flex items-center gap-2 sm:gap-3" key={status}>
                  <span className="inline-flex items-center rounded-full border border-border/70 bg-background/50 px-3 py-1.5 text-xs font-medium text-foreground shadow-sm sm:text-sm">
                    {status}
                  </span>
                  {i < arr.length - 1 && (
                    <ChevronRight className="hidden size-4 text-muted-foreground/40 sm:block" />
                  )}
                </div>
              ))}
            </div>
          </InViewReveal>

          <InViewReveal className="mx-auto flex w-full max-w-3xl flex-col items-center gap-5 rounded-2xl border border-border/40 bg-muted/5 p-6 text-center sm:p-8" delay={350}>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
              Keep the request, quote, share link, customer response, and next follow-up connected from start to finish.
            </p>
          </InViewReveal>
        </div>
      </section>

      <section
        className="relative left-1/2 mt-24 w-screen -translate-x-1/2 overflow-x-clip sm:mt-32 lg:mt-40"
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

      <section className="mx-auto mt-24 w-full max-w-6xl px-5 sm:mt-32 sm:px-6 lg:mt-40 lg:px-8" id="faq">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,0.38fr)_minmax(0,0.62fr)] lg:gap-16">
          <InViewReveal className="flex flex-col items-start gap-4 lg:sticky lg:top-32 lg:h-fit">
            <p className="eyebrow">QUESTIONS</p>
            <h2 className="font-heading text-3xl font-semibold tracking-tight text-balance sm:text-4xl lg:text-5xl">
              Questions service owners ask before using Requo.
            </h2>
            <p className="text-base leading-normal sm:leading-8 text-muted-foreground sm:text-lg">
              Short answers about inquiries, quotes, sharing, follow-ups, and how Requo fits your current workflow.
            </p>
          </InViewReveal>

          <InViewReveal delay={80}>
            <Accordion className="w-full border-t border-border/70" collapsible defaultValue="faq-1" type="single">
              {faqItems.map((item, index) => (
                <AccordionItem
                  className="border-b border-border/70"
                  key={item.question}
                  value={`faq-${index + 1}`}
                >
                  <AccordionTrigger className="py-5 text-left text-base font-medium tracking-tight text-foreground sm:text-lg hover:text-foreground/80 transition-colors">
                    {item.question}
                  </AccordionTrigger>
                  <AccordionContent className="pb-6 text-sm leading-normal sm:leading-7 text-muted-foreground sm:text-base">
                    {item.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </InViewReveal>
        </div>
      </section>

      <InViewReveal
        className="mx-auto mt-24 w-full max-w-6xl sm:mt-32 lg:mt-40"
        delay={120}
      >
        <section className="hero-panel overflow-hidden">
          <div className="flex flex-col gap-5 px-5 py-7 sm:px-6 sm:py-8 lg:flex-row lg:items-center lg:justify-between xl:px-8 xl:py-10">
            <h2 className="max-w-2xl font-heading text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
              Bring your next inquiry into one place.
            </h2>

            <Button asChild className="w-full sm:w-auto" size="lg">
              <Link href="/signup">
                Start free
                <ArrowRight data-icon="inline-end" />
              </Link>
            </Button>
          </div>
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
  );
}
