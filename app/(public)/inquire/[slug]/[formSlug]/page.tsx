import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";

import { StructuredData } from "@/components/seo/structured-data";
import { PublicInquiryFormViewTracker } from "@/features/analytics/components/public-page-analytics-tracker";
import { submitPublicInquiryAction } from "@/features/inquiries/actions";
import { PublicInquiryPageRenderer } from "@/features/inquiries/components/public-inquiry-page-renderer";
import {
  getMissingPublicInquiryMetadata,
  getPublicInquiryPageDescription,
  getPublicInquiryPageMetadata,
  getPublicInquiryPagePath,
  getPublicInquiryPageTitle,
} from "@/features/inquiries/metadata";
import { getPublicInquiryBusinessByFormSlug } from "@/features/inquiries/queries";
import { getBusinessPublicInquiryUrl } from "@/features/settings/utils";
import { getPublicInquiryWebPageStructuredData } from "@/lib/seo/structured-data";
import {
  absoluteUrl,
  getSiteOrigin,
  siteName,
} from "@/lib/seo/site";

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
  const business = await getPublicInquiryBusinessByFormSlug({
    businessSlug: slug,
    formSlug,
  });

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

  return (
    <>
      <StructuredData
        data={inquiryWebPageStructuredData}
        id="requo-public-inquiry-webpage-structured-data"
      />
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
