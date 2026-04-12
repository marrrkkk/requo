import type { Metadata } from "next";

import { TermsOfServicePage } from "@/features/legal/components/terms-of-service-page";
import { legalConfig } from "@/features/legal/config";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "Read the published Requo Terms of Service governing access to public pages, workspaces, user content, AI-assisted features, and limits on liability.",
  alternates: {
    canonical: `${legalConfig.domain}/terms`,
  },
};

export default function TermsPage() {
  return <TermsOfServicePage />;
}
