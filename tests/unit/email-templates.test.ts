import { describe, expect, it } from "vitest";

import { renderPublicInquiryNotificationEmail } from "@/emails/templates/public-inquiry-notification";
import { renderQuoteEmail } from "@/emails/templates/quote-email";

describe("Requo email templates", () => {
  it("renders a branded quote email with primary CTA color and text fallback", () => {
    const template = renderQuoteEmail({
      businessName: "BrightSide Print Studio",
      customerName: "Ava Cruz",
      quoteNumber: "Q-1042",
      title: "Storefront signage package",
      publicQuoteUrl: "https://test.requo.app/quote/q_1042",
      currency: "USD",
      validUntil: "2026-05-30",
      subtotalInCents: 240000,
      discountInCents: 10000,
      totalInCents: 230000,
      notes: "Includes installation.",
      emailSignature: "Thanks,\nBrightSide",
      items: [
        {
          description: "Signage design and installation",
          quantity: 1,
          unitPriceInCents: 240000,
          lineTotalInCents: 240000,
        },
      ],
    });

    expect(template.html).toContain("Requo");
    expect(template.html).toContain("#008060");
    expect(template.html).toContain("Storefront signage package");
    expect(template.text).toContain("https://test.requo.app/quote/q_1042");
  });

  it("renders a branded inquiry notification with clear details and text fallback", () => {
    const template = renderPublicInquiryNotificationEmail({
      businessName: "BrightSide Print Studio",
      dashboardUrl: "https://test.requo.app/businesses/brightside/inquiries/1",
      inquiryFormName: "General inquiries",
      customerName: "Ava Cruz",
      customerEmail: "ava@example.com",
      customerContactMethod: "email",
      customerContactHandle: "ava@example.com",
      serviceCategory: "Signage",
      details: "We need a new storefront sign.",
    });

    expect(template.html).toContain("Requo");
    expect(template.html).toContain("#008060");
    expect(template.html).toContain("Inquiry details");
    expect(template.text).toContain("Open in Requo:");
  });
});
