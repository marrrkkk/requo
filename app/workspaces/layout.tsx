import type { Metadata } from "next";

import { createNoIndexMetadata } from "@/lib/seo/site";

export const metadata: Metadata = createNoIndexMetadata({
  absoluteTitle: "Requo workspaces",
  description: "Private workspace and billing pages for Requo users.",
});
export const preferredRegion = "syd1";

export default function WorkspacesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
