import Link from "next/link";
import { ArrowRight, Check, Minus } from "lucide-react";
import { Fragment, Suspense } from "react";

import { BrandMark } from "@/components/shared/brand-mark";
import {
  PublicPageShell,
  PublicHeroSurface,
} from "@/components/shared/public-page-shell";
import {
  getMarketingNavHref,
  getMarketingNavKey,
  navItems,
} from "@/components/marketing/marketing-data";
import {
  PublicHeaderActions,
  PublicHeaderActionsFallback,
} from "@/components/marketing/public-header-actions";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  formatUsageLimitValue,
  getUsageLimit,
  planFeatureLabels,
} from "@/lib/plans";
import type { BillingCurrency } from "@/lib/billing/types";
import { PricingIntervalToggle } from "@/components/marketing/pricing-interval-toggle";

/*──────────────────────────────────────────────────────────────────────────────
 * Feature comparison table data
 *────────────────────────────────────────────────────────────────────────────*/

type PricingFeatureRow = {
  label: string;
  free: string | boolean;
  pro: string | boolean;
  business: string | boolean;
};

type PricingFeatureCategory = {
  category: string;
  features: PricingFeatureRow[];
};

const pricingCategories: PricingFeatureCategory[] = [
  {
    category: "Core Workflow",
    features: [
      { label: "Inquiry capture", free: true, pro: true, business: true },
      { label: "Quote creation & sending", free: true, pro: true, business: true },
      { label: "Public inquiry pages", free: true, pro: true, business: true },
      { label: "Public quote pages", free: true, pro: true, business: true },
      { label: "Quote status tracking", free: true, pro: true, business: true },
      { label: "Follow-up reminders", free: "3 active", pro: "Unlimited", business: "Unlimited" },
      { label: "Customer history", free: true, pro: true, business: true },
    ],
  },
  {
    category: "Limits",
    features: [
      { label: "Inquiries per month", free: "Unlimited", pro: "Unlimited", business: "Unlimited" },
      {
        label: "Quotes per month",
        free: `${getUsageLimit("free", "quotesPerMonth")}`,
        pro: "Unlimited",
        business: "Unlimited",
      },
      {
        label: "AI generations / month",
        free: `${getUsageLimit("free", "aiLineItemGenerationsPerMonth")}`,
        pro: `${getUsageLimit("pro", "aiLineItemGenerationsPerMonth")}`,
        business: `${getUsageLimit("business", "aiLineItemGenerationsPerMonth")}`,
      },
      {
        label: "Requo email sends / month",
        free: `${getUsageLimit("free", "requoQuoteEmailsPerMonth")}`,
        pro: `${getUsageLimit("pro", "requoQuoteEmailsPerMonth")}`,
        business: `${getUsageLimit("business", "requoQuoteEmailsPerMonth")}`,
      },
      {
        label: "Businesses",
        free: `${getUsageLimit("free", "businessesPerPlan")}`,
        pro: `${getUsageLimit("pro", "businessesPerPlan")}`,
        business: "Unlimited",
      },
      {
        label: "Live inquiry forms",
        free: `${getUsageLimit("free", "liveFormsPerBusiness")}`,
        pro: `${getUsageLimit("pro", "liveFormsPerBusiness")}`,
        business: "Unlimited",
      },
      {
        label: "Custom fields per form",
        free: `${getUsageLimit("free", "customFieldsPerForm")}`,
        pro: `${getUsageLimit("pro", "customFieldsPerForm")}`,
        business: `${getUsageLimit("business", "customFieldsPerForm")}`,
      },
      {
        label: "File upload size",
        free: formatUsageLimitValue("publicInquiryAttachmentMaxBytes", getUsageLimit("free", "publicInquiryAttachmentMaxBytes")),
        pro: formatUsageLimitValue("publicInquiryAttachmentMaxBytes", getUsageLimit("pro", "publicInquiryAttachmentMaxBytes")),
        business: formatUsageLimitValue("publicInquiryAttachmentMaxBytes", getUsageLimit("business", "publicInquiryAttachmentMaxBytes")),
      },
      {
        label: "Knowledge items",
        free: false,
        pro: `${getUsageLimit("pro", "memoriesPerBusiness")}`,
        business: `${getUsageLimit("business", "memoriesPerBusiness")}`,
      },
      {
        label: "Team members",
        free: false,
        pro: false,
        business: `Up to ${getUsageLimit("business", "membersPerBusiness")}`,
      },
    ],
  },
  {
    category: "AI & Productivity",
    features: [
      { label: planFeatureLabels.aiAssistant, free: false, pro: true, business: true },
      { label: planFeatureLabels.knowledgeBase, free: false, pro: true, business: true },
      { label: planFeatureLabels.emailTemplates, free: false, pro: true, business: true },
      { label: planFeatureLabels.quoteLibrary, free: false, pro: true, business: true },
      { label: planFeatureLabels.multipleForms, free: false, pro: true, business: true },
      { label: planFeatureLabels.exports, free: false, pro: true, business: true },
    ],
  },
  {
    category: "Customization & Branding",
    features: [
      { label: "Logo and business name", free: true, pro: true, business: true },
      { label: planFeatureLabels.inquiryPageCustomization, free: false, pro: true, business: true },
      { label: planFeatureLabels.branding, free: false, pro: true, business: true },
    ],
  },
  {
    category: "Analytics",
    features: [
      { label: "Dashboard overview", free: true, pro: true, business: true },
      { label: planFeatureLabels.analyticsConversion, free: true, pro: true, business: true },
      { label: planFeatureLabels.analyticsWorkflow, free: false, pro: true, business: true },
    ],
  },
  {
    category: "Team & Scale",
    features: [
      { label: planFeatureLabels.multiBusiness, free: false, pro: true, business: true },
      { label: planFeatureLabels.members, free: false, pro: false, business: true },
      { label: "Audit logs", free: false, pro: false, business: true },
      { label: "Priority support", free: false, pro: false, business: true },
    ],
  },
];

/*──────────────────────────────────────────────────────────────────────────────
 * Component
 *────────────────────────────────────────────────────────────────────────────*/

export function PricingPage({ currency }: { currency: BillingCurrency }) {
  return (
    <PublicPageShell
      brandSubtitle={null}
      className="pb-14 lg:pb-20"
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
              className="public-page-header-link"
              href={getMarketingNavHref(item)}
              key={getMarketingNavKey(item)}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      }
    >
      {/* Hero */}
      <PublicHeroSurface className="surface-grid overflow-hidden px-5 py-10 sm:px-6 sm:py-12 lg:px-8 lg:py-16">
        <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-5 text-center">
          <h1 className="max-w-2xl font-heading text-4xl font-semibold leading-[0.94] tracking-tight text-balance sm:text-5xl xl:text-[3.5rem]">
            Simple pricing. No surprises.
          </h1>
          <p className="max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg sm:leading-8">
            Start free with unlimited inquiries. Upgrade when you need more
            quotes, AI, and workflow tools.
          </p>
        </div>
      </PublicHeroSurface>

      {/* Plan cards with toggle */}
      <PricingIntervalToggle currency={currency} />

      {/* Feature comparison */}
      <section className="mx-auto w-full max-w-[76rem] rounded-2xl border border-border/70 bg-card/40 overflow-hidden">
        <div className="flex flex-col gap-2 px-5 py-6 sm:px-8 sm:py-7">
          <h2 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
            Compare plans
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            See exactly what each plan includes.
          </p>
        </div>

        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-y border-border/50 bg-muted/20">
                <th className="w-[40%] px-8 py-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Feature
                </th>
                <th className="w-[20%] px-4 py-4 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Free
                </th>
                <th className="w-[20%] px-4 py-4 text-center text-xs font-semibold uppercase tracking-wider text-foreground">
                  Pro
                </th>
                <th className="w-[20%] px-4 py-4 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Business
                </th>
              </tr>
            </thead>
            <tbody>
              {pricingCategories.map((category) => (
                <Fragment key={category.category}>
                  <tr className="border-t border-border/50">
                    <td
                      colSpan={4}
                      className="px-8 pb-2 pt-6 text-xs font-semibold uppercase tracking-wider text-primary"
                    >
                      {category.category}
                    </td>
                  </tr>
                  {category.features.map((row) => (
                    <tr
                      className="border-b border-border/20 last:border-b-0"
                      key={row.label}
                    >
                      <td className="px-8 py-3.5 text-sm text-foreground">
                        {row.label}
                      </td>
                      <PricingCell value={row.free} />
                      <PricingCell value={row.pro} highlighted />
                      <PricingCell value={row.business} />
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile stacked view */}
        <div className="flex flex-col gap-0 md:hidden">
          {pricingCategories.map((category) => (
            <div key={category.category} className="border-t border-border/50">
              <p className="px-5 pb-2 pt-5 text-xs font-semibold uppercase tracking-wider text-primary">
                {category.category}
              </p>
              <div className="flex flex-col">
                {category.features.map((row) => (
                  <div
                    key={row.label}
                    className="border-b border-border/20 px-5 py-3.5 last:border-b-0"
                  >
                    <p className="text-sm font-medium text-foreground">
                      {row.label}
                    </p>
                    <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs">
                      <div>
                        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                          Free
                        </p>
                        <p className="mt-1">
                          <MobileCell value={row.free} />
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-medium uppercase tracking-wider text-foreground">
                          Pro
                        </p>
                        <p className="mt-1">
                          <MobileCell value={row.pro} />
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                          Business
                        </p>
                        <p className="mt-1">
                          <MobileCell value={row.business} />
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto mt-10 w-full max-w-[76rem] rounded-2xl border border-border/70 bg-accent/10 overflow-hidden lg:mt-14">
        <div className="flex flex-col gap-6 px-6 py-8 sm:px-8 sm:py-10 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex max-w-xl flex-col gap-3">
            <h2 className="font-heading text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
              Ready to streamline your quotes?
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground sm:text-base sm:leading-7">
              Start capturing inquiries and sending quotes today. No credit card
              required.
            </p>
          </div>

          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
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
              <Link href="/login">Log in</Link>
            </Button>
          </div>
        </div>

        <Separator className="bg-border/50" />

        <div className="flex flex-col gap-4 px-6 py-4 sm:px-8 lg:flex-row lg:items-center lg:justify-between">
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
            <Link className="transition-colors hover:text-foreground" href="/refund-policy">
              Refund Policy
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
        "px-4 py-3.5 text-center",
        highlighted ? "bg-primary/[0.03]" : "",
      )}
    >
      {typeof value === "boolean" ? (
        value ? (
          <Check className="mx-auto size-4 text-primary" />
        ) : (
          <Minus className="mx-auto size-3.5 text-muted-foreground/40" />
        )
      ) : (
        <span className="text-sm font-medium tabular-nums text-foreground">
          {value}
        </span>
      )}
    </td>
  );
}

function MobileCell({ value }: { value: string | boolean }) {
  if (typeof value === "boolean") {
    return value ? (
      <Check className="mx-auto size-3.5 text-primary" />
    ) : (
      <Minus className="mx-auto size-3 text-muted-foreground/40" />
    );
  }

  return (
    <span className="text-xs font-medium tabular-nums text-foreground">
      {value}
    </span>
  );
}
