import type { Metadata } from "next";

import { PrivacyPolicyPage } from "@/features/legal/components/privacy-policy-page";
import { createPageMetadata } from "@/lib/seo/site";

export const metadata: Metadata = createPageMetadata({
  description:
    "The Requo Privacy Policy covers accounts, public inquiry pages, quote links, uploads, and AI-assisted drafts for owner-led service businesses using Requo.",
  pathname: "/privacy",
  title: "Privacy Policy",
});

export default function PrivacyPage() {
  return <PrivacyPolicyPage />;
}
