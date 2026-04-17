import type { Metadata } from "next";

import { TermsOfServicePage } from "@/features/legal/components/terms-of-service-page";
import { createPageMetadata } from "@/lib/seo/site";

export const metadata: Metadata = createPageMetadata({
  description:
    "Read the Requo Terms of Service covering public pages, workspaces, user content, AI-assisted features, and limits on liability.",
  pathname: "/terms",
  title: "Terms of Service",
});

export default function TermsPage() {
  return <TermsOfServicePage />;
}
