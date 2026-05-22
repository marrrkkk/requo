import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getBusinessInquiryFormsPath } from "@/features/businesses/routes";
import { createNoIndexMetadata } from "@/lib/seo/site";
import { getBusinessOperationalPageContext } from "../_lib/page-context";

export const metadata: Metadata = createNoIndexMetadata({
  title: "Inquiry",
  description: "Redirects to the current inquiry forms settings location.",
});

export default async function LegacyBusinessInquirySettingsRedirect() {
  const { businessContext } = await getBusinessOperationalPageContext();

  redirect(getBusinessInquiryFormsPath(businessContext.business.slug));
}
