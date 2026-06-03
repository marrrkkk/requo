import Link from "next/link";
import {
  ArrowRight,
  BellRing,
  FileText,
  Inbox,
} from "lucide-react";

import {
  faqItems,
  getMarketingNavHref,
  landingFeatureItems,
  navItems,
} from "@/components/marketing/marketing-data";
import Image from "next/image";
import { InViewReveal } from "@/components/marketing/in-view-reveal";
import { MarketingHeader } from "@/components/marketing/marketing-header";
import {
  MarketingFeatureRow,
} from "@/components/marketing/marketing-feature-row";
import { WorkflowStepper } from "@/components/marketing/workflow-stepper";
import { BrandMark } from "@/components/shared/brand-mark";
import { PublicPageShell } from "@/components/shared/public-page-shell";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";

const whyRequoPoints = [
  {
    hook: "They asked for a quote.\nYou replied two days late.",
    detail: "You were on a job. By the time you sat down to write it, they'd already hired someone else.",
    icon: FileText,
  },
  {
    hook: "You forgot to follow up.\nThe lead went cold.",
    detail: "No reminder, no system. Just another name you meant to get back to.",
    icon: BellRing,
  },
  {
    hook: "Inquiries in email.\nQuotes in a spreadsheet.",
    detail: "Nothing connects. You're copy-pasting between tabs and hoping nothing falls through.",
    icon: Inbox,
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
        header={<MarketingHeader />}
      >
      <section className="relative overflow-hidden px-4 pb-12 pt-8 sm:px-6 sm:pb-16 sm:pt-10 lg:px-8 lg:pb-20 lg:pt-12 xl:px-0">
        <div className="relative z-10 flex flex-col gap-8 sm:gap-10 lg:gap-12">
          <div className="mx-auto flex w-full max-w-4xl flex-col items-center gap-5 text-center">
            <h1 className="font-[var(--font-inter)] text-[2.75rem] font-bold leading-[1.0] tracking-[-0.02em] text-foreground sm:text-[3.25rem] sm:leading-[1.0] lg:text-[4rem] lg:leading-[1.0]">
              Turn inquiries into<br className="hidden sm:inline" />{" "}
              <span className="text-primary">accepted quotes</span>.
            </h1>
            <p className="max-w-lg font-[var(--font-inter)] text-[0.95rem] font-normal leading-[1.5] text-muted-foreground sm:text-base sm:leading-[1.5] lg:text-lg lg:leading-[1.5]">
              Capture requests, send polished quotes, follow up automatically, and close more deals.
            </p>

            <div className="flex items-center gap-3 pt-1">
              <Button asChild size="lg" className="rounded-md bg-primary px-5 font-[var(--font-inter)] text-sm font-medium text-primary-foreground hover:bg-primary/90">
                <Link href="/signup">
                  Start free
                  <ArrowRight data-icon="inline-end" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="rounded-md border-border px-5 font-[var(--font-inter)] text-sm font-medium"
              >
                <Link href="/pricing">See pricing</Link>
              </Button>
            </div>
          </div>

          <div className="mx-auto w-full max-w-5xl">
            {/* Device frame */}
            <div className="rounded-2xl border-[3px] border-neutral-200 bg-neutral-100 p-2 shadow-[0_25px_80px_rgba(0,0,0,0.12),0_8px_24px_rgba(0,0,0,0.06)] dark:border-neutral-700 dark:bg-neutral-800 dark:shadow-[0_25px_80px_rgba(0,0,0,0.6),0_8px_24px_rgba(0,0,0,0.3)]">
              <div className="overflow-hidden rounded-xl">
                <Image
                  src="/marketing/dashboard-overview.png"
                  alt="Requo dashboard showing inquiries, quotes, and workflow overview"
                  width={1920}
                  height={1080}
                  priority
                  className="w-full h-auto"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="border-b border-border/70" />

      <section
        className="mx-auto mt-24 w-full max-w-6xl px-4 sm:mt-32 sm:px-6 lg:mt-40 lg:px-8 xl:px-0"
        id="why-requo"
      >
        <InViewReveal className="mx-auto flex max-w-3xl flex-col items-center gap-4 text-center">
          <p className="eyebrow">THE PROBLEM</p>
          <h2 className="font-heading text-2xl font-semibold tracking-tight text-balance sm:text-3xl lg:text-4xl xl:text-5xl">
            Slow quotes. Missed follow-ups.<br className="hidden sm:inline" /> Lost revenue.
          </h2>
          <p className="max-w-lg text-sm leading-normal text-muted-foreground sm:text-base sm:leading-7">
            You&rsquo;re busy doing the work. The admin piles up and leads slip away.
          </p>
        </InViewReveal>

        <div className="mt-14 grid gap-4 sm:mt-16 sm:grid-cols-2 lg:mt-20 lg:grid-cols-3 lg:gap-5">
          {whyRequoPoints.map((point, index) => {
            const Icon = point.icon;

            return (
              <InViewReveal delay={80 + index * 60} key={point.hook}>
                <article className="flex h-full flex-col gap-4 rounded-2xl border border-border/70 bg-background p-6 sm:p-7">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-muted">
                    <Icon className="size-[18px] text-muted-foreground" />
                  </span>
                  <h3 className="whitespace-pre-line text-[0.95rem] font-semibold leading-snug tracking-tight text-foreground sm:text-base">
                    {point.hook}
                  </h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {point.detail}
                  </p>
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
        <InViewReveal className="mx-auto flex max-w-2xl flex-col items-center gap-4 text-center">
          <p className="eyebrow">HOW IT WORKS</p>
          <h2 className="font-heading text-2xl font-semibold tracking-tight text-balance sm:text-3xl lg:text-4xl xl:text-5xl">
            Four steps. Every job.
          </h2>
          <p className="max-w-lg text-sm leading-normal text-muted-foreground sm:text-base sm:leading-7">
            Inquiry comes in, quote goes out, follow-up lands on time, payment hits your account.
          </p>
        </InViewReveal>

        <InViewReveal className="mt-14 sm:mt-16 lg:mt-20">
          <WorkflowStepper />
        </InViewReveal>
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

      <section className="mx-auto mt-24 w-full max-w-4xl px-4 sm:mt-32 sm:px-6 lg:mt-40 lg:px-8 xl:px-0" id="faq">
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
