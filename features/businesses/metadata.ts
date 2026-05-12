import type { Metadata } from "next";

import type { PublicBusinessProfile } from "@/features/businesses/types";
import {
  createNoIndexMetadata,
  createPageMetadata,
  formatSiteTitle,
  siteTagline,
} from "@/lib/seo/site";

/**
 * Upper bound for `<meta name="description">` content length. Longer values
 * are truncated with an ellipsis rather than rejected so we always emit a
 * meaningful description even when the owner writes a very long summary.
 */
const META_DESCRIPTION_MAX_LENGTH = 160;

/**
 * Pathname of the public business profile. Matches the route at
 * `app/businesses/[slug]/page.tsx`; keep the two in sync so
 * `alternates.canonical` resolves to the same URL the page renders at.
 */
export function getPublicBusinessPagePath(slug: string) {
  return `/businesses/${slug}`;
}

/**
 * Clip a meta description to `META_DESCRIPTION_MAX_LENGTH` characters,
 * appending an ellipsis when truncation is needed. Preserves whitespace
 * trimming so callers can pass raw business copy without normalising
 * first.
 */
function truncateMetaDescription(text: string) {
  const normalized = text.trim();

  if (normalized.length <= META_DESCRIPTION_MAX_LENGTH) {
    return normalized;
  }

  return `${normalized.slice(0, META_DESCRIPTION_MAX_LENGTH - 3).trimEnd()}...`;
}

/**
 * Documented fallback ladder for the meta description of a public business
 * profile. Uses the longer `description` field when set, then the short
 * description, then the generic site tagline so an owner never ships a
 * blank description tag.
 */
function resolvePublicBusinessDescription(business: PublicBusinessProfile) {
  const raw =
    business.description?.trim() ||
    business.shortDescription?.trim() ||
    siteTagline;

  return truncateMetaDescription(raw);
}

/**
 * Build `Metadata` for an indexable public business profile. The parent
 * `app/businesses/layout.tsx` ships `createNoIndexMetadata` for the
 * authenticated hub + dashboard, so we explicitly flip `robots.index` and
 * `robots.follow` back to `true` here to override the inherited noindex
 * cascade on the public `/businesses/[slug]` route.
 *
 * Fallbacks:
 *
 * - `title` is `<business name> | Requo` (brand-suffixed via
 *   `formatSiteTitle`). We use `absoluteTitle` rather than the inherited
 *   title template so the parent layout's own metadata (which is
 *   noindex-scoped for the authenticated hub) cannot reshape the string.
 * - `description` uses `business.description` → `business.shortDescription`
 *   → `siteTagline`, truncated to <= 160 characters.
 * - `alternates.canonical` is always `/businesses/<slug>`.
 */
export function getPublicBusinessPageMetadata(
  business: PublicBusinessProfile,
): Metadata {
  const base = createPageMetadata({
    absoluteTitle: formatSiteTitle(business.name),
    description: resolvePublicBusinessDescription(business),
    pathname: getPublicBusinessPagePath(business.slug),
  });

  return {
    ...base,
    robots: {
      follow: true,
      index: true,
      googleBot: {
        follow: true,
        index: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
  };
}

/**
 * `Metadata` returned when the requested slug is missing or the business
 * is not publicly visible (archived, locked, or soft-deleted). Noindex so
 * crawlers do not accumulate rank on placeholder pages, and the title is
 * kept generic so we never leak the slug the crawler was probing.
 */
export function getMissingPublicBusinessMetadata(): Metadata {
  return createNoIndexMetadata({
    absoluteTitle: "Business profile",
    description: "This Requo business profile is unavailable.",
  });
}
