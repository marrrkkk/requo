import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getBusinessSettingsPath } from "@/features/businesses/routes";
import { getBusinessOperationalPageContext } from "../_lib/page-context";

export const metadata: Metadata = {
  title: "Pricing",
};

export default async function LegacyBusinessPricingLibraryRedirect() {
  const { businessContext } = await getBusinessOperationalPageContext();

  redirect(getBusinessSettingsPath(businessContext.business.slug, "pricing"));
}
