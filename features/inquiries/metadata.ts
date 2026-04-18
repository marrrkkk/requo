import type { Metadata } from "next";

import type { PublicInquiryBusiness } from "@/features/inquiries/types";
import { getBusinessPublicInquiryUrl } from "@/features/settings/utils";
import { createNoIndexMetadata, createPageMetadata } from "@/lib/seo/site";

export function getPublicInquiryPagePath(business: PublicInquiryBusiness) {
  return business.form.isDefault
    ? getBusinessPublicInquiryUrl(business.slug)
    : getBusinessPublicInquiryUrl(business.slug, business.form.slug);
}

export function getPublicInquiryPageMetadata(
  business: PublicInquiryBusiness,
): Metadata {
  const title = business.form.isDefault
    ? `${business.name} inquiry form`
    : `${business.form.name} | ${business.name}`;
  const description =
    business.inquiryPageConfig.description?.trim() ||
    business.shortDescription?.trim() ||
    `Send your project details to ${business.name}.`;

  return createPageMetadata({
    absoluteTitle: title,
    brandTitle: false,
    description,
    noIndex: true,
    pathname: getPublicInquiryPagePath(business),
  });
}

export function getMissingPublicInquiryMetadata() {
  return createNoIndexMetadata({
    absoluteTitle: "Inquiry form",
    description: "Public inquiry page for a Requo business.",
  });
}
