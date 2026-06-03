import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/session";
import { PublicQuotePageRenderer } from "@/features/quotes/components/public-quote-page-renderer";
import { PublicQuoteViewTracker } from "@/features/analytics/components/public-page-analytics-tracker";
import { Button } from "@/components/ui/button";
import { PublicQuoteInteractiveColumn } from "@/features/quotes/components/public-quote-interactive-column";
import { respondToPublicQuoteAction, requestQuoteRevisionAction } from "@/features/quotes/actions";
import {
  getMissingPublicQuoteMetadata,
  getPublicQuotePageMetadata,
} from "@/features/quotes/metadata";
import { getPublicQuoteByToken } from "@/features/quotes/queries";
import { quotePublicRouteParamsSchema } from "@/features/quotes/schemas";

/**
 * Edge caching for public quote pages is achieved via CDN cache headers
 * configured in next.config.ts (s-maxage=60, stale-while-revalidate=300).
 *
 * Note: `export const runtime = "edge"` cannot be used here because the project
 * enables `cacheComponents: true` in nextConfig, which is incompatible with
 * the edge runtime segment config. The CDN cache headers provide the same
 * performance benefit — repeat visits are served from the edge without
 * hitting the origin.
 */

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
    <PublicQuotePageRenderer
      quote={quote}
      businessPlan={quote.businessPlan}
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
      interactiveColumn={
        <PublicQuoteInteractiveColumn
          quote={quote}
          respondAction={respondAction}
          revisionAction={revisionAction}
        />
      }
      afterContent={
        <PublicQuoteViewTracker
          businessId={quote.businessId}
          quoteId={quote.id}
        />
      }
    />
  );
}
