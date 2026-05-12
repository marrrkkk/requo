import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";

import { publicAnalyticsEventSchema } from "@/features/analytics/schemas";
import {
  createBusinessScopedVisitorHash,
  isTrackablePublicInquiryForm,
  isTrackablePublicQuote,
  recordPublicInquiryFormView,
  recordPublicQuoteView,
} from "@/features/analytics/tracking";
import { recordQuotePublicViewAt } from "@/features/quotes/mutations";
import { getOptionalSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { businessMembers } from "@/lib/db/schema";

async function isCurrentUserBusinessMember(
  businessId: string,
): Promise<boolean> {
  const session = await getOptionalSession();

  if (!session?.user) {
    return false;
  }

  const [membership] = await db
    .select({ id: businessMembers.id })
    .from(businessMembers)
    .where(
      and(
        eq(businessMembers.businessId, businessId),
        eq(businessMembers.userId, session.user.id),
      ),
    )
    .limit(1);

  return Boolean(membership);
}

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

    // Members of the business (owner, managers, staff) previewing their own
    // public inquiry page should not inflate the public-view count.
    if (await isCurrentUserBusinessMember(parsedBody.data.businessId)) {
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

  // Members of the business (owner, managers, staff) opening their own quote
  // link should not be counted as customer views and should not update the
  // "last viewed by customer" timestamp on the quote record.
  if (await isCurrentUserBusinessMember(parsedBody.data.businessId)) {
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
