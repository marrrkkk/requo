import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  decodeInquiryMessageCursorMock,
  getBusinessRequestContextForSlugMock,
  getPaginatedInquiryMessagesForBusinessMock,
  inquiryBelongsToBusinessMock,
} = vi.hoisted(() => ({
  decodeInquiryMessageCursorMock: vi.fn(),
  getBusinessRequestContextForSlugMock: vi.fn(),
  getPaginatedInquiryMessagesForBusinessMock: vi.fn(),
  inquiryBelongsToBusinessMock: vi.fn(),
}));

vi.mock("@/features/ai/messages", () => ({
  decodeInquiryMessageCursor: decodeInquiryMessageCursorMock,
  getPaginatedInquiryMessagesForBusiness:
    getPaginatedInquiryMessagesForBusinessMock,
  inquiryBelongsToBusiness: inquiryBelongsToBusinessMock,
}));

vi.mock("@/lib/db/business-access", () => ({
  getBusinessRequestContextForSlug: getBusinessRequestContextForSlugMock,
}));

import { GET } from "@/app/api/business/[slug]/inquiries/[id]/messages/route";

describe("inquiry message API route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getBusinessRequestContextForSlugMock.mockResolvedValue({
      businessContext: {
        business: {
          id: "biz_123",
        },
      },
    });
    inquiryBelongsToBusinessMock.mockResolvedValue(true);
    decodeInquiryMessageCursorMock.mockReturnValue({
      ok: true,
      cursor: {
        createdAt: new Date("2026-04-01T00:00:00.000Z"),
        id: "imsg_1",
      },
    });
    getPaginatedInquiryMessagesForBusinessMock.mockResolvedValue({
      messages: [],
      nextCursor: null,
      hasMore: false,
    });
  });

  it("returns the stable message page shape with the default page size", async () => {
    const response = await GET(
      new Request("http://localhost/api/business/acme/inquiries/inq_123/messages"),
      {
        params: Promise.resolve({ slug: "acme", id: "inq_123" }),
      },
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      messages: [],
      nextCursor: null,
      hasMore: false,
    });
    expect(getPaginatedInquiryMessagesForBusinessMock).toHaveBeenCalledWith({
      businessId: "biz_123",
      inquiryId: "inq_123",
      limit: 30,
      before: null,
    });
  });

  it("rejects invalid cursors without reading messages", async () => {
    decodeInquiryMessageCursorMock.mockReturnValue({ ok: false });

    const response = await GET(
      new Request(
        "http://localhost/api/business/acme/inquiries/inq_123/messages?before=bad",
      ),
      {
        params: Promise.resolve({ slug: "acme", id: "inq_123" }),
      },
    );

    expect(response.status).toBe(400);
    expect(getPaginatedInquiryMessagesForBusinessMock).not.toHaveBeenCalled();
  });

  it("does not expose messages outside the authorized business", async () => {
    inquiryBelongsToBusinessMock.mockResolvedValue(false);

    const response = await GET(
      new Request("http://localhost/api/business/acme/inquiries/inq_other/messages"),
      {
        params: Promise.resolve({ slug: "acme", id: "inq_other" }),
      },
    );

    expect(response.status).toBe(404);
    expect(getPaginatedInquiryMessagesForBusinessMock).not.toHaveBeenCalled();
  });
});
