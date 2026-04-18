import type { Metadata } from "next";

import { createNoIndexMetadata } from "@/lib/seo/site";

export const metadata: Metadata = createNoIndexMetadata({
  absoluteTitle: "Requo account",
  description: "Private account settings for Requo users.",
});
export const preferredRegion = "syd1";

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
