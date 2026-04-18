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
