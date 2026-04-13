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
import { workspacesHubPath } from "@/features/workspaces/routes";

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
    redirect(workspacesHubPath);
  }

  if (!hasOperationalBusinessAccess(businessContext.role)) {
    redirect(getBusinessDashboardPath(businessContext.business.slug));
  }

  const form = await getDefaultBusinessInquiryFormForBusiness(
    businessContext.business.id,
  );

  redirect(getBusinessInquiryFormPreviewPath(slug, form?.slug ?? "main"));
}
