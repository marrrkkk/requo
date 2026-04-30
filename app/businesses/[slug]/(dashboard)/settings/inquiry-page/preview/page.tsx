import { redirect } from "next/navigation";

import { getDefaultBusinessInquiryFormForBusiness } from "@/features/settings/queries";
import {
  getBusinessInquiryFormPreviewPath,
  getBusinessInquiryFormsPath,
} from "@/features/businesses/routes";
import { getBusinessOperationalPageContext } from "../../_lib/page-context";

export default async function LegacyBusinessInquiryPagePreviewRedirect() {
  const { businessContext } = await getBusinessOperationalPageContext();

  const form = await getDefaultBusinessInquiryFormForBusiness(
    businessContext.business.id,
  );

  if (!form) {
    redirect(getBusinessInquiryFormsPath(businessContext.business.slug));
  }

  redirect(
    getBusinessInquiryFormPreviewPath(
      businessContext.business.slug,
      form.slug,
    ),
  );
}
