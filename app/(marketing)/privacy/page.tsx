import type { Metadata } from "next";

import { PrivacyPolicyPage } from "@/features/legal/components/privacy-policy-page";
import { legalConfig } from "@/features/legal/config";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Read the published Requo Privacy Policy for information about accounts, public inquiry pages, public quote links, uploads, and AI-assisted features.",
  alternates: {
    canonical: `${legalConfig.domain}/privacy`,
  },
};

export default function PrivacyPage() {
  return <PrivacyPolicyPage />;
}
