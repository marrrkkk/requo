import { redirect } from "next/navigation";

import { getBusinessInquiryFormsPath } from "@/features/businesses/routes";
import { getBusinessOwnerPageContext } from "../_lib/page-context";

export default async function LegacyBusinessInquiryFormsRedirect() {
  const { businessContext } = await getBusinessOwnerPageContext();

  redirect(getBusinessInquiryFormsPath(businessContext.business.slug));
}
