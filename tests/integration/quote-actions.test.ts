import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  revalidateTagMock,
  getBusinessOwnerEmailsMock,
  assertPublicActionRateLimitMock,
  respondToPublicQuoteByTokenMock,
  sendQuoteResponseOwnerNotificationEmailMock,
} = vi.hoisted(() => ({
  revalidateTagMock: vi.fn(),
  getBusinessOwnerEmailsMock: vi.fn(),
  assertPublicActionRateLimitMock: vi.fn(),
  respondToPublicQuoteByTokenMock: vi.fn(),
  sendQuoteResponseOwnerNotificationEmailMock: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidateTag: revalidateTagMock,
  updateTag: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

vi.mock("next/server", () => ({
  after: async (callback: () => Promise<void> | void) => callback(),
}));

vi.mock("@/lib/db/business-access", () => ({
  getBusinessMessagingSettings: vi.fn(),
  getBusinessOwnerEmails: getBusinessOwnerEmailsMock,
  getWorkspaceBusinessActionContext: vi.fn(),
}));

vi.mock("@/lib/public-action-rate-limit", () => ({
  assertPublicActionRateLimit: assertPublicActionRateLimitMock,
}));

vi.mock("@/features/quotes/mutations", () => ({
  archiveQuoteForBusiness: vi.fn(),
  createQuoteForBusiness: vi.fn(),
  deleteDraftQuoteForBusiness: vi.fn(),
  markQuoteSentForBusiness: vi.fn(),
  respondToPublicQuoteByToken: respondToPublicQuoteByTokenMock,
  restoreArchivedQuoteForBusiness: vi.fn(),
  updateQuoteForBusiness: vi.fn(),
  updateQuotePostAcceptanceStatusForBusiness: vi.fn(),
  voidQuoteForBusiness: vi.fn(),
}));

vi.mock("@/features/quotes/queries", () => ({
  getQuoteSendPayloadForBusiness: vi.fn(),
}));

vi.mock("@/lib/plans/usage", () => ({
  checkUsageAllowance: vi.fn(),
}));

vi.mock("@/lib/resend/client", () => ({
  getResendFromEmailConfigurationError: vi.fn(),
  getResendSendFailureMessage: vi.fn(),
  sendQuoteEmail: vi.fn(),
  sendQuoteResponseOwnerNotificationEmail:
    sendQuoteResponseOwnerNotificationEmailMock,
  sendQuoteSentOwnerNotificationEmail: vi.fn(),
}));

vi.mock("@/lib/env", async () => {
  const actual = await vi.importActual<typeof import("@/lib/env")>("@/lib/env");

  return {
    ...actual,
    env: {
      ...actual.env,
      BETTER_AUTH_URL: "https://requo.test",
    },
    isResendConfigured: true,
  };
});

import { respondToPublicQuoteAction } from "@/features/quotes/actions";

describe("quote actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    assertPublicActionRateLimitMock.mockResolvedValue(true);
    getBusinessOwnerEmailsMock.mockResolvedValue(["owner@example.com"]);
    respondToPublicQuoteByTokenMock.mockResolvedValue({
      updated: true,
      status: "accepted",
      quoteNumber: "Q-1002",
      businessId: "business_123",
      businessSlug: "brightside-print-studio",
      inquiryId: "inquiry_123",
      quoteId: "quote_123",
      updatedAt: new Date("2026-04-18T08:00:00.000Z"),
      notifyOnQuoteResponse: false,
      businessName: "BrightSide Print Studio",
      customerName: "Taylor Nguyen",
      customerEmail: "taylor@example.com",
      customerResponseMessage: "Please move ahead.",
      title: "Foundry Labs booth kit",
    });
  });

  it("rejects public quote responses when the public rate limit is exceeded", async () => {
    assertPublicActionRateLimitMock.mockResolvedValue(false);

    const formData = new FormData();
    formData.set("response", "accepted");
    formData.set("message", "Please proceed.");

    const result = await respondToPublicQuoteAction("quote_token_123", {}, formData);

    expect(result).toEqual({
      error: "We couldn't process that response right now. Please try again.",
    });
    expect(respondToPublicQuoteByTokenMock).not.toHaveBeenCalled();
  });

  it("records an accepted public quote response and revalidates the affected cache tags", async () => {
    const formData = new FormData();
    formData.set("response", "accepted");
    formData.set("message", "Please move ahead.");

    const result = await respondToPublicQuoteAction("quote_token_123", {}, formData);

    expect(respondToPublicQuoteByTokenMock).toHaveBeenCalledWith({
      token: "quote_token_123",
      response: "accepted",
      message: "Please move ahead.",
    });
    expect(result).toEqual(
      expect.objectContaining({
        success: "Quote Q-1002 accepted. Your response has been recorded.",
        resolvedQuote: expect.objectContaining({
          status: "accepted",
          customerResponseMessage: "Please move ahead.",
        }),
      }),
    );
    expect(revalidateTagMock).toHaveBeenCalled();
    expect(sendQuoteResponseOwnerNotificationEmailMock).not.toHaveBeenCalled();
  });

  it("sends the owner notification after a saved response when notifications are enabled", async () => {
    respondToPublicQuoteByTokenMock.mockResolvedValue({
      updated: true,
      status: "rejected",
      quoteNumber: "Q-1002",
      businessId: "business_123",
      businessSlug: "brightside-print-studio",
      inquiryId: "inquiry_123",
      quoteId: "quote_123",
      updatedAt: new Date("2026-04-18T08:00:00.000Z"),
      notifyOnQuoteResponse: true,
      businessName: "BrightSide Print Studio",
      customerName: "Taylor Nguyen",
      customerEmail: "taylor@example.com",
      customerResponseMessage: "We need to pause this for now.",
      title: "Foundry Labs booth kit",
    });

    const formData = new FormData();
    formData.set("response", "rejected");
    formData.set("message", "We need to pause this for now.");

    const result = await respondToPublicQuoteAction("quote_token_123", {}, formData);

    expect(result).toEqual(
      expect.objectContaining({
        success: "Quote Q-1002 declined. Your response has been recorded.",
        resolvedQuote: expect.objectContaining({
          status: "rejected",
          customerResponseMessage: "We need to pause this for now.",
        }),
      }),
    );
    expect(getBusinessOwnerEmailsMock).toHaveBeenCalledWith("business_123");
    expect(sendQuoteResponseOwnerNotificationEmailMock).toHaveBeenCalledWith({
      quoteId: "quote_123",
      updatedAt: new Date("2026-04-18T08:00:00.000Z"),
      recipients: ["owner@example.com"],
      businessName: "BrightSide Print Studio",
      customerName: "Taylor Nguyen",
      customerEmail: "taylor@example.com",
      customerMessage: "We need to pause this for now.",
      quoteNumber: "Q-1002",
      title: "Foundry Labs booth kit",
      response: "rejected",
      dashboardUrl:
        "https://requo.test/businesses/brightside-print-studio/dashboard/quotes/quote_123",
    });
  });

  it("returns a clear message when a public quote has been voided", async () => {
    respondToPublicQuoteByTokenMock.mockResolvedValue({
      updated: false,
      status: "voided",
      quoteNumber: "Q-1002",
      businessId: "business_123",
      businessSlug: "brightside-print-studio",
      inquiryId: "inquiry_123",
      quoteId: "quote_123",
      updatedAt: new Date("2026-04-18T08:00:00.000Z"),
      notifyOnQuoteResponse: false,
      businessName: "BrightSide Print Studio",
      customerName: "Taylor Nguyen",
      customerEmail: "taylor@example.com",
      customerResponseMessage: null,
      title: "Foundry Labs booth kit",
    });

    const formData = new FormData();
    formData.set("response", "accepted");
    formData.set("message", "Please proceed.");

    const result = await respondToPublicQuoteAction("quote_token_123", {}, formData);

    expect(result).toEqual({
      error: "This quote has been voided and can no longer be accepted online.",
    });
  });
});
