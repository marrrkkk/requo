import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import {
  PublicHeroSurface,
  PublicPageShell,
} from "@/components/shared/public-page-shell";
import { PoweredByRequo } from "@/components/shared/powered-by-requo";
import { PublicQuoteViewTracker } from "@/features/analytics/components/public-page-analytics-tracker";
import { hasFeatureAccess } from "@/lib/plans/entitlements";
import { Button } from "@/components/ui/button";
import { PublicQuoteInteractiveColumn } from "@/features/quotes/components/public-quote-interactive-column";
import { QuotePreview } from "@/features/quotes/components/quote-preview";
import { respondToPublicQuoteAction } from "@/features/quotes/actions";
import { getPublicQuoteByToken } from "@/features/quotes/queries";
import { quotePublicRouteParamsSchema } from "@/features/quotes/schemas";
import { createNoIndexMetadata } from "@/lib/seo/site";

export const metadata: Metadata = createNoIndexMetadata({
  absoluteTitle: "Customer quote",
  description: "Review and respond to a customer quote securely.",
});

export default async function PublicQuotePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const parsedParams = quotePublicRouteParamsSchema.safeParse(await params);

  if (!parsedParams.success) {
    notFound();
  }

  const quote = await getPublicQuoteByToken(parsedParams.data.token);

  if (!quote) {
    notFound();
  }

  const respondAction = respondToPublicQuoteAction.bind(null, quote.token);

  return (
    <>
      <PublicPageShell
        headerAction={
          <Button asChild variant="ghost">
            <Link href="/">
              <ArrowLeft data-icon="inline-start" />
              Back to Requo
            </Link>
          </Button>
        }
      >
        <PublicHeroSurface className="lg:py-12">
          <div className="grid gap-10 xl:grid-cols-[minmax(0,0.84fr)_minmax(24rem,1.16fr)] xl:items-start">
            <PublicQuoteInteractiveColumn
              quote={quote}
              respondAction={respondAction}
            />

            <QuotePreview
              businessName={quote.businessName}
              quoteNumber={quote.quoteNumber}
              title={quote.title}
              customerName={quote.customerName}
              customerEmail={quote.customerEmail}
              currency={quote.currency}
              validUntil={quote.validUntil}
              notes={quote.notes}
              items={quote.items}
              subtotalInCents={quote.subtotalInCents}
              discountInCents={quote.discountInCents}
              totalInCents={quote.totalInCents}
              className="xl:sticky xl:top-6 xl:self-start"
            />
          </div>
        </PublicHeroSurface>

        {!hasFeatureAccess(quote.businessPlan, "branding") ? (
          <PoweredByRequo />
        ) : null}
      </PublicPageShell>
      <Suspense fallback={null}>
        <PublicQuoteViewTracker
          businessId={quote.businessId}
          quoteId={quote.id}
        />
      </Suspense>
    </>
  );
}
