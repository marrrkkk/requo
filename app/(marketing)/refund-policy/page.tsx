import type { Metadata } from "next";

import { RefundPolicyPage } from "@/features/legal/components/refund-policy-page";
import { createPageMetadata } from "@/lib/seo/site";

export const metadata: Metadata = createPageMetadata({
  description:
    "Read the Requo Refund Policy for refund eligibility, subscription cancellation, and payment provider considerations.",
  pathname: "/refund-policy",
  title: "Refund Policy",
});

export default function RefundPage() {
  return <RefundPolicyPage />;
}
