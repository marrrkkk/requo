import { NextResponse } from "next/server";

import { publicAnalyticsEventSchema } from "@/features/analytics/schemas";
import {
  createBusinessScopedVisitorHash,
  isTrackablePublicInquiryForm,
  isTrackablePublicQuote,
  recordPublicInquiryFormView,
  recordPublicQuoteView,
} from "@/features/analytics/tracking";
import { recordQuotePublicViewAt } from "@/features/quotes/mutations";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsedBody = publicAnalyticsEventSchema.safeParse(body);

  if (!parsedBody.success) {
    return NextResponse.json(
      {
        error: "Invalid analytics event.",
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
        status: 400,
      },
    );
  }

  const visitorHash = createBusinessScopedVisitorHash(
    parsedBody.data.businessId,
    request.headers,
  );

  if (parsedBody.data.eventType === "inquiry_form_viewed") {
    const isTrackable = await isTrackablePublicInquiryForm(parsedBody.data);

    if (!isTrackable) {
      return NextResponse.json(
        {
          ok: true,
          tracked: false,
        },
        {
          headers: {
            "Cache-Control": "no-store",
          },
        },
      );
    }

    const result = await recordPublicInquiryFormView({
      businessId: parsedBody.data.businessId,
      businessInquiryFormId: parsedBody.data.businessInquiryFormId,
      visitorHash,
    });

    return NextResponse.json(
      {
        ok: true,
        tracked: result.recorded,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }

  const isTrackable = await isTrackablePublicQuote(parsedBody.data);

  if (!isTrackable) {
    return NextResponse.json(
      {
        ok: true,
        tracked: false,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }

  const result = await recordPublicQuoteView({
    businessId: parsedBody.data.businessId,
    quoteId: parsedBody.data.quoteId,
    visitorHash,
  });

  await recordQuotePublicViewAt(parsedBody.data.quoteId);

  return NextResponse.json(
    {
      ok: true,
      tracked: result.recorded,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
