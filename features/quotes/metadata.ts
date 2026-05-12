import type { Metadata } from "next";

import { createPageMetadata } from "@/lib/seo/site";

export type PublicQuoteMetadataInput = {
  token: string;
  title: string;
  quoteNumber: string;
  businessName: string;
};

function resolvePrimaryLabel(input: PublicQuoteMetadataInput) {
  const trimmedTitle = input.title.trim();

  if (trimmedTitle.length > 0) {
    return trimmedTitle;
  }

  return `Quote ${input.quoteNumber}`.trim();
}

export function getPublicQuotePageMetadata(
  input: PublicQuoteMetadataInput,
): Metadata {
  const primaryLabel = resolvePrimaryLabel(input);

  return createPageMetadata({
    absoluteTitle: `${primaryLabel} · ${input.businessName}`,
    description: `Review and respond to this quote from ${input.businessName}.`,
    noIndex: true,
    pathname: `/quote/${input.token}`,
  });
}

export function getMissingPublicQuoteMetadata(token?: string): Metadata {
  const trimmedToken = token?.trim();

  return createPageMetadata({
    absoluteTitle: "Customer quote",
    brandTitle: false,
    description: "Review and respond to a customer quote securely.",
    noIndex: true,
    ...(trimmedToken ? { pathname: `/quote/${trimmedToken}` } : {}),
  });
}
