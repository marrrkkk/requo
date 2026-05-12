import type { Metadata } from "next";

import type { PublicInquiryBusiness } from "@/features/inquiries/types";
import { getBusinessPublicInquiryUrl } from "@/features/settings/utils";
import { createNoIndexMetadata, createPageMetadata } from "@/lib/seo/site";

export function getPublicInquiryPagePath(business: PublicInquiryBusiness) {
  return business.form.isDefault
    ? getBusinessPublicInquiryUrl(business.slug)
    : getBusinessPublicInquiryUrl(business.slug, business.form.slug);
}

function truncateMetaDescription(text: string, maxLen: number) {
  const normalized = text.trim();
  if (normalized.length <= maxLen) {
    return normalized;
  }

  return `${normalized.slice(0, maxLen - 3).trimEnd()}...`;
}

export function getPublicInquiryPageTitle(business: PublicInquiryBusiness) {
  return business.form.isDefault
    ? `${business.name} — Request a quote`
    : `${business.form.name} · ${business.name}`;
}

export function getPublicInquiryPageDescription(
  business: PublicInquiryBusiness,
) {
  const rawDescription =
    business.inquiryPageConfig.description?.trim() ||
    business.shortDescription?.trim() ||
    `Request a quote or send project details to ${business.name}.`;

  return truncateMetaDescription(rawDescription, 160);
}

export function getPublicInquiryPageMetadata(
  business: PublicInquiryBusiness,
): Metadata {
  return createPageMetadata({
    absoluteTitle: getPublicInquiryPageTitle(business),
    brandTitle: false,
    description: getPublicInquiryPageDescription(business),
    pathname: getPublicInquiryPagePath(business),
  });
}

export function getMissingPublicInquiryMetadata() {
  return createNoIndexMetadata({
    absoluteTitle: "Inquiry form",
    description: "Public inquiry page for a Requo business.",
  });
}
