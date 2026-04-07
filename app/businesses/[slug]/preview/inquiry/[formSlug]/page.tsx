import Link from "next/link";
import { ArrowLeft, Eye } from "lucide-react";
import { notFound, redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { submitPublicInquiryAction } from "@/features/inquiries/actions";
import { PublicInquiryPageRenderer } from "@/features/inquiries/components/public-inquiry-page-renderer";
import { getInquiryBusinessPreviewByFormSlug } from "@/features/inquiries/queries";
import { requireSession } from "@/lib/auth/session";
import { getBusinessContextForMembershipSlug } from "@/lib/db/business-access";
import {
  getBusinessDashboardPath,
  getBusinessInquiryPageEditorPath,
  businessesHubPath,
} from "@/features/businesses/routes";

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
    redirect(businessesHubPath);
  }

  if (businessContext.role !== "owner") {
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
    <PublicInquiryPageRenderer
      business={business}
      action={submitPublicInquiry}
      previewMode
      beforeHero={
        <div className="w-full">
          <Card className="border-primary/22 bg-primary/12 shadow-none">
            <CardContent className="flex items-center justify-between gap-3 p-3 sm:p-4">
              <div className="flex min-w-0 items-center gap-2 text-sm font-medium text-primary">
                <Eye className="size-4 text-primary" />
                <span>Preview</span>
              </div>
              <Button asChild variant="outline">
                <Link href={settingsHref} prefetch={true}>
                  <ArrowLeft data-icon="inline-start" />
                  Back to editor
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      }
    />
  );
}
