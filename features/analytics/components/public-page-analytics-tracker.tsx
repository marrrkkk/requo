"use client";

import { useEffect } from "react";

import type { PublicAnalyticsEventInput } from "@/features/analytics/schemas";

const publicAnalyticsEndpoint = "/api/public/analytics";

function trackPublicAnalyticsEvent(payload: PublicAnalyticsEventInput) {
  const body = JSON.stringify(payload);

  if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
    const didQueue = navigator.sendBeacon(
      publicAnalyticsEndpoint,
      new Blob([body], {
        type: "application/json",
      }),
    );

    if (didQueue) {
      return;
    }
  }

  void fetch(publicAnalyticsEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body,
    keepalive: true,
  }).catch(() => {
    // Best-effort analytics capture should never interrupt public flows.
  });
}

export function PublicInquiryFormViewTracker({
  businessId,
  businessInquiryFormId,
}: {
  businessId: string;
  businessInquiryFormId: string;
}) {
  useEffect(() => {
    trackPublicAnalyticsEvent({
      eventType: "inquiry_form_viewed",
      businessId,
      businessInquiryFormId,
    });
  }, [businessId, businessInquiryFormId]);

  return null;
}

export function PublicQuoteViewTracker({
  businessId,
  quoteId,
}: {
  businessId: string;
  quoteId: string;
}) {
  useEffect(() => {
    trackPublicAnalyticsEvent({
      eventType: "quote_public_viewed",
      businessId,
      quoteId,
    });
  }, [businessId, quoteId]);

  return null;
}
