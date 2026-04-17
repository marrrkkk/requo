import type { Metadata } from "next";

import { RefundPolicyPage } from "@/features/legal/components/refund-policy-page";
import { legalConfig } from "@/features/legal/config";

export const metadata: Metadata = {
  title: "Refund Policy",
  description:
    "Read the published Requo Refund Policy for information about refund eligibility, subscription cancellation, and payment provider considerations.",
  alternates: {
    canonical: `${legalConfig.domain}/refund-policy`,
  },
};

export default function RefundPage() {
  return <RefundPolicyPage />;
}
