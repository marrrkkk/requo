import type { Metadata } from "next";

import { createNoIndexMetadata } from "@/lib/seo/site";

export const metadata: Metadata = createNoIndexMetadata({
  absoluteTitle: "Requo",
  description: "Private business pages for Requo users.",
});
export const preferredRegion = "syd1";

export default function BusinessesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
