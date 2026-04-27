import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import { Suspense } from "react";
import { Analytics } from "@vercel/analytics/next";

import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import {
  getReloadLoadingInitScript,
  ReloadLoadingOverlay,
} from "@/components/shared/reload-loading-overlay";
import { RouteProgressBar } from "@/components/shared/route-progress-bar";
import { WebMCPProvider } from "@/components/shared/webmcp-provider";
import { StructuredData } from "@/components/seo/structured-data";
import { Toaster } from "@/components/ui/sonner";
import { getThemeInitScript } from "@/features/theme/init-script";
import { TooltipProvider } from "@/components/ui/tooltip";
import { legalConfig } from "@/features/legal/config";
import { themeCookieKey, themeStorageKey } from "@/features/theme/types";
import {
  getOrganizationStructuredData,
  getWebsiteStructuredData,
} from "@/lib/seo/structured-data";
import {
  absoluteUrl,
  getSiteUrl,
  siteDescription,
  siteName,
  siteTagline,
} from "@/lib/seo/site";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  applicationName: siteName,
  description: siteDescription,
  metadataBase: getSiteUrl(),
  openGraph: {
    description: siteDescription,
    images: [
      {
        alt: `${siteName} social preview`,
        height: 630,
        url: "/opengraph-image",
        width: 1200,
      },
    ],
    siteName,
    title: siteName,
    type: "website",
  },
  robots: {
    follow: true,
    index: true,
  },
  title: {
    default: siteName,
    template: `%s | ${siteName}`,
  },
  icons: {
    icon: "/logo.svg",
    shortcut: "/logo.svg",
  },
  twitter: {
    card: "summary_large_image",
    description: siteDescription,
    images: ["/twitter-image"],
    title: siteName,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const organizationStructuredData = getOrganizationStructuredData({
    description: siteTagline,
    email: legalConfig.supportEmail,
    logoUrl: absoluteUrl("/logo.svg"),
    name: siteName,
    url: getSiteUrl().toString(),
  });
  const websiteStructuredData = getWebsiteStructuredData({
    description: siteDescription,
    name: siteName,
    url: getSiteUrl().toString(),
  });

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body suppressHydrationWarning className="min-h-screen bg-background text-foreground selection:bg-primary selection:text-primary-foreground">
        <ReloadLoadingOverlay />
        <Script id="requo-theme-init" strategy="beforeInteractive">
          {getThemeInitScript({
            cookieKey: themeCookieKey,
            storageKey: themeStorageKey,
          })}
        </Script>
        <Script id="requo-reload-loading-init" strategy="beforeInteractive">
          {getReloadLoadingInitScript()}
        </Script>
        <div id="app-root-content">
          <StructuredData
            data={organizationStructuredData}
            id="requo-organization-structured-data"
          />
          <StructuredData
            data={websiteStructuredData}
            id="requo-website-structured-data"
          />
          <ThemeProvider
            defaultTheme="system"
            disableTransitionOnChange
            enableSystem
            storageKey={themeStorageKey}
          >
            <Suspense fallback={null}>
              <RouteProgressBar />
              <WebMCPProvider />
            </Suspense>
            <TooltipProvider>{children}</TooltipProvider>
            <Toaster />
          </ThemeProvider>
          <Analytics />
        </div>
      </body>
    </html>
  );
}
