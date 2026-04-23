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
import { sendQuoteAction } from "@/features/quotes/actions";
import {
  getBusinessMessagingSettings,
  getWorkspaceBusinessActionContext,
} from "@/lib/db/business-access";
import { markQuoteSentForBusiness } from "@/features/quotes/mutations";
import { getQuoteSendPayloadForBusiness } from "@/features/quotes/queries";
import { checkUsageAllowance } from "@/lib/plans/usage";
import {
  getResendFromEmailConfigurationError,
  sendQuoteEmail,
  sendQuoteSentOwnerNotificationEmail,
} from "@/lib/resend/client";

describe("quote actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    assertPublicActionRateLimitMock.mockResolvedValue(true);
    getBusinessOwnerEmailsMock.mockResolvedValue(["owner@example.com"]);
    vi.mocked(getWorkspaceBusinessActionContext).mockResolvedValue({
      ok: true,
      user: {
        id: "user_123",
      },
      businessContext: {
        business: {
          id: "business_123",
          name: "BrightSide Print Studio",
          slug: "brightside-print-studio",
          workspaceId: "workspace_123",
          workspacePlan: "free",
        },
      },
    } as Awaited<ReturnType<typeof getWorkspaceBusinessActionContext>>);
    vi.mocked(getBusinessMessagingSettings).mockResolvedValue({
      defaultEmailSignature: "Thanks, BrightSide Print Studio",
      quoteEmailTemplate: null,
      contactEmail: "hello@brightside.test",
      notifyOnQuoteSent: true,
    } as Awaited<ReturnType<typeof getBusinessMessagingSettings>>);
    vi.mocked(getQuoteSendPayloadForBusiness).mockResolvedValue({
      id: "quote_123",
      inquiryId: "inquiry_123",
      quoteNumber: "Q-1002",
      publicToken: "quote_token_123",
      title: "Foundry Labs booth kit",
      customerName: "Taylor Nguyen",
      customerEmail: "taylor@example.com",
      currency: "USD",
      notes: "Please review the attached scope.",
      subtotalInCents: 20000,
      discountInCents: 0,
      totalInCents: 20000,
      validUntil: "2026-04-30",
      status: "draft",
      updatedAt: new Date("2026-04-18T08:00:00.000Z"),
      items: [
        {
          id: "qit_123",
          description: "Booth kit",
          quantity: 1,
          unitPriceInCents: 20000,
          lineTotalInCents: 20000,
          position: 0,
        },
      ],
    } as Awaited<ReturnType<typeof getQuoteSendPayloadForBusiness>>);
    vi.mocked(checkUsageAllowance).mockResolvedValue({
      allowed: true,
      current: 0,
      limit: 3,
    });
    vi.mocked(getResendFromEmailConfigurationError).mockReturnValue(null);
    vi.mocked(sendQuoteEmail).mockResolvedValue(undefined);
    vi.mocked(markQuoteSentForBusiness).mockResolvedValue({
      changed: true,
      status: "sent",
      quoteNumber: "Q-1002",
      inquiryId: "inquiry_123",
      publicToken: "quote_token_123",
    } as Awaited<ReturnType<typeof markQuoteSentForBusiness>>);
    vi.mocked(sendQuoteSentOwnerNotificationEmail).mockResolvedValue(undefined);
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

  it("sends a draft quote with Requo when delivery is allowed", async () => {
    const formData = new FormData();
    formData.set("deliveryMethod", "requo");

    const result = await sendQuoteAction("quote_123", {}, formData);

    expect(checkUsageAllowance).toHaveBeenCalledTimes(2);
    expect(sendQuoteEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        customerEmail: "taylor@example.com",
        quoteId: "quote_123",
      }),
    );
    expect(markQuoteSentForBusiness).toHaveBeenCalledWith({
      actorUserId: "user_123",
      businessId: "business_123",
      quoteId: "quote_123",
      sendMethod: "requo",
    });
    expect(result).toEqual({
      success: "Quote Q-1002 sent to taylor@example.com.",
    });
  });

  it("returns a clear limit error when the free-plan daily Requo send cap is reached", async () => {
    vi.mocked(checkUsageAllowance)
      .mockResolvedValueOnce({
        allowed: false,
        current: 3,
        limit: 3,
      })
      .mockResolvedValueOnce({
        allowed: true,
        current: 0,
        limit: 30,
      });

    const formData = new FormData();
    formData.set("deliveryMethod", "requo");

    const result = await sendQuoteAction("quote_123", {}, formData);

    expect(sendQuoteEmail).not.toHaveBeenCalled();
    expect(markQuoteSentForBusiness).not.toHaveBeenCalled();
    expect(result).toEqual({
      error:
        "Free plan includes 3 Requo sends per day and 30 per month. You've hit today's send limit. Send this quote manually or upgrade to keep using Requo delivery.",
    });
  });

  it("marks a draft quote sent without using Requo when manual delivery is chosen", async () => {
    const formData = new FormData();
    formData.set("deliveryMethod", "manual");

    const result = await sendQuoteAction("quote_123", {}, formData);

    expect(checkUsageAllowance).not.toHaveBeenCalled();
    expect(sendQuoteEmail).not.toHaveBeenCalled();
    expect(markQuoteSentForBusiness).toHaveBeenCalledWith({
      actorUserId: "user_123",
      businessId: "business_123",
      quoteId: "quote_123",
      sendMethod: "manual",
    });
    expect(result).toEqual({
      success: "Quote Q-1002 marked as sent after manual delivery.",
    });
  });

  it("returns a clear error when the customer quote link cannot be recovered", async () => {
    vi.mocked(getQuoteSendPayloadForBusiness).mockResolvedValue({
      id: "quote_123",
      inquiryId: "inquiry_123",
      quoteNumber: "Q-1002",
      publicToken: null,
      title: "Foundry Labs booth kit",
      customerName: "Taylor Nguyen",
      customerEmail: "taylor@example.com",
      currency: "USD",
      notes: "Please review the attached scope.",
      subtotalInCents: 20000,
      discountInCents: 0,
      totalInCents: 20000,
      validUntil: "2026-04-30",
      status: "draft",
      updatedAt: new Date("2026-04-18T08:00:00.000Z"),
      items: [
        {
          id: "qit_123",
          description: "Booth kit",
          quantity: 1,
          unitPriceInCents: 20000,
          lineTotalInCents: 20000,
          position: 0,
        },
      ],
    } as Awaited<ReturnType<typeof getQuoteSendPayloadForBusiness>>);

    const formData = new FormData();
    formData.set("deliveryMethod", "manual");

    const result = await sendQuoteAction("quote_123", {}, formData);

    expect(sendQuoteEmail).not.toHaveBeenCalled();
    expect(markQuoteSentForBusiness).not.toHaveBeenCalled();
    expect(result).toEqual({
      error:
        "This quote's customer link is unavailable right now, so it can't be sent.",
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
