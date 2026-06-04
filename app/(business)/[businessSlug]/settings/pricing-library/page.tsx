import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { getBusinessSettingsPath } from "@/features/businesses/routes";
import { createNoIndexMetadata } from "@/lib/seo/site";
import { getBusinessOperationalPageContext } from "../_lib/page-context";

export const metadata: Metadata = createNoIndexMetadata({
  title: "Pricing",
  description: "Redirects to the current pricing settings location.",
});

export const unstable_instant = {
  prefetch: "static",
  samples: [
    {
      params: { businessSlug: "demo" },
      headers: [
        ["rsc", "1"],
        ["next-action", null],
      ],
    },
  ],
};

export default function LegacyBusinessPricingLibraryRedirect() {
  return (
    <Suspense fallback={null}>
      <PricingLibraryRedirectContent />
    </Suspense>
  );
}

async function PricingLibraryRedirectContent() {
  const { businessContext } = await getBusinessOperationalPageContext();
  redirect(getBusinessSettingsPath(businessContext.business.slug, "pricing"));
  return null as never;
}
