import { redirect } from "next/navigation";

import { getBusinessInquiryFormEditorPath } from "@/features/businesses/routes";
import { getBusinessOwnerPageContext } from "../../_lib/page-context";

export default async function LegacyBusinessInquiryFormRedirect({
  params,
}: {
  params: Promise<{ formSlug: string }>;
}) {
  const { businessContext } = await getBusinessOwnerPageContext();
  const { formSlug } = await params;

  redirect(
    getBusinessInquiryFormEditorPath(businessContext.business.slug, formSlug),
  );
}
