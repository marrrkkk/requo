import type { Metadata } from "next";

export const siteName = "Requo";
export const siteTagline =
  "Manage inquiries, send quotes, and follow up in one place.";
export const siteDescription =
  "Requo is quote software for service businesses. Capture inquiries, send quotes, track status, and follow up from one workspace.";
const defaultSocialImagePath = "/opengraph-image";

type PageMetadataOptions = {
  title?: string;
  absoluteTitle?: string;
  description: string;
  pathname?: string;
  noIndex?: boolean;
  imagePath?: string;
  twitterImagePath?: string;
  imageAlt?: string;
  brandTitle?: boolean;
  openGraphType?: "website" | "article";
};

function normalizeConfiguredUrl(url: string) {
  const normalized = new URL(url);

  normalized.pathname = "/";
  normalized.search = "";
  normalized.hash = "";

  return normalized;
}

function getConfiguredSiteUrl() {
  const betterAuthUrl = process.env.BETTER_AUTH_URL?.trim();

  if (betterAuthUrl) {
    return normalizeConfiguredUrl(betterAuthUrl);
  }

  const vercelUrl = process.env.VERCEL_URL?.trim();

  if (vercelUrl) {
    return normalizeConfiguredUrl(
      vercelUrl.startsWith("http") ? vercelUrl : `https://${vercelUrl}`,
    );
  }

  return new URL("http://localhost:3000");
}

function normalizePathname(pathname: string) {
  if (pathname === "/") {
    return pathname;
  }

  const withLeadingSlash = pathname.startsWith("/") ? pathname : `/${pathname}`;

  return withLeadingSlash.endsWith("/")
    ? withLeadingSlash.slice(0, -1)
    : withLeadingSlash;
}

export function getSiteUrl() {
  return getConfiguredSiteUrl();
}

export function getSiteOrigin() {
  return getSiteUrl().origin;
}

export function absoluteUrl(pathname = "/") {
  return new URL(normalizePathname(pathname), getSiteUrl()).toString();
}

export function formatSiteTitle(title: string) {
  return title.includes(siteName) ? title : `${title} | ${siteName}`;
}

export function createNoIndexRobots() {
  return {
    googleBot: {
      follow: false,
      index: false,
      noimageindex: true,
    },
    follow: false,
    index: false,
  } satisfies NonNullable<Metadata["robots"]>;
}

export function createPageMetadata({
  title,
  absoluteTitle,
  description,
  pathname,
  noIndex = false,
  imagePath = defaultSocialImagePath,
  twitterImagePath = "/twitter-image",
  imageAlt = `${siteName} social preview`,
  brandTitle = true,
  openGraphType = "website",
}: PageMetadataOptions): Metadata {
  const socialTitle = absoluteTitle
    ? absoluteTitle
    : title
      ? brandTitle
        ? formatSiteTitle(title)
        : title
      : siteName;

  return {
    ...(absoluteTitle
      ? {
          title: {
            absolute: absoluteTitle,
          },
        }
      : title
        ? { title }
        : {}),
    description,
    ...(pathname
      ? {
          alternates: {
            canonical: normalizePathname(pathname),
          },
        }
      : {}),
    ...(noIndex ? { robots: createNoIndexRobots() } : {}),
    openGraph: {
      description,
      ...(pathname ? { url: normalizePathname(pathname) } : {}),
      images: [
        {
          alt: imageAlt,
          height: 630,
          url: normalizePathname(imagePath),
          width: 1200,
        },
      ],
      siteName,
      title: socialTitle,
      type: openGraphType,
    },
    twitter: {
      card: "summary_large_image",
      description,
      images: [normalizePathname(twitterImagePath)],
      title: socialTitle,
    },
  };
}

export function createNoIndexMetadata({
  title,
  absoluteTitle,
  description,
}: {
  title?: string;
  absoluteTitle?: string;
  description: string;
}): Metadata {
  return createPageMetadata({
    absoluteTitle,
    brandTitle: false,
    description,
    noIndex: true,
    title,
  });
}
