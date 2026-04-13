import Link from "next/link";
import { Suspense } from "react";
import { ArrowRight, Check } from "lucide-react";

import { BrandMark } from "@/components/shared/brand-mark";
import {
  PublicPageShell,
  PublicHeroSurface,
} from "@/components/shared/public-page-shell";
import { navItems } from "@/components/marketing/marketing-data";
import { MarketingMobileNav } from "@/components/marketing/marketing-mobile-nav";
import { getCurrentUser } from "@/lib/auth/session";
import { workspacesHubPath } from "@/features/workspaces/routes";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  type WorkspacePlan,
  planMeta,
  getUsageLimit,
  planFeatureLabels,
} from "@/lib/plans";

/*──────────────────────────────────────────────────────────────────────────────
 * Plan feature list definition — drives the comparison table.
 *────────────────────────────────────────────────────────────────────────────*/

type PricingFeatureRow = {
  label: string;
  free: string | boolean;
  pro: string | boolean;
  business: string | boolean;
};

const pricingFeatures: PricingFeatureRow[] = [
  { label: "Inquiry capture", free: true, pro: true, business: true },
  { label: "Quote workflow", free: true, pro: true, business: true },
  { label: "Public inquiry pages", free: true, pro: true, business: true },
  { label: "Public quote pages", free: true, pro: true, business: true },
  { label: "Dashboard & overview", free: true, pro: true, business: true },
  { label: "Activity log", free: true, pro: true, business: true },
  { label: "Overview analytics", free: true, pro: true, business: true },
  {
    label: planFeatureLabels.analyticsConversion,
    free: false,
    pro: true,
    business: true,
  },
  {
    label: planFeatureLabels.analyticsWorkflow,
    free: false,
    pro: true,
    business: true,
  },
  {
    label: "Inquiries per month",
    free: `${getUsageLimit("free", "inquiriesPerMonth")}`,
    pro: "Unlimited",
    business: "Unlimited",
  },
  {
    label: "Quotes per month",
    free: `${getUsageLimit("free", "quotesPerMonth")}`,
    pro: "Unlimited",
    business: "Unlimited",
  },
  {
    label: planFeatureLabels.multipleForms,
    free: false,
    pro: true,
    business: true,
  },
  {
    label: planFeatureLabels.inquiryPageCustomization,
    free: false,
    pro: true,
    business: true,
  },
  {
    label: planFeatureLabels.attachments,
    free: false,
    pro: true,
    business: true,
  },
  {
    label: planFeatureLabels.replySnippets,
    free: false,
    pro: true,
    business: true,
  },
  {
    label: planFeatureLabels.quoteLibrary,
    free: false,
    pro: true,
    business: true,
  },
  {
    label: planFeatureLabels.knowledgeBase,
    free: false,
    pro: true,
    business: true,
  },
  {
    label: planFeatureLabels.aiAssistant,
    free: false,
    pro: true,
    business: true,
  },
  {
    label: planFeatureLabels.exports,
    free: false,
    pro: true,
    business: true,
  },
  {
    label: planFeatureLabels.branding,
    free: false,
    pro: true,
    business: true,
  },
  {
    label: planFeatureLabels.multiBusiness,
    free: false,
    pro: true,
    business: true,
  },
  {
    label: planFeatureLabels.members,
    free: false,
    pro: false,
    business: true,
  },
];

const planCardConfig: {
  plan: WorkspacePlan;
  price: string;
  pricePeriod: string;
  highlighted: boolean;
  cta: { label: string; href: string; variant: "default" | "outline" };
  includes: string;
}[] = [
  {
    plan: "free",
    price: "$0",
    pricePeriod: "forever",
    highlighted: false,
    cta: { label: "Get started free", href: "/signup", variant: "outline" },
    includes: "Core workflow for a single business:",
  },
  {
    plan: "pro",
    price: "Coming soon",
    pricePeriod: "",
    highlighted: true,
    cta: {
      label: "Request Pro access",
      href: "mailto:hello@requo.io?subject=Pro%20plan%20interest",
      variant: "default",
    },
    includes: "Everything in Free, plus:",
  },
  {
    plan: "business",
    price: "Coming soon",
    pricePeriod: "",
    highlighted: false,
    cta: {
      label: "Contact us for Business",
      href: "mailto:hello@requo.io?subject=Business%20plan%20inquiry",
      variant: "outline",
    },
    includes: "Everything in Pro, plus:",
  },
];

const planHighlights: Record<WorkspacePlan, string[]> = {
  free: [
    `${getUsageLimit("free", "inquiriesPerMonth")} inquiries per month`,
    `${getUsageLimit("free", "quotesPerMonth")} quotes per month`,
    "Public inquiry pages",
    "Quote workflow",
    "Dashboard & overview analytics",
    "Activity log",
  ],
  pro: [
    "Unlimited inquiries and quotes",
    "Conversion & workflow analytics",
    "Multiple inquiry forms",
    "Inquiry page customization",
    "AI assistant & knowledge base",
    "Saved replies & quote library",
    "Data exports & branding",
    "Multiple businesses",
  ],
  business: [
    "Everything in Pro",
    "Team members & roles",
    "Priority support",
  ],
};

/*──────────────────────────────────────────────────────────────────────────────
 * Component
 *────────────────────────────────────────────────────────────────────────────*/

export function PricingPage() {
  return (
    <PublicPageShell
      brandSubtitle={null}
      className="pb-14 lg:pb-20"
      headerAction={
        <Suspense fallback={<PricingSignedOutHeaderActions />}>
          <PricingHeaderActions />
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
      {/* Hero */}
      <PublicHeroSurface className="surface-grid overflow-hidden px-5 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-14">
        <div className="mx-auto flex w-full max-w-4xl flex-col items-center gap-6 text-center">
          <Badge className="w-fit" variant="outline">
            Pricing
          </Badge>
          <div className="flex flex-col items-center gap-4">
            <h1 className="max-w-3xl font-heading text-4xl font-semibold leading-[0.94] tracking-tight text-balance sm:text-5xl xl:text-[3.5rem]">
              Start free, upgrade as you grow.
            </h1>
            <p className="max-w-2xl text-base leading-8 text-muted-foreground sm:text-lg">
              Simple, transparent plans for owner-led service businesses. No
              hidden fees — upgrade when you need more tools and capacity.
            </p>
          </div>
        </div>
      </PublicHeroSurface>

      {/* Plan cards */}
      <section className="mx-auto grid w-full max-w-6xl gap-5 px-5 py-8 sm:px-6 md:grid-cols-3 lg:px-8 lg:py-12">
        {planCardConfig.map((config) => (
          <div
            className={cn(
              "flex flex-col rounded-xl border p-6",
              config.highlighted
                ? "border-primary/30 bg-accent/20 shadow-[0_0_0_1px_hsl(var(--primary)/0.12)]"
                : "border-border/70 bg-card/60",
            )}
            key={config.plan}
          >
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <Badge
                  variant={config.highlighted ? "default" : "secondary"}
                >
                  {planMeta[config.plan].label}
                </Badge>
                {config.highlighted ? (
                  <Badge variant="outline">Most popular</Badge>
                ) : null}
              </div>

              <div className="flex items-baseline gap-1.5">
                <span className="font-heading text-3xl font-semibold tracking-tight text-foreground">
                  {config.price}
                </span>
                {config.pricePeriod ? (
                  <span className="text-sm text-muted-foreground">
                    /{config.pricePeriod}
                  </span>
                ) : null}
              </div>

              <p className="text-sm leading-relaxed text-muted-foreground">
                {planMeta[config.plan].description}
              </p>
            </div>

            <Separator className="my-5 bg-border/60" />

            <div className="flex flex-1 flex-col gap-4">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {config.includes}
              </p>
              <ul className="grid gap-3">
                {planHighlights[config.plan].map((item) => (
                  <li className="flex items-start gap-2.5 text-sm leading-6 text-foreground" key={item}>
                    <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-6">
              <Button
                asChild
                className="w-full"
                size="lg"
                variant={config.cta.variant}
              >
                <Link href={config.cta.href}>
                  {config.cta.label}
                  <ArrowRight data-icon="inline-end" />
                </Link>
              </Button>
            </div>
          </div>
        ))}
      </section>

      {/* Feature comparison table */}
      <section className="section-panel mx-auto max-w-6xl overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-border/70 px-5 py-5 sm:px-6 sm:py-6">
          <Badge className="w-fit" variant="outline">
            Compare plans
          </Badge>
          <h2 className="font-heading text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
            Everything at a glance.
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[36rem] text-sm">
            <thead>
              <tr className="border-b border-border/50">
                <th className="px-5 py-3.5 text-left font-medium text-muted-foreground sm:px-6">
                  Feature
                </th>
                <th className="px-4 py-3.5 text-center font-medium text-muted-foreground">
                  Free
                </th>
                <th className="px-4 py-3.5 text-center font-medium text-foreground">
                  Pro
                </th>
                <th className="px-4 py-3.5 text-center font-medium text-muted-foreground">
                  Business
                </th>
              </tr>
            </thead>
            <tbody>
              {pricingFeatures.map((row) => (
                <tr className="border-b border-border/30 last:border-b-0" key={row.label}>
                  <td className="px-5 py-3 text-foreground sm:px-6">{row.label}</td>
                  <PricingCell value={row.free} />
                  <PricingCell value={row.pro} highlighted />
                  <PricingCell value={row.business} />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* CTA */}
      <section className="hero-panel mx-auto mt-8 max-w-6xl overflow-hidden lg:mt-12">
        <div className="flex flex-col gap-6 px-5 py-6 sm:px-6 sm:py-7 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex max-w-2xl flex-col gap-3">
            <h2 className="font-heading text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
              Ready to get organized?
            </h2>
            <p className="text-sm leading-7 text-muted-foreground sm:text-base">
              Start with the Free plan today. Upgrade to Pro or Business when
              your workflow demands it.
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
            <Link className="transition-colors hover:text-foreground" href="/">
              Home
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

/*──────────────────────────────────────────────────────────────────────────────
 * Helper components
 *────────────────────────────────────────────────────────────────────────────*/

function PricingCell({
  value,
  highlighted,
}: {
  value: string | boolean;
  highlighted?: boolean;
}) {
  return (
    <td
      className={cn(
        "px-4 py-3 text-center",
        highlighted ? "bg-accent/8" : "",
      )}
    >
      {typeof value === "boolean" ? (
        value ? (
          <Check className="mx-auto size-4 text-primary" />
        ) : (
          <span className="text-muted-foreground/50">—</span>
        )
      ) : (
        <span className="text-sm font-medium text-foreground">{value}</span>
      )}
    </td>
  );
}

async function PricingHeaderActions() {
  const isAuthenticated = Boolean(await getCurrentUser());

  return isAuthenticated ? (
    <PricingSignedInHeaderActions />
  ) : (
    <PricingSignedOutHeaderActions />
  );
}

function PricingSignedInHeaderActions() {
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

function PricingSignedOutHeaderActions() {
  return (
    <>
      <Button asChild className="hidden sm:inline-flex lg:hidden" size="sm" variant="ghost">
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
