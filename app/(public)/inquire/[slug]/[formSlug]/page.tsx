import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";

import { StructuredData } from "@/components/seo/structured-data";
import { PublicInquiryFormViewTracker } from "@/features/analytics/components/public-page-analytics-tracker";
import { submitPublicInquiryAction } from "@/features/inquiries/actions";
import { PublicInquiryPageRenderer } from "@/features/inquiries/components/public-inquiry-page-renderer";
import {
  getMissingPublicInquiryMetadata,
  getPublicInquiryBreadcrumbLabel,
  getPublicInquiryPageDescription,
  getPublicInquiryPageMetadata,
  getPublicInquiryPagePath,
  getPublicInquiryPageTitle,
} from "@/features/inquiries/metadata";
import { getPublicInquiryBusinessByFormSlug } from "@/features/inquiries/queries";
import { getBusinessPublicInquiryUrl } from "@/features/settings/utils";
import {
  buildBreadcrumbsForPathname,
  getBreadcrumbListStructuredData,
  getPublicInquiryWebPageStructuredData,
} from "@/lib/seo/structured-data";
import { timed } from "@/lib/dev/server-timing";
import {
  absoluteUrl,
  getSiteOrigin,
  siteName,
} from "@/lib/seo/site";

/**
 * Edge caching for public inquiry form pages is achieved via CDN cache headers
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
  params: Promise<{ slug: string; formSlug: string }>;
}): Promise<Metadata> {
  const { formSlug, slug } = await params;
  const business = await getPublicInquiryBusinessByFormSlug({
    businessSlug: slug,
    formSlug,
  });

  return business
    ? getPublicInquiryPageMetadata(business)
    : getMissingPublicInquiryMetadata();
}

export default async function PublicInquiryFormPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; formSlug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const [{ slug, formSlug }, resolvedSearchParams] = await Promise.all([
    params,
    searchParams,
  ]);
  const submittedParam = resolvedSearchParams.submitted;
  const submitted = Array.isArray(submittedParam)
    ? submittedParam.includes("1")
    : submittedParam === "1";
  const business = await timed(
    "publicInquiryForm.getPublicInquiryBusinessByFormSlug",
    getPublicInquiryBusinessByFormSlug({
      businessSlug: slug,
      formSlug,
    }),
  );

  if (!business) {
    notFound();
  }

  if (business.form.isDefault) {
    permanentRedirect(getBusinessPublicInquiryUrl(business.slug));
  }

  const submitPublicInquiry = submitPublicInquiryAction.bind(
    null,
    business.slug,
    business.form.slug,
  );

  const pagePath = getPublicInquiryPagePath(business);
  const inquiryWebPageStructuredData = getPublicInquiryWebPageStructuredData({
    description: getPublicInquiryPageDescription(business),
    organizationLogoAbsoluteUrl: business.logoUrl
      ? absoluteUrl(business.logoUrl)
      : null,
    organizationName: business.name,
    pageName: getPublicInquiryPageTitle(business),
    pageUrl: absoluteUrl(pagePath),
    siteName,
    siteOrigin: getSiteOrigin(),
  });

  const breadcrumbItems = buildBreadcrumbsForPathname(
    `/inquire/${slug}/${formSlug}`,
    {
      "/inquire": "Inquire",
      [`/inquire/${slug}`]: business.name,
      [`/inquire/${slug}/${formSlug}`]: business.form.name,
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
      <StructuredData
        data={inquiryWebPageStructuredData}
        id="requo-public-inquiry-webpage-structured-data"
      />
      {breadcrumbStructuredData ? (
        <StructuredData
          data={breadcrumbStructuredData}
          id="breadcrumb-structured-data"
        />
      ) : null}
      <PublicInquiryPageRenderer
        business={business}
        action={submitPublicInquiry}
        submitted={submitted}
      />
      {!submitted ? (
        <PublicInquiryFormViewTracker
          businessId={business.id}
          businessInquiryFormId={business.form.id}
        />
      ) : null}
    </>
  );
}
