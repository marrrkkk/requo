import type { Metadata } from "next";
import { redirect } from "next/navigation";

import {
  getBusinessInquiryFormEditorPath,
  getBusinessInquiryFormsPath,
} from "@/features/businesses/routes";
import { getDefaultBusinessInquiryFormForBusiness } from "@/features/settings/queries";
import { createNoIndexMetadata } from "@/lib/seo/site";
import { getBusinessOperationalPageContext } from "../_lib/page-context";

export const metadata: Metadata = createNoIndexMetadata({
  title: "Inquiry form",
  description: "Redirects to the current inquiry form editor.",
});

export default async function BusinessInquiryFormSettingsPage() {
  const { businessContext } = await getBusinessOperationalPageContext();
  const form = await getDefaultBusinessInquiryFormForBusiness(
    businessContext.business.id,
  );

  if (!form) {
    redirect(getBusinessInquiryFormsPath(businessContext.business.slug));
  }

  redirect(
    getBusinessInquiryFormEditorPath(businessContext.business.slug, form.slug),
  );
}
