import Link from "next/link";
import { ArrowRight } from "lucide-react";

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
import { PublicHeaderActions } from "@/components/marketing/public-header-actions";
import { WorkflowStep } from "@/components/marketing/marketing-parts";
import { BrandMark } from "@/components/shared/brand-mark";
import {
  PublicHeroSurface,
  PublicPageShell,
} from "@/components/shared/public-page-shell";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
export function MarketingHero() {
  return (
    <PublicPageShell
      brandSubtitle={null}
      className="pb-28 lg:pb-40"
      headerAction={<PublicHeaderActions />}
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
        className="mx-auto mt-20 grid w-full max-w-6xl gap-12 sm:mt-24 xl:mt-28 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] xl:items-start xl:gap-14"
        id="features"
      >
        <InViewReveal className="flex max-w-2xl flex-col gap-4">
          <p className="eyebrow">Features</p>
          <h2 className="font-heading text-3xl font-semibold tracking-tight text-balance sm:text-5xl">
            Everything between the first inquiry and the sent quote.
          </h2>
          <p className="text-sm leading-8 text-muted-foreground sm:text-lg">
            Requests, quotes, forms, analytics, workspace and billing — organized
            so your team spends less time chasing context and more time closing
            work.
          </p>
        </InViewReveal>

        <InViewReveal delay={80}>
          <Accordion className="marketing-accordion" collapsible type="single">
            {landingFeatureItems.map((item, index) => (
              <AccordionItem
                className="marketing-faq-item overflow-hidden px-5 py-0 sm:px-6"
                key={item.title}
                value={`feature-${index + 1}`}
              >
                <AccordionTrigger className="gap-4 py-5 sm:py-6">
                  <span className="flex items-start gap-3 text-left">
                    <item.icon
                      aria-hidden
                      className="mt-0.5 size-5 shrink-0 text-primary"
                    />
                    <span>{item.title}</span>
                  </span>
                </AccordionTrigger>
                <AccordionContent className="pb-5 sm:pb-6">
                  {item.description}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </InViewReveal>
      </section>

      <section
        className="mx-auto mt-20 grid w-full max-w-6xl gap-12 sm:mt-24 xl:mt-28 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] xl:items-start xl:gap-14"
        id="faq"
      >
        <InViewReveal className="flex max-w-2xl flex-col gap-4">
          <p className="eyebrow">FAQ</p>
          <h2 className="font-heading text-3xl font-semibold tracking-tight text-balance sm:text-5xl">
            A few questions people usually ask before they start.
          </h2>
          <p className="text-sm leading-8 text-muted-foreground sm:text-lg">
            Requo is deliberately narrow. These are the questions that matter
            when you are deciding if it fits the way your business handles new
            work.
          </p>
        </InViewReveal>

        <InViewReveal delay={80}>
          <Accordion className="marketing-accordion" collapsible type="single">
            {faqItems.map((item, index) => (
              <AccordionItem
                className="marketing-faq-item overflow-hidden px-5 py-0 sm:px-6"
                key={item.question}
                value={`faq-${index + 1}`}
              >
                <AccordionTrigger className="py-5 sm:py-6">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent className="pb-5 sm:pb-6">
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
          <div className="flex flex-col gap-6 px-5 py-7 sm:px-6 sm:py-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex max-w-2xl flex-col gap-4">
              <p className="eyebrow">Ready when you are</p>
              <h2 className="font-heading text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
                Stop losing the thread between inquiry and quote.
              </h2>
              <p className="text-sm leading-7 text-muted-foreground sm:text-base">
                Start free and keep the request, the quote, and the next
                follow-up in one place from the start.
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
                <Link href="/pricing">See pricing</Link>
              </Button>
            </div>
          </div>

          <Separator className="bg-border/70" />

          <div className="flex flex-col gap-4 px-5 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
            <BrandMark subtitle="Inquiry-to-quote workflow" />
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              {navItems.map((item) => (
                <Link
                  className="hover:text-foreground"
                  href={getMarketingNavHref(item)}
                  key={getMarketingNavKey(item)}
                >
                  {item.label}
                </Link>
              ))}
              <Link className="hover:text-foreground" href="/login">
                Log in
              </Link>
              <Link className="hover:text-foreground" href="/privacy">
                Privacy Policy
              </Link>
              <Link className="hover:text-foreground" href="/terms">
                Terms of Service
              </Link>
              <Link className="hover:text-foreground" href="/refund-policy">
                Refund Policy
              </Link>
            </div>
          </div>
        </section>
      </InViewReveal>
    </PublicPageShell>
  );
}
