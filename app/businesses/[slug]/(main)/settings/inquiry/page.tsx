import { redirect } from "next/navigation";

import { getBusinessInquiryFormsPath } from "@/features/businesses/routes";
import { getBusinessOperationalPageContext } from "../_lib/page-context";

export default async function LegacyBusinessInquirySettingsRedirect() {
  const { businessContext } = await getBusinessOperationalPageContext();

  redirect(getBusinessInquiryFormsPath(businessContext.business.slug));
}
