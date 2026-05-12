import type { Metadata } from "next";

import { RefundPolicyPage } from "@/features/legal/components/refund-policy-page";
import { createPageMetadata } from "@/lib/seo/site";

export const metadata: Metadata = createPageMetadata({
  description:
    "The Requo Refund Policy explains refund eligibility, subscription cancellation, and payment provider notes for owner-led service businesses using Requo.",
  pathname: "/refund-policy",
  title: "Refund Policy",
});

export default function RefundPage() {
  return <RefundPolicyPage />;
}
