import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getBusinessInquiryFormEditorPath } from "@/features/businesses/routes";
import { getBusinessOperationalPageContext } from "../../../_lib/page-context";

export const metadata: Metadata = {
  title: "Inquiry page",
};

export default async function LegacyBusinessInquiryPageEditorRedirect({
  params,
}: {
  params: Promise<{ formSlug: string }>;
}) {
  const { businessContext } = await getBusinessOperationalPageContext();
  const { formSlug } = await params;

  redirect(
    getBusinessInquiryFormEditorPath(businessContext.business.slug, formSlug),
  );
}
