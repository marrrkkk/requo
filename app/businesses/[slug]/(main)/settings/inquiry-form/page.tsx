import { redirect } from "next/navigation";

import { getDefaultBusinessInquiryFormForBusiness } from "@/features/settings/queries";
import {
  getBusinessInquiryFormEditorPath,
  getBusinessInquiryFormsPath,
} from "@/features/businesses/routes";
import { getBusinessOperationalPageContext } from "../_lib/page-context";

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
