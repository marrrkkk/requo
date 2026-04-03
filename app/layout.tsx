import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";

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
    default: "QuoteFlow",
    template: "%s | QuoteFlow",
  },
  description:
    "QuoteFlow helps small service businesses turn scattered customer inquiries into organized quotes and bookings.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-screen bg-background text-foreground selection:bg-primary selection:text-primary-foreground">
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  );
}
