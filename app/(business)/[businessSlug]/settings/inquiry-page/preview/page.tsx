import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getDefaultBusinessInquiryFormForBusiness } from "@/features/settings/queries";
import {
  getBusinessInquiryFormPreviewPath,
  getBusinessInquiryFormsPath,
} from "@/features/businesses/routes";
import { createNoIndexMetadata } from "@/lib/seo/site";
import { getBusinessOperationalPageContext } from "../../_lib/page-context";

export const metadata: Metadata = createNoIndexMetadata({
  title: "Preview",
  description: "Redirects to the current inquiry form preview.",
});

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
