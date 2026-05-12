import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getBusinessInquiryFormEditorPath } from "@/features/businesses/routes";
import { createNoIndexMetadata } from "@/lib/seo/site";
import { getBusinessOperationalPageContext } from "../../_lib/page-context";

export const metadata: Metadata = createNoIndexMetadata({
  title: "Inquiry form",
  description: "Redirects to the current inquiry form editor.",
});

export default async function LegacyBusinessInquiryFormRedirect({
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
