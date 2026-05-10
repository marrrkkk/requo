import type { Metadata } from "next";
import { redirect } from "next/navigation";

import {
  getBusinessInquiryFormEditorPath,
  getBusinessInquiryFormsPath,
} from "@/features/businesses/routes";
import { getDefaultBusinessInquiryFormForBusiness } from "@/features/settings/queries";
import { getBusinessOperationalPageContext } from "../_lib/page-context";

export const metadata: Metadata = {
  title: "Inquiry form",
};

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
