import type { Metadata } from "next";
import Image from "next/image";
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
import { PublicQuoteInteractiveColumn } from "@/features/quotes/components/public-quote-interactive-column";
import { respondToPublicQuoteAction, requestQuoteRevisionAction } from "@/features/quotes/actions";
import {
  getMissingPublicQuoteMetadata,
  getPublicQuotePageMetadata,
} from "@/features/quotes/metadata";
import { getPublicQuoteByToken } from "@/features/quotes/queries";
import { quotePublicRouteParamsSchema } from "@/features/quotes/schemas";
import { formatQuoteDate, formatQuoteMoney } from "@/features/quotes/utils";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  let rawToken: string | undefined;

  try {
    const { token } = await params;
    rawToken = token;

    const parsedParams = quotePublicRouteParamsSchema.safeParse({ token });

    if (!parsedParams.success) {
      return getMissingPublicQuoteMetadata(token);
    }

    const quote = await getPublicQuoteByToken(parsedParams.data.token);

    if (!quote) {
      return getMissingPublicQuoteMetadata(parsedParams.data.token);
    }

    return getPublicQuotePageMetadata({
      businessName: quote.businessName,
      quoteNumber: quote.quoteNumber,
      title: quote.title,
      token: parsedParams.data.token,
    });
  } catch {
    return getMissingPublicQuoteMetadata(rawToken);
  }
}

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
  const revisionAction = requestQuoteRevisionAction.bind(null, quote.token);

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
        headerClassName="border-transparent bg-transparent [&::before]:opacity-0"
      >
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
          {/* Left card — Quote content */}
          <PublicHeroSurface className="py-6 sm:py-8 lg:py-10">
            <div className="px-4 sm:px-6 lg:px-8">
              {/* Header: Business + Quote title */}
              <header className="flex flex-col gap-5 pb-6 sm:pb-8">
                <div className="flex items-center gap-3">
                  {quote.businessLogoStoragePath && quote.businessSlug ? (
                    <Image
                      src={`/api/business/${quote.businessSlug}/logo`}
                      alt={`${quote.businessName} logo`}
                      width={36}
                      height={36}
                      unoptimized
                      className="size-9 rounded-lg border border-border/60 bg-background/50 object-cover"
                    />
                  ) : null}
                  <span className="text-sm font-medium text-muted-foreground">
                    {quote.businessName}
                  </span>
                </div>

                <div className="flex flex-col gap-2">
                  <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                    {quote.title}
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    For {quote.customerName} · {quote.quoteNumber}
                    {quote.version > 1 ? ` · v${quote.version}` : ""} · Valid until{" "}
                    {formatQuoteDate(quote.validUntil)}
                  </p>
                </div>
              </header>

              {/* Line items */}
              <div className="flex flex-col divide-y divide-border/50 border-t border-border/60 py-2">
                {quote.items.map((item) => (
                  <div
                    className="flex items-start justify-between gap-4 py-4"
                    key={item.id}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground">
                        {item.description}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {item.quantity} × {formatQuoteMoney(item.unitPriceInCents, quote.currency)}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-medium text-foreground">
                      {formatQuoteMoney(item.lineTotalInCents, quote.currency)}
                    </p>
                  </div>
                ))}
              </div>

              {/* Subtotals */}
              <div className="flex flex-col gap-2 border-t border-border/60 pt-4 pb-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="text-foreground">
                    {formatQuoteMoney(quote.subtotalInCents, quote.currency)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Discount</span>
                  <span className="text-foreground">
                    -{formatQuoteMoney(quote.discountInCents, quote.currency)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Tax</span>
                  <span className="text-foreground">
                    {formatQuoteMoney(quote.taxInCents, quote.currency)}
                  </span>
                </div>
                <div className="flex items-center justify-between border-t border-border/40 pt-2 text-base font-semibold">
                  <span className="text-foreground">Total</span>
                  <span className="text-foreground">
                    {formatQuoteMoney(quote.totalInCents, quote.currency)}
                  </span>
                </div>
              </div>

              {/* Terms & conditions */}
              {quote.terms ? (
                <div className="mt-4 rounded-xl border border-border/50 px-4 py-4 sm:px-5">
                  <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                    Terms & conditions
                  </p>
                  <p className="mt-2.5 whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">
                    {quote.terms}
                  </p>
                </div>
              ) : null}
            </div>
          </PublicHeroSurface>

          {/* Right column — Actions (no card) */}
          <aside className="lg:sticky lg:top-8 lg:self-start">
            <PublicQuoteInteractiveColumn
              quote={quote}
              respondAction={respondAction}
              revisionAction={revisionAction}
            />
          </aside>
        </div>

        {!hasFeatureAccess(quote.businessPlan, "removeWatermark") ? (
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
