import "server-only";

import { db } from "@/lib/db/client";
import { analyticsEvents } from "@/lib/db/schema";
import { getPublicActionClientIpAddress } from "@/lib/public-action-rate-limit";
import { hashOpaqueToken } from "@/lib/security/tokens";

export type PublicAnalyticsHeaderStore = Pick<Headers, "get">;

type AnalyticsEventType = "inquiry_form_viewed" | "quote_public_viewed";

type RecordAnalyticsEventInput = {
  businessId: string;
  businessInquiryFormId?: string | null;
  quoteId?: string | null;
  eventType: AnalyticsEventType;
  visitorHash: string;
  occurredAt?: Date;
};

function createId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "")}`;
}

export function createBusinessScopedVisitorHash(
  businessId: string,
  headerStore: PublicAnalyticsHeaderStore,
) {
  const ipAddress = getPublicActionClientIpAddress(headerStore);
  const userAgent = headerStore.get("user-agent")?.trim() || "unknown";

  return hashOpaqueToken(`${businessId}:${ipAddress}:${userAgent}`);
}

export async function recordAnalyticsEvent({
  businessId,
  businessInquiryFormId = null,
  quoteId = null,
  eventType,
  visitorHash,
  occurredAt = new Date(),
}: RecordAnalyticsEventInput) {
  await db.insert(analyticsEvents).values({
    id: createId("evt"),
    businessId,
    businessInquiryFormId,
    quoteId,
    eventType,
    visitorHash,
    occurredAt,
  });
}

export async function recordPublicInquiryFormView(input: {
  businessId: string;
  businessInquiryFormId: string;
  visitorHash: string;
  occurredAt?: Date;
}) {
  await recordAnalyticsEvent({
    ...input,
    eventType: "inquiry_form_viewed",
  });
}

export async function recordPublicQuoteView(input: {
  businessId: string;
  quoteId: string;
  visitorHash: string;
  occurredAt?: Date;
}) {
  await recordAnalyticsEvent({
    ...input,
    eventType: "quote_public_viewed",
  });
}
