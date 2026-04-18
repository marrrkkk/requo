import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound, permanentRedirect } from "next/navigation";

import { PublicInquiryFormViewTracker } from "@/features/analytics/components/public-page-analytics-tracker";
import { submitPublicInquiryAction } from "@/features/inquiries/actions";
import { PublicInquiryPageRenderer } from "@/features/inquiries/components/public-inquiry-page-renderer";
import {
  getMissingPublicInquiryMetadata,
  getPublicInquiryPageMetadata,
} from "@/features/inquiries/metadata";
import { getPublicInquiryBusinessByFormSlug } from "@/features/inquiries/queries";
import { getBusinessPublicInquiryUrl } from "@/features/settings/utils";

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
}: {
  params: Promise<{ slug: string; formSlug: string }>;
}) {
  const { slug, formSlug } = await params;
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

  return (
    <>
      <PublicInquiryPageRenderer
        business={business}
        action={submitPublicInquiry}
      />
      <Suspense fallback={null}>
        <PublicInquiryFormViewTracker
          businessId={business.id}
          businessInquiryFormId={business.form.id}
        />
      </Suspense>
    </>
  );
}
