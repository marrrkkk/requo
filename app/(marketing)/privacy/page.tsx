import type { Metadata } from "next";

import { PrivacyPolicyPage } from "@/features/legal/components/privacy-policy-page";
import { createPageMetadata } from "@/lib/seo/site";

export const metadata: Metadata = createPageMetadata({
  description:
    "Read the Requo Privacy Policy covering accounts, public inquiry pages, quote links, uploads, and AI-assisted features.",
  pathname: "/privacy",
  title: "Privacy Policy",
});

export default function PrivacyPage() {
  return <PrivacyPolicyPage />;
}
