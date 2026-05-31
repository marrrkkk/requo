type OrganizationStructuredDataOptions = {
  address?: PostalAddress;
  description: string;
  email?: string;
  logoUrl: string;
  name: string;
  sameAs?: ReadonlyArray<string>;
  url: string;
};

type WebsiteStructuredDataOptions = {
  description: string;
  name: string;
  url: string;
};

type SoftwareApplicationOffer = {
  price: number;
  priceCurrency: string;
  url: string;
};

type SoftwareApplicationStructuredDataOptions = {
  applicationCategory?: string;
  description: string;
  featureList?: ReadonlyArray<string>;
  name: string;
  offers?: SoftwareApplicationOffer;
  operatingSystem?: string;
  url: string;
};

type PublicInquiryWebPageStructuredDataOptions = {
  description: string;
  organizationLogoAbsoluteUrl: string | null;
  organizationName: string;
  pageName: string;
  pageUrl: string;
  siteName: string;
  siteOrigin: string;
};

type FaqPageStructuredDataOptions = {
  items: ReadonlyArray<{
    question: string;
    answer: string;
  }>;
};

type HowToStructuredDataOptions = {
  name: string;
  description: string;
  steps: ReadonlyArray<{
    name: string;
    text: string;
  }>;
};

type PostalAddress = {
  streetAddress?: string;
  addressLocality?: string;
  addressRegion?: string;
  postalCode?: string;
  addressCountry?: string;
};

type ProductPricingStructuredDataOptions = {
  name: string;
  description: string;
  url: string;
  offers: ReadonlyArray<{
    name: string;
    priceCurrency: string;
    price: number;
    billingIncrement: "month" | "year";
  }>;
};

type LocalBusinessStructuredDataOptions = {
  name: string;
  url: string;
  description: string;
  logoUrl?: string;
  address?: PostalAddress;
  telephone?: string;
  areaServed?: string;
};

type BreadcrumbListStructuredDataOptions = {
  items: ReadonlyArray<{
    name: string;
    url: string;
  }>;
};

export function getFaqPageStructuredData({
  items,
}: FaqPageStructuredDataOptions) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}

export function getHowToStructuredData({
  name,
  description,
  steps,
}: HowToStructuredDataOptions) {
  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name,
    description,
    step: steps.map((step, index) => ({
      "@type": "HowToStep",
      position: index + 1,
      name: step.name,
      text: step.text,
    })),
  };
}

export function getOrganizationStructuredData({
  address,
  description,
  email,
  logoUrl,
  name,
  sameAs,
  url,
}: OrganizationStructuredDataOptions) {
  const hasAddress = Boolean(
    address &&
      (address.streetAddress ||
        address.addressLocality ||
        address.addressRegion ||
        address.postalCode ||
        address.addressCountry),
  );

  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    description,
    ...(email ? { email } : {}),
    logo: logoUrl,
    name,
    url,
    ...(hasAddress && address
      ? {
          address: {
            "@type": "PostalAddress",
            ...(address.streetAddress
              ? { streetAddress: address.streetAddress }
              : {}),
            ...(address.addressLocality
              ? { addressLocality: address.addressLocality }
              : {}),
            ...(address.addressRegion
              ? { addressRegion: address.addressRegion }
              : {}),
            ...(address.postalCode ? { postalCode: address.postalCode } : {}),
            ...(address.addressCountry
              ? { addressCountry: address.addressCountry }
              : {}),
          },
        }
      : {}),
    ...(sameAs && sameAs.length > 0 ? { sameAs: [...sameAs] } : {}),
  };
}

export function getWebsiteStructuredData({
  description,
  name,
  url,
}: WebsiteStructuredDataOptions) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    description,
    name,
    url,
  };
}

export function getSoftwareApplicationStructuredData({
  applicationCategory = "BusinessApplication",
  description,
  featureList,
  name,
  offers,
  operatingSystem = "Web",
  url,
}: SoftwareApplicationStructuredDataOptions) {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    applicationCategory,
    description,
    name,
    operatingSystem,
    url,
    ...(featureList && featureList.length > 0
      ? { featureList: [...featureList] }
      : {}),
    ...(offers
      ? {
          offers: {
            "@type": "Offer",
            price: offers.price,
            priceCurrency: offers.priceCurrency,
            url: offers.url,
          },
        }
      : {}),
  };
}

export function getPublicInquiryWebPageStructuredData({
  description,
  organizationLogoAbsoluteUrl,
  organizationName,
  pageName,
  pageUrl,
  siteName,
  siteOrigin,
}: PublicInquiryWebPageStructuredDataOptions) {
  const publisher = {
    "@type": "Organization",
    name: organizationName,
    ...(organizationLogoAbsoluteUrl
      ? { logo: organizationLogoAbsoluteUrl }
      : {}),
  };

  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    about: publisher,
    description,
    isPartOf: {
      "@type": "WebSite",
      name: siteName,
      url: siteOrigin,
    },
    name: pageName,
    publisher,
    url: pageUrl,
  };
}

function toUnitCode(billingIncrement: "month" | "year") {
  return billingIncrement === "month" ? "MON" : "ANN";
}

export function getProductPricingStructuredData({
  name,
  description,
  url,
  offers,
}: ProductPricingStructuredDataOptions): Record<string, unknown> {
  const pricedOffers = offers.map((offer) => ({
    "@type": "Offer",
    name: offer.name,
    price: offer.price,
    priceCurrency: offer.priceCurrency,
    priceSpecification: {
      "@type": "UnitPriceSpecification",
      price: offer.price,
      priceCurrency: offer.priceCurrency,
      unitCode: toUnitCode(offer.billingIncrement),
    },
  }));

  const prices = offers.map((offer) => offer.price);
  const lowPrice = Math.min(...prices);
  const highPrice = Math.max(...prices);
  const priceCurrency = offers[0]?.priceCurrency ?? "USD";

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name,
    description,
    url,
    offers: {
      "@type": "AggregateOffer",
      lowPrice,
      highPrice,
      priceCurrency,
      offerCount: pricedOffers.length,
      offers: pricedOffers,
    },
  };
}

export function getLocalBusinessStructuredData({
  name,
  url,
  description,
  logoUrl,
  address,
  telephone,
  areaServed,
}: LocalBusinessStructuredDataOptions): Record<string, unknown> | null {
  if (!name || !url || !description) {
    return null;
  }

  const hasAddress = Boolean(
    address &&
      (address.streetAddress ||
        address.addressLocality ||
        address.addressRegion ||
        address.postalCode ||
        address.addressCountry),
  );

  return {
    "@context": "https://schema.org",
    "@type": hasAddress ? "LocalBusiness" : "ProfessionalService",
    name,
    url,
    description,
    ...(logoUrl ? { logo: logoUrl } : {}),
    ...(hasAddress && address
      ? {
          address: {
            "@type": "PostalAddress",
            ...(address.streetAddress
              ? { streetAddress: address.streetAddress }
              : {}),
            ...(address.addressLocality
              ? { addressLocality: address.addressLocality }
              : {}),
            ...(address.addressRegion
              ? { addressRegion: address.addressRegion }
              : {}),
            ...(address.postalCode ? { postalCode: address.postalCode } : {}),
            ...(address.addressCountry
              ? { addressCountry: address.addressCountry }
              : {}),
          },
        }
      : {}),
    ...(telephone ? { telephone } : {}),
    ...(areaServed ? { areaServed } : {}),
  };
}

export function getBreadcrumbListStructuredData({
  items,
}: BreadcrumbListStructuredDataOptions): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

function titleizeSegment(segment: string): string {
  const decoded = (() => {
    try {
      return decodeURIComponent(segment);
    } catch {
      return segment;
    }
  })();

  return decoded
    .split(/[-_]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function buildBreadcrumbsForPathname(
  pathname: string,
  labels: Record<string, string>,
): Array<{ name: string; url: string }> {
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length === 0) {
    return [];
  }

  const breadcrumbs: Array<{ name: string; url: string }> = [];
  let accumulated = "";

  for (const segment of segments) {
    accumulated = `${accumulated}/${segment}`;
    const label = labels[accumulated] ?? titleizeSegment(segment);
    breadcrumbs.push({ name: label, url: accumulated });
  }

  return breadcrumbs;
}

export function encodeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/<\//g, "<\\/");
}
