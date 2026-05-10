type OrganizationStructuredDataOptions = {
  description: string;
  email?: string;
  logoUrl: string;
  name: string;
  url: string;
};

type WebsiteStructuredDataOptions = {
  description: string;
  name: string;
  url: string;
};

type SoftwareApplicationStructuredDataOptions = {
  applicationCategory?: string;
  description: string;
  name: string;
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

export function getOrganizationStructuredData({
  description,
  email,
  logoUrl,
  name,
  url,
}: OrganizationStructuredDataOptions) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    description,
    ...(email ? { email } : {}),
    logo: logoUrl,
    name,
    url,
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
  name,
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
