import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getDefaultBusinessInquiryFormForBusiness } from "@/features/settings/queries";
import { requireSession } from "@/lib/auth/session";
import {
  getBusinessContextForMembershipSlug,
  hasOperationalBusinessAccess,
} from "@/lib/db/business-access";
import {
  getBusinessDashboardPath,
  getBusinessInquiryFormPreviewPath,
} from "@/features/businesses/routes";
import { businessesHubPath } from "@/features/businesses/routes";
import { createNoIndexMetadata } from "@/lib/seo/site";

export const metadata: Metadata = createNoIndexMetadata({
  title: "Inquiry page preview",
  description: "Redirects to the current inquiry form preview.",
});

export default async function BusinessInquiryPagePreviewRedirect({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const [session, { slug }] = await Promise.all([requireSession(), params]);
  const businessContext = await getBusinessContextForMembershipSlug(
    session.user.id,
    slug,
  );

  if (!businessContext) {
    redirect(businessesHubPath);
  }

  if (!hasOperationalBusinessAccess(businessContext.role)) {
    redirect(getBusinessDashboardPath(businessContext.business.slug));
  }

  const form = await getDefaultBusinessInquiryFormForBusiness(
    businessContext.business.id,
  );

  redirect(getBusinessInquiryFormPreviewPath(slug, form?.slug ?? "main"));
}
