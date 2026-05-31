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
import { dashboardPath } from "@/features/businesses/routes";
import { createNoIndexMetadata } from "@/lib/seo/site";

export const metadata: Metadata = createNoIndexMetadata({
  title: "Inquiry page preview",
  description: "Redirects to the current inquiry form preview.",
});

export default async function BusinessInquiryPagePreviewRedirect({
  params,
}: {
  params: Promise<{ businessSlug: string }>;
}) {
  const [session, { businessSlug }] = await Promise.all([requireSession(), params]);
  const businessContext = await getBusinessContextForMembershipSlug(
    session.user.id,
    businessSlug,
  );

  if (!businessContext) {
    redirect(dashboardPath);
  }

  if (!hasOperationalBusinessAccess(businessContext.role)) {
    redirect(getBusinessDashboardPath(businessContext.business.slug));
  }

  const form = await getDefaultBusinessInquiryFormForBusiness(
    businessContext.business.id,
  );

  redirect(getBusinessInquiryFormPreviewPath(businessSlug, form?.slug ?? "main"));
}
