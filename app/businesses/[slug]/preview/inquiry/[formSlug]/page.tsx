import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { BusinessInquiryPreviewShell } from "@/features/inquiries/components/business-inquiry-preview-shell";
import { submitPublicInquiryAction } from "@/features/inquiries/actions";
import { getInquiryBusinessPreviewByFormSlug } from "@/features/inquiries/queries";
import { requireSession } from "@/lib/auth/session";
import {
  getBusinessContextForMembershipSlug,
  hasOperationalBusinessAccess,
} from "@/lib/db/business-access";
import { timed } from "@/lib/dev/server-timing";
import {
  getBusinessDashboardPath,
  getBusinessInquiryPageEditorPath,
} from "@/features/businesses/routes";
import { businessesHubPath } from "@/features/businesses/routes";
import { createNoIndexMetadata } from "@/lib/seo/site";

export const metadata: Metadata = createNoIndexMetadata({
  title: "Inquiry form preview",
  description: "Internal preview of a business inquiry form before publishing.",
});


export default async function BusinessInquiryFormPreviewPage({
  params,
}: {
  params: Promise<{ slug: string; formSlug: string }>;
}) {
  const [session, { slug, formSlug }] = await Promise.all([
    requireSession(),
    params,
  ]);
  const [businessContext, business] = await timed(
    "previewInquiryForm.parallelContextAndBusiness",
    Promise.all([
      getBusinessContextForMembershipSlug(session.user.id, slug),
      getInquiryBusinessPreviewByFormSlug({
        businessSlug: slug,
        formSlug,
      }),
    ]),
  );

  if (!businessContext) {
    redirect(businessesHubPath);
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
