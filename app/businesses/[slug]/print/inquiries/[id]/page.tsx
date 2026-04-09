import { notFound } from "next/navigation";

import { PrintPageShell } from "@/components/shared/print-page-shell";
import { InquiryPrintDocument } from "@/features/inquiries/components/inquiry-print-document";
import { getInquiryDetailForBusiness } from "@/features/inquiries/queries";
import { inquiryRouteParamsSchema } from "@/features/inquiries/schemas";
import { getBusinessInquiryPath } from "@/features/businesses/routes";
import { getBusinessRequestContextForSlug } from "@/lib/db/business-access";

type InquiryPrintPageProps = {
  params: Promise<{
    slug: string;
    id: string;
  }>;
};

export default async function InquiryPrintPage({
  params,
}: InquiryPrintPageProps) {
  const resolvedParams = await params;
  const requestContext = await getBusinessRequestContextForSlug(
    resolvedParams.slug,
  );

  const parsedParams = inquiryRouteParamsSchema.safeParse({
    id: resolvedParams.id,
  });

  if (!parsedParams.success || !requestContext) {
    notFound();
  }

  const inquiry = await getInquiryDetailForBusiness({
    businessId: requestContext.businessContext.business.id,
    inquiryId: parsedParams.data.id,
  });

  if (!inquiry) {
    notFound();
  }

  return (
    <PrintPageShell
      backHref={getBusinessInquiryPath(resolvedParams.slug, inquiry.id)}
      backLabel="Back to request"
      description="Submitted request content only. Internal notes, activity, AI, and status controls are intentionally omitted."
      title={`Request ${inquiry.id}`}
    >
      <InquiryPrintDocument
        businessCurrency={requestContext.businessContext.business.defaultCurrency}
        businessName={requestContext.businessContext.business.name}
        inquiry={inquiry}
      />
    </PrintPageShell>
  );
}
