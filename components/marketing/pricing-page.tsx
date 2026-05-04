import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
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
 * Plan feature list definition — drives the comparison table.
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
      { label: "Quote workflow", free: true, pro: true, business: true },
      { label: "Follow-up reminders", free: true, pro: true, business: true },
      { label: "Viewed, accepted, and rejected quote tracking", free: true, pro: true, business: true },
    ],
  },
  {
    category: "Usage Limits",
    features: [
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
        label: "Custom fields per form",
        free: `${getUsageLimit("free", "customFieldsPerForm")}`,
        pro: `${getUsageLimit("pro", "customFieldsPerForm")}`,
        business: `${getUsageLimit("business", "customFieldsPerForm")}`,
      },
      {
        label: "Public inquiry upload size",
        free: formatUsageLimitValue(
          "publicInquiryAttachmentMaxBytes",
          getUsageLimit("free", "publicInquiryAttachmentMaxBytes"),
        ),
        pro: formatUsageLimitValue(
          "publicInquiryAttachmentMaxBytes",
          getUsageLimit("pro", "publicInquiryAttachmentMaxBytes"),
        ),
        business: formatUsageLimitValue(
          "publicInquiryAttachmentMaxBytes",
          getUsageLimit("business", "publicInquiryAttachmentMaxBytes"),
        ),
      },
    ],
  },
  {
    category: "Workspace & Team",
    features: [
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
    ],
  },
  {
    category: "Customer Experience",
    features: [
      { label: "Public inquiry pages", free: true, pro: true, business: true },
      { label: "Public quote pages", free: true, pro: true, business: true },
      { label: "Logo and business/form name", free: true, pro: true, business: true },
      {
        label: planFeatureLabels.branding,
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
        free: true,
        pro: true,
        business: true,
      },
    ],
  },
  {
    category: "Productivity",
    features: [
      {
        label: planFeatureLabels.multipleForms,
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
        label: planFeatureLabels.emailTemplates,
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
        label: planFeatureLabels.customerHistory,
        free: false,
        pro: true,
        business: true,
      },
      {
        label: planFeatureLabels.pushNotifications,
        free: false,
        pro: true,
        business: true,
      },
    ],
  },
  {
    category: "Insights & Analytics",
    features: [
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
        label: planFeatureLabels.exports,
        free: false,
        pro: true,
        business: true,
      },
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
      <PublicHeroSurface className="surface-grid overflow-hidden px-5 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-14">
        <div className="mx-auto flex w-full max-w-4xl flex-col items-center gap-6 text-center">
          <Badge className="w-fit" variant="outline">
            Pricing
          </Badge>
          <div className="flex flex-col items-center gap-4">
            <h1 className="max-w-3xl font-heading text-4xl font-semibold leading-[0.94] tracking-tight text-balance sm:text-5xl xl:text-[3.5rem]">
              Run the full inquiry-to-quote workflow from day one.
            </h1>
            <p className="max-w-2xl text-base leading-normal sm:leading-8 text-muted-foreground sm:text-lg">
              Capture inquiries, create quotes, share them with customers,
              follow up on time, and track outcomes. Start free, then upgrade
              when you need more capacity and workflow tools.
            </p>
          </div>
        </div>
      </PublicHeroSurface>

      {/* Plan cards with toggle — rendered client-side for interval state */}
      <PricingIntervalToggle currency={currency} />

      {/* Feature comparison table */}
      <section className="section-panel mx-auto w-full max-w-[76rem] overflow-hidden">
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
              {pricingCategories.map((category) => (
                <Fragment key={category.category}>
                  {/* Category Header Row */}
                  <tr className="border-y border-border/50 bg-muted/30 first:border-t-0">
                    <th
                      colSpan={4}
                      className="px-5 py-3 text-left text-sm font-semibold text-foreground sm:px-6"
                    >
                      {category.category}
                    </th>
                  </tr>
                  {/* Feature Rows */}
                  {category.features.map((row) => (
                    <tr className="border-b border-border/30 last:border-b-0" key={row.label}>
                      <td className="px-5 py-3 text-foreground sm:px-6">{row.label}</td>
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
      </section>

      {/* CTA */}
      <section className="hero-panel mx-auto mt-8 w-full max-w-[76rem] overflow-hidden lg:mt-12">
        <div className="flex flex-col gap-6 px-5 py-6 sm:px-6 sm:py-7 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex max-w-2xl flex-col gap-3">
            <h2 className="font-heading text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
              Ready to stop losing inquiries?
            </h2>
            <p className="text-sm leading-normal sm:leading-7 text-muted-foreground sm:text-base">
              Start with the Free plan today. Upgrade to Pro or Business when
              you need unlimited inquiries, quote capacity, and advanced tools.
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
 * Helper components (server)
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




