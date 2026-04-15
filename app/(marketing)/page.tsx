import type { Metadata } from "next";

import { MarketingHero } from "@/components/marketing/marketing-hero";

export const metadata: Metadata = {
  title: "Manage inquiries, quotes, and follow-up | Requo",
  description:
    "Requo helps service businesses manage incoming requests, quotes, and follow-up from one calm owner workflow.",
};

export default function MarketingPage() {
  return <MarketingHero />;
}
