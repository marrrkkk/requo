import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/session";
import {
  PublicHeroSurface,
  PublicPageShell,
} from "@/components/shared/public-page-shell";
import { MadeWithRequo } from "@/components/shared/made-with-requo";
import { PublicQuoteViewTracker } from "@/features/analytics/components/public-page-analytics-tracker";
import { hasFeatureAccess } from "@/lib/plans/entitlements";
import { Button } from "@/components/ui/button";
import Image from "next/image";
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

  const user = await getCurrentUser();
  const isCreator = !!user;

  const respondAction = respondToPublicQuoteAction.bind(null, quote.token);

  return (
    <>
      <PublicPageShell
        headerAction={
          isCreator ? (
            <Button asChild variant="ghost">
              <Link href="/">
                <ArrowLeft data-icon="inline-start" />
                Back to Requo
              </Link>
            </Button>
          ) : undefined
        }
      >
        <PublicHeroSurface className="lg:py-12 flex justify-center">
          <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-8">
            <QuotePreview
              businessName={quote.businessName}
              businessLogoStoragePath={quote.businessLogoStoragePath}
              businessSlug={quote.businessSlug}
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
              className="w-full"
              variant="bare"
            />

            <div className="w-full">
              <PublicQuoteInteractiveColumn
                quote={quote}
                respondAction={respondAction}
              />
            </div>
          </div>
        </PublicHeroSurface>

        {!hasFeatureAccess(quote.businessPlan, "branding") ? (
          <MadeWithRequo />
        ) : null}
      </PublicPageShell>
      <PublicQuoteViewTracker
        businessId={quote.businessId}
        quoteId={quote.id}
      />
    </>
  );
}
