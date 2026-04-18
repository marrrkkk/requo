import type { Metadata } from "next";

import { createNoIndexMetadata } from "@/lib/seo/site";

export const metadata: Metadata = createNoIndexMetadata({
  absoluteTitle: "Customer page",
  description: "Customer-facing workflow pages served by Requo.",
});

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
