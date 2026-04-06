import type { Metadata } from "next";

import { MarketingHero } from "@/components/marketing/marketing-hero";

export const metadata: Metadata = {
  title: "Organized quotes for small service businesses",
  description:
    "Requo helps owner-operated service businesses capture better inquiries, build clear quotes, and follow up from one calm dashboard.",
};

export default function MarketingPage() {
  return <MarketingHero />;
}
