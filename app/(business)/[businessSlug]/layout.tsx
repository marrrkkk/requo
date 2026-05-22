import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import BusinessSlugLoading from "./loading";
import { getAppShellContext } from "@/lib/app-shell/context";
import { isReservedRouteSegment } from "@/lib/routing/reserved-segments";
import { siteName } from "@/lib/seo/site";

/**
 * Top-level business layout for the `/(business)/[businessSlug]` route group.
 *
 * Next.js resolves static segments before dynamic ones, so this layout only
 * matches when no static route (auth, marketing, admin, api, etc.) matched.
 *
 * This layout intentionally does NOT render the dashboard shell. The shell
 * (sidebar + topbar) lives in `(main)/layout.tsx` so settings can have its
 * own dedicated layout. Auth gating happens in nested layouts that need it.
 *
 * The outer component is synchronous; the reserved-segment 404 check runs
 * inside a Suspense boundary to satisfy Next.js 16 cacheComponents rules.
 */
export default function BusinessSlugLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ businessSlug: string }>;
}) {
  return (
    <Suspense fallback={<BusinessSlugLoading />}>
      <BusinessSlugGuard params={params}>{children}</BusinessSlugGuard>
    </Suspense>
  );
}

async function BusinessSlugGuard({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ businessSlug: string }>;
}) {
  const { businessSlug } = await params;

  // Defense-in-depth: reject reserved segments that somehow reach the dynamic
  // route (should not happen due to Next.js static-first resolution, but
  // guards against edge cases).
  if (isReservedRouteSegment(businessSlug)) {
    notFound();
  }

  return <>{children}</>;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ businessSlug: string }>;
}): Promise<Metadata> {
  const { businessSlug } = await params;
  const { businessContext } = await getAppShellContext(businessSlug);

  const businessName = businessContext.business.name;

  return {
    title: {
      default: businessName,
      template: `%s · ${businessName} | ${siteName}`,
    },
  };
}
