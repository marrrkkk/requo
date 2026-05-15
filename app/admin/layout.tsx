import type { Metadata } from "next";

import { createNoIndexMetadata } from "@/lib/seo/site";

export const metadata: Metadata = createNoIndexMetadata({
  absoluteTitle: "Requo Admin",
  description: "Internal operations surface for Requo administrators.",
});

export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}