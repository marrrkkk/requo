import Link from "next/link";
import { Suspense } from "react";
import { ArrowRight, Sparkles } from "lucide-react";

import {
  aiAssistNote,
  faqItems,
  navItems,
  productCards,
  workflowSteps,
  whyCards,
} from "@/components/marketing/marketing-data";
import { MarketingMobileNav } from "@/components/marketing/marketing-mobile-nav";
import { MarketingShowcase } from "@/components/marketing/marketing-showcase";
import {
  FaqItem,
  MarketingFeatureCard,
  WorkflowStep,
} from "@/components/marketing/marketing-parts";
import { BrandMark } from "@/components/shared/brand-mark";
import {
  PublicHeroSurface,
  PublicPageShell,
} from "@/components/shared/public-page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { workspacesHubPath } from "@/features/workspaces/routes";
import { getCurrentUser } from "@/lib/auth/session";

export function MarketingHero() {
  const AiAssistIcon = aiAssistNote.icon;

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
      <PublicHeroSurface className="surface-grid overflow-hidden px-5 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12 xl:px-10 xl:py-14">
        <div className="flex flex-col gap-8 lg:gap-10">
          <div className="mx-auto flex w-full max-w-4xl flex-col items-center gap-6 text-center">
            <Badge className="w-fit" variant="outline">
              Owner-led service workflow
            </Badge>

            <div className="flex flex-col items-center gap-4">
              <h1 className="max-w-4xl font-heading text-4xl font-semibold leading-[0.94] tracking-tight text-balance sm:text-6xl xl:text-[4.2rem]">
                Manage inquiries, quotes, and follow-up in one place.
              </h1>
              <p className="max-w-2xl text-base leading-8 text-muted-foreground sm:text-lg">
                Requo helps service businesses collect incoming requests,
                review fit, send a clear quote, and keep the next step from
                getting buried.
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
              Built for owner-led service businesses handling incoming requests,
              custom quotes, and day-to-day follow-up.
            </p>
          </div>

          <MarketingShowcase />
        </div>
      </PublicHeroSurface>

      <section className="section-panel overflow-hidden" id="why-requo">
        <div className="flex flex-col items-center gap-4 border-b border-border/70 px-5 py-10 text-center sm:px-6 sm:py-14">
          <Badge className="bg-background shadow-sm" variant="outline">
            Why Requo
          </Badge>
          <h2 className="max-w-3xl font-heading text-3xl font-semibold tracking-tight text-balance sm:text-5xl">
            Most of the work gets messy before the quote is ready.
          </h2>
          <p className="max-w-2xl text-sm leading-8 text-muted-foreground sm:text-lg">
            The first customer message is usually just the start. Requo keeps
            intake, qualification, pricing, and follow-up connected so the
            owner is not rebuilding the job story in every tool.
          </p>
        </div>

        <div className="grid gap-5 bg-muted/20 px-5 py-8 sm:px-6 sm:py-10 bg-[url('/noise.png')] lg:grid-cols-3">
          {whyCards.map((item) => (
            <div
              className="surface-card motion-lift flex flex-col items-start gap-5 p-6 sm:p-8"
              key={item.title}
            >
              <div className="flex size-14 shrink-0 items-center justify-center rounded-[1.125rem] border border-border/80 bg-background shadow-[var(--surface-shadow-sm)] text-primary">
                <item.icon className="size-[1.35rem]" strokeWidth={2.2} />
              </div>
              <div className="flex flex-col gap-2.5">
                <h3 className="font-heading text-xl font-semibold tracking-tight text-foreground">
                  {item.title}
                </h3>
                <p className="text-sm leading-7 text-muted-foreground">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-border/70 bg-secondary/40 px-5 py-10 sm:px-6 sm:py-12">
          <div className="mx-auto flex max-w-3xl flex-col items-center gap-5 text-center">
            <div className="flex size-12 items-center justify-center rounded-full border border-border/60 bg-background text-primary shadow-sm">
              <Sparkles className="size-5" />
            </div>
            <p className="font-heading text-xl font-medium leading-[1.6] tracking-tight text-foreground sm:text-2xl text-balance">
              Requo is not trying to be a generic CRM. It is built strictly around the
              owner workflow from new request to sent quote and the follow-up after.
            </p>
          </div>
        </div>
      </section>

      <section className="section-panel overflow-hidden" id="product">
        <div className="flex flex-col gap-3 border-b border-border/70 px-5 py-5 sm:px-6 sm:py-6">
          <Badge className="w-fit" variant="outline">
            Product
          </Badge>
          <h2 className="font-heading text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            What the workspace actually covers.
          </h2>
          <p className="max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base">
            Requo focuses on the day-to-day work between a new request and a
            sent quote, with follow-up kept in the same flow.
          </p>
        </div>

        <div className="grid gap-4 px-5 py-5 sm:px-6 sm:py-6 lg:grid-cols-3">
          {productCards.map((item) => (
            <MarketingFeatureCard
              description={item.description}
              icon={item.icon}
              key={item.title}
              points={item.points}
              title={item.title}
            />
          ))}
        </div>

        <div className="border-t border-border/70 px-5 py-5 sm:px-6 sm:py-6">
          <div className="soft-panel flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-start sm:gap-5 sm:px-5">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
              <AiAssistIcon className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">{aiAssistNote.title}</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                {aiAssistNote.description}
              </p>
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
            The same customer context follows the job from inquiry capture to
            qualification, quote delivery, and follow-up.
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
            <p className="text-sm leading-6 text-foreground">
              In plain terms: collect the request, review it properly, send the
              quote, and keep the next follow-up visible.
            </p>
          </div>
        </div>
      </section>

      <section className="section-panel overflow-hidden" id="faq">
        <div className="flex flex-col gap-3 border-b border-border/70 px-5 py-5 sm:px-6 sm:py-6">
          <Badge className="w-fit" variant="outline">
            FAQ
          </Badge>
          <h2 className="font-heading text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            Common questions, answered clearly.
          </h2>
          <p className="max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base">
            The page stays focused on what Requo already does today without
            hiding the product behind vague marketing language.
          </p>
        </div>

        <div className="grid gap-3 px-5 py-5 sm:px-6 sm:py-6 lg:grid-cols-3">
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
              Keep incoming requests, quotes, and follow-up organized.
            </h2>
            <p className="text-sm leading-7 text-muted-foreground sm:text-base">
              Bring the messy middle of service work into one calmer owner workflow.
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
