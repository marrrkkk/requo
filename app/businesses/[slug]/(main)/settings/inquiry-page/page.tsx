import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getDefaultBusinessInquiryFormForBusiness } from "@/features/settings/queries";
import {
  getBusinessInquiryFormsPath,
  getBusinessInquiryPageEditorPath,
} from "@/features/businesses/routes";
import { createNoIndexMetadata } from "@/lib/seo/site";
import { getBusinessOperationalPageContext } from "../_lib/page-context";

export const metadata: Metadata = createNoIndexMetadata({
  title: "Inquiry page",
  description: "Edit the public inquiry page linked to this business.",
});

export default async function BusinessInquiryPageSettingsPage() {
  const { businessContext } = await getBusinessOperationalPageContext();
  const form = await getDefaultBusinessInquiryFormForBusiness(
    businessContext.business.id,
  );

  if (!form) {
    redirect(getBusinessInquiryFormsPath(businessContext.business.slug));
  }

  redirect(
    getBusinessInquiryPageEditorPath(businessContext.business.slug, form.slug),
  );
}
