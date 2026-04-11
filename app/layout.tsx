import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import { Suspense } from "react";

import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { RouteProgressBar } from "@/components/shared/route-progress-bar";
import { Toaster } from "@/components/ui/sonner";
import { getThemeInitScript } from "@/features/theme/init-script";
import { TooltipProvider } from "@/components/ui/tooltip";
import { themeStorageKey } from "@/features/theme/types";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Requo",
    template: "%s | Requo",
  },
  description:
    "Requo helps service businesses turn scattered customer inquiries into organized quotes and bookings.",
  icons: {
    icon: "/logo.svg",
    shortcut: "/logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-screen bg-background text-foreground selection:bg-primary selection:text-primary-foreground">
        <Script id="requo-theme-init" strategy="beforeInteractive">
          {getThemeInitScript({
            storageKey: themeStorageKey,
          })}
        </Script>
        <ThemeProvider
          defaultTheme="system"
          disableTransitionOnChange
          enableSystem
          storageKey={themeStorageKey}
        >
          <Suspense fallback={null}>
            <RouteProgressBar />
          </Suspense>
          <TooltipProvider>{children}</TooltipProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
