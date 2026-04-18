import { headers } from "next/headers";
import { after } from "next/server";

import {
  createBusinessScopedVisitorHash,
  recordPublicInquiryFormView,
  recordPublicQuoteView,
} from "@/features/analytics/tracking";
import { recordQuotePublicViewAt } from "@/features/quotes/mutations";

export async function PublicInquiryFormViewTracker({
  businessId,
  businessInquiryFormId,
}: {
  businessId: string;
  businessInquiryFormId: string;
}) {
  const headerStore = await headers();
  const visitorHash = createBusinessScopedVisitorHash(businessId, headerStore);

  after(async () => {
    try {
      await recordPublicInquiryFormView({
        businessId,
        businessInquiryFormId,
        visitorHash,
      });
    } catch (error) {
      console.error("Failed to record public inquiry form view.", error);
    }
  });

  return null;
}

export async function PublicQuoteViewTracker({
  businessId,
  quoteId,
}: {
  businessId: string;
  quoteId: string;
}) {
  const headerStore = await headers();
  const visitorHash = createBusinessScopedVisitorHash(businessId, headerStore);

  after(async () => {
    try {
      await Promise.all([
        recordQuotePublicViewAt(quoteId),
        recordPublicQuoteView({
          businessId,
          quoteId,
          visitorHash,
        }),
      ]);
    } catch (error) {
      console.error("Failed to record public quote view.", error);
    }
  });

  return null;
}
