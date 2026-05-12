import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { StatePageCard } from "@/components/shared/state-page-card";
import { StructuredData } from "@/components/seo/structured-data";
import {
  getMissingPublicBusinessMetadata,
  getPublicBusinessPageMetadata,
} from "@/features/businesses/metadata";
import { getPublicBusinessProfileBySlug } from "@/features/businesses/queries";
import { timed } from "@/lib/dev/server-timing";
import { absoluteUrl } from "@/lib/seo/site";
import {
  buildBreadcrumbsForPathname,
  getBreadcrumbListStructuredData,
  getLocalBusinessStructuredData,
} from "@/lib/seo/structured-data";

/**
 * Public business profile at `/businesses/[slug]`.
 *
 * This is the public, indexable surface for a business. The authenticated
 * dashboard lives under the `(main)` route group at
 * `/businesses/[slug]/dashboard`, so this page is reachable without a
 * session.
 *
 * The page and `generateMetadata` both call
 * `getPublicBusinessProfileBySlug`, which is wrapped in `React.cache()`
 * around an inner `"use cache"` function — so the DB round-trip is shared
 * across both within one request (Requirement 3.5).
 *
 * Structured data (LocalBusiness / ProfessionalService) and the full
 * profile UI are added by later tasks; this page stays minimal by design.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  try {
    const { slug } = await params;
    const business = await getPublicBusinessProfileBySlug(slug);

    if (business && business.isPublic) {
      return getPublicBusinessPageMetadata(business);
    }

    return getMissingPublicBusinessMetadata();
  } catch {
    return getMissingPublicBusinessMetadata();
  }
}

export default async function PublicBusinessPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const business = await timed(
    "publicBusiness.getPublicBusinessProfileBySlug",
    getPublicBusinessProfileBySlug(slug),
  );

  if (!business || !business.isPublic) {
    notFound();
  }

  const description =
    business.description?.trim() ||
    business.shortDescription?.trim() ||
    undefined;

  // LocalBusiness / ProfessionalService JSON-LD per Requirement 6.4.
  // `getLocalBusinessStructuredData` returns null when any of name/url/description
  // is missing, so we only render the script when the profile has enough data.
  const logoForJsonLd = business.logoUrl
    ? business.logoUrl.startsWith("http")
      ? business.logoUrl
      : absoluteUrl(business.logoUrl)
    : undefined;
  const profileUrl = absoluteUrl(`/businesses/${business.slug}`);
  const businessStructuredData = getLocalBusinessStructuredData({
    name: business.name,
    url: profileUrl,
    description: description ?? "",
    logoUrl: logoForJsonLd,
    address: business.address,
    telephone: business.telephone,
    areaServed: business.areaServed,
  });

  const breadcrumbItems = buildBreadcrumbsForPathname(
    `/businesses/${business.slug}`,
    {
      "/businesses": "Businesses",
      [`/businesses/${business.slug}`]: business.name,
    },
  );
  const breadcrumbStructuredData = breadcrumbItems.length
    ? getBreadcrumbListStructuredData({
        items: breadcrumbItems.map((item) => ({
          ...item,
          url: absoluteUrl(item.url),
        })),
      })
    : null;

  return (
    <>
      {businessStructuredData ? (
        <StructuredData
          data={businessStructuredData}
          id={`requo-business-${business.slug}-structured-data`}
        />
      ) : null}
      {breadcrumbStructuredData ? (
        <StructuredData
          data={breadcrumbStructuredData}
          id="breadcrumb-structured-data"
        />
      ) : null}
      <StatePageCard
        eyebrow="Business profile"
        title={business.name}
        description={description}
      />
    </>
  );
}
