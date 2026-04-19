import Link from "next/link";
import { ArrowRight } from "lucide-react";
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
import {
  PublicHeroSurface,
  PublicPageShell,
} from "@/components/shared/public-page-shell";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";

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
      <PublicHeroSurface className="surface-grid overflow-hidden px-5 py-12 sm:px-6 sm:py-14 lg:px-8 lg:py-20 xl:px-10 xl:py-24">
        <div className="flex flex-col gap-12 lg:gap-14">
          <div className="mx-auto flex w-full max-w-4xl flex-col items-center gap-6 text-center">
            <div className="flex flex-col items-center gap-4">
              <h1 className="max-w-4xl font-heading text-4xl font-semibold leading-[0.94] tracking-tight text-balance sm:text-6xl xl:text-[4.15rem]">
                Turn inquiries into quotes without the mess.
              </h1>
              <p className="max-w-2xl text-base leading-8 text-muted-foreground sm:text-lg">
                Requo helps service businesses collect new requests, send clear
                quotes, and keep follow-up visible from the first message to
                the customer&apos;s reply.
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
              Built for owner-led service businesses handling custom work,
              inquiries, estimates, and follow-up.
            </p>
          </div>

          <MarketingShowcase />
        </div>
      </PublicHeroSurface>

      <section
        className="mx-auto mt-20 grid w-full max-w-6xl gap-12 sm:mt-24 xl:mt-28 xl:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)] xl:items-start xl:gap-14"
        id="why-requo"
      >
        <InViewReveal className="flex flex-col gap-4">
          <p className="eyebrow">Why Requo</p>
          <h2 className="max-w-2xl font-heading text-3xl font-semibold tracking-tight text-balance sm:text-5xl">
            Most leads get scattered before the quote goes out.
          </h2>
          <p className="max-w-xl text-sm leading-8 text-muted-foreground sm:text-lg">
            The request comes in, notes start piling up, the quote gets drafted
            somewhere else, and follow-up depends on memory. Requo keeps that
            middle part together.
          </p>
        </InViewReveal>

        <InViewReveal className="soft-panel overflow-hidden" delay={80}>
          <div className="border-b border-border/70 px-5 py-4 sm:px-6">
            <p className="meta-label">What stays connected</p>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              One request. One quote. One next step to keep moving.
            </p>
          </div>

          <div className="divide-y divide-border/70">
            {whyPoints.map((item, index) => (
              <InViewReveal
                className="flex gap-4 px-5 py-5 sm:px-6 sm:py-6"
                delay={140 + index * 45}
                key={item.title}
              >
                <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-border/80 bg-background text-primary shadow-[var(--surface-shadow-sm)]">
                  <item.icon className="size-[1.125rem]" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-semibold tracking-tight text-foreground">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-7 text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              </InViewReveal>
            ))}
          </div>
        </InViewReveal>
      </section>

      <section
        className="section-panel mx-auto mt-20 w-full max-w-6xl overflow-hidden sm:mt-24 xl:mt-28"
        id="workflow"
      >
        <InViewReveal className="mx-auto flex max-w-3xl flex-col items-center gap-4 border-b border-border/70 px-5 py-8 text-center sm:px-6 sm:py-10">
          <p className="eyebrow">How it works</p>
          <h2 className="max-w-3xl font-heading text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            A simple flow from new request to sent quote.
          </h2>
          <p className="max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
            Requo follows the steps most service businesses already use. It
            just keeps them in one place.
          </p>
        </InViewReveal>

        <div className="grid gap-4 px-5 py-5 sm:px-6 sm:py-6 lg:grid-cols-2 xl:grid-cols-4">
          {workflowSteps.map((step, index) => (
            <InViewReveal key={step.title} delay={120 + index * 45}>
              <WorkflowStep
                description={step.description}
                index={index + 1}
                title={step.title}
              />
            </InViewReveal>
          ))}
        </div>
      </section>

      <section
        className="relative left-1/2 mt-20 w-screen -translate-x-1/2 overflow-x-clip sm:mt-24 xl:mt-28"
        id="features"
      >
        <InViewReveal className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-5 sm:px-6 lg:px-8 xl:px-0">
          <h2 className="font-heading text-3xl font-semibold tracking-tight text-balance sm:text-5xl">
            Everything you need between inquiry and quote.
          </h2>
          <p className="text-sm leading-8 text-muted-foreground sm:text-lg">
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

      <section className="mx-auto mt-20 w-full max-w-6xl sm:mt-24 xl:mt-28" id="faq">
        <InViewReveal className="flex flex-col gap-4">
          <p className="eyebrow">FAQ</p>
          <h2 className="max-w-2xl font-heading text-3xl font-semibold tracking-tight text-balance sm:text-5xl">
            Questions that matter before you switch.
          </h2>
          <p className="max-w-3xl text-sm leading-8 text-muted-foreground sm:text-lg">
            Short answers about how Requo fits custom inquiry and quote work.
          </p>
        </InViewReveal>

        <InViewReveal className="mt-8" delay={80}>
          <Accordion className="w-full border-t border-border/70" collapsible type="single">
            {faqItems.map((item, index) => (
              <AccordionItem
                className="border-b border-border/70"
                key={item.question}
                value={`faq-${index + 1}`}
              >
                <AccordionTrigger className="py-6 text-left text-base font-semibold tracking-tight text-foreground sm:text-lg">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent className="max-w-3xl pb-6 text-sm leading-7 text-muted-foreground sm:text-base">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </InViewReveal>
      </section>

      <InViewReveal
        className="mx-auto mt-20 w-full max-w-6xl sm:mt-24 xl:mt-28"
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

      <InViewReveal className="mx-auto mt-6 w-full max-w-6xl" delay={160}>
        <footer className="section-panel overflow-hidden">
          <div className="grid gap-10 border-b border-border/70 px-5 py-8 sm:px-6 sm:py-10 lg:grid-cols-[minmax(0,1.35fr)_repeat(3,minmax(0,0.72fr))] lg:gap-8 xl:gap-12">
            <div className="flex max-w-md flex-col gap-4">
              <BrandMark subtitle="Inquiry-to-quote workflow" />
              <p className="text-sm leading-7 text-muted-foreground">
                Requo helps owner-led service businesses capture better
                inquiries, send clearer quotes, and keep follow-up visible from
                first request to customer response.
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
