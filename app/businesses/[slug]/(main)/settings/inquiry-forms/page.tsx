import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getBusinessInquiryFormsPath } from "@/features/businesses/routes";
import { getBusinessOperationalPageContext } from "../_lib/page-context";

export const metadata: Metadata = {
  title: "Inquiry forms",
};

export default async function LegacyBusinessInquiryFormsRedirect() {
  const { businessContext } = await getBusinessOperationalPageContext();

  redirect(getBusinessInquiryFormsPath(businessContext.business.slug));
}
