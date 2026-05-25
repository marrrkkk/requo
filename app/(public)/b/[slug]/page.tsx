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
 * Public business profile at `/b/[slug]`.
 *
 * This is the public, indexable surface for a business. The authenticated
 * dashboard lives under the `(business)` route group at
 * `/<slug>/home`, so this page is reachable without a session.
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

  const logoForJsonLd = business.logoUrl
    ? business.logoUrl.startsWith("http")
      ? business.logoUrl
      : absoluteUrl(business.logoUrl)
    : undefined;
  const profileUrl = absoluteUrl(`/b/${business.slug}`);
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
    `/b/${business.slug}`,
    {
      "/b": "Businesses",
      [`/b/${business.slug}`]: business.name,
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
