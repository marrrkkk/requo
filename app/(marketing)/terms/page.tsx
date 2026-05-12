import type { Metadata } from "next";

import { TermsOfServicePage } from "@/features/legal/components/terms-of-service-page";
import { createPageMetadata } from "@/lib/seo/site";

export const metadata: Metadata = createPageMetadata({
  description:
    "The Requo Terms of Service cover public pages, businesses, user content, AI-assisted features, and liability limits for service businesses using Requo.",
  pathname: "/terms",
  title: "Terms of Service",
});

export default function TermsPage() {
  return <TermsOfServicePage />;
}
