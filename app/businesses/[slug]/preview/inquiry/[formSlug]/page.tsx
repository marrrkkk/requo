import { notFound, redirect } from "next/navigation";

import { BusinessInquiryPreviewShell } from "@/features/inquiries/components/business-inquiry-preview-shell";
import { submitPublicInquiryAction } from "@/features/inquiries/actions";
import { getInquiryBusinessPreviewByFormSlug } from "@/features/inquiries/queries";
import { requireSession } from "@/lib/auth/session";
import {
  getBusinessContextForMembershipSlug,
  hasOperationalBusinessAccess,
} from "@/lib/db/business-access";
import {
  getBusinessDashboardPath,
  getBusinessInquiryPageEditorPath,
} from "@/features/businesses/routes";
import { workspacesHubPath } from "@/features/workspaces/routes";


export default async function BusinessInquiryFormPreviewPage({
  params,
}: {
  params: Promise<{ slug: string; formSlug: string }>;
}) {
  const [session, { slug, formSlug }] = await Promise.all([
    requireSession(),
    params,
  ]);
  const [businessContext, business] = await Promise.all([
    getBusinessContextForMembershipSlug(session.user.id, slug),
    getInquiryBusinessPreviewByFormSlug({
      businessSlug: slug,
      formSlug,
    }),
  ]);

  if (!businessContext) {
    redirect(workspacesHubPath);
  }

  if (!hasOperationalBusinessAccess(businessContext.role)) {
    redirect(getBusinessDashboardPath(businessContext.business.slug));
  }

  if (!business) {
    notFound();
  }

  const settingsHref = getBusinessInquiryPageEditorPath(slug, formSlug);
  const submitPublicInquiry = submitPublicInquiryAction.bind(
    null,
    business.slug,
    business.form.slug,
  );

  return (
    <BusinessInquiryPreviewShell
      action={submitPublicInquiry}
      business={business}
      settingsHref={settingsHref}
    />
  );
}
