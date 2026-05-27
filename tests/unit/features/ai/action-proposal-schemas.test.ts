import { describe, expect, it } from "vitest";

import {
  normalizeFollowUpChannel,
  normalizeInquiryContactMethod,
  normalizeIsoDateInput,
  validateActionProposalPayload,
  type CreateQuotePayload,
} from "@/features/ai/action-proposal-schemas";

describe("action-proposal-schemas", () => {
  it("normalizes common contact method aliases", () => {
    expect(normalizeInquiryContactMethod("SMS")).toBe("phone");
    expect(normalizeInquiryContactMethod("E-Mail")).toBe("email");
    expect(normalizeInquiryContactMethod("WhatsApp")).toBe("whatsapp");
  });

  it("normalizes follow-up channel aliases", () => {
    expect(normalizeFollowUpChannel("text")).toBe("sms");
    expect(normalizeFollowUpChannel("facebook")).toBe("messenger");
  });

  it("normalizes ISO dates from datetime strings", () => {
    expect(normalizeIsoDateInput("2025-02-15T12:00:00.000Z")).toBe("2025-02-15");
    expect(normalizeIsoDateInput("not-a-date")).toBeNull();
  });

  it("accepts a valid quote draft after coercion", () => {
    const result = validateActionProposalPayload("create_quote", {
      title: "Kitchen refresh",
      customerName: "Alex Rivera",
      customerEmail: "",
      customerContactMethod: "email",
      customerContactHandle: "alex@example.com",
      validUntil: "2025-03-01T00:00:00.000Z",
      items: [
        {
          description: "Cabinet install",
          quantity: "2",
          unitPriceInCents: "15000",
        },
      ],
      discountInCents: 0,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      const payload = result.payload as CreateQuotePayload;
      expect(payload.validUntil).toBe("2025-03-01");
      expect(payload.items[0]?.quantity).toBe(2);
      expect(payload.items[0]?.unitPriceInCents).toBe(15000);
    }
  });

  it("rejects quote drafts with unsupported contact methods", () => {
    const result = validateActionProposalPayload("create_quote", {
      title: "Kitchen refresh",
      customerName: "Alex Rivera",
      customerContactMethod: "telegram",
      customerContactHandle: "@alex",
      validUntil: "2025-03-01",
      items: [
        {
          description: "Cabinet install",
          quantity: 1,
          unitPriceInCents: 15000,
        },
      ],
    });

    expect(result.ok).toBe(false);
  });

  it("rejects follow-ups without a linked entity", () => {
    const result = validateActionProposalPayload("create_follow_up", {
      title: "Check in",
      reason: "No response yet",
      channel: "email",
      dueDate: "2025-03-01",
    });

    expect(result.ok).toBe(false);
  });
});
