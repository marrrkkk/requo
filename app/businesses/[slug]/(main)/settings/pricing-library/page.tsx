import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getBusinessSettingsPath } from "@/features/businesses/routes";
import { createNoIndexMetadata } from "@/lib/seo/site";
import { getBusinessOperationalPageContext } from "../_lib/page-context";

export const metadata: Metadata = createNoIndexMetadata({
  title: "Pricing",
  description: "Redirects to the current pricing settings location.",
});

export default async function LegacyBusinessPricingLibraryRedirect() {
  const { businessContext } = await getBusinessOperationalPageContext();

  redirect(getBusinessSettingsPath(businessContext.business.slug, "pricing"));
}
