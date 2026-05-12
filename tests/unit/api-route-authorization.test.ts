import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  createSupabaseAdminClientMock,
  getBusinessRequestContextForSlugMock,
  getCurrentBusinessRequestContextMock,
  getInquiryAttachmentForBusinessMock,
  getQuoteDetailForBusinessMock,
  getQuoteExportRowsForBusinessMock,
  renderHtmlPageElementToPngMock,
  createPdfFromPngMock,
} = vi.hoisted(() => ({
  createSupabaseAdminClientMock: vi.fn(),
  getBusinessRequestContextForSlugMock: vi.fn(),
  getCurrentBusinessRequestContextMock: vi.fn(),
  getInquiryAttachmentForBusinessMock: vi.fn(),
  getQuoteDetailForBusinessMock: vi.fn(),
  getQuoteExportRowsForBusinessMock: vi.fn(),
  renderHtmlPageElementToPngMock: vi.fn(),
  createPdfFromPngMock: vi.fn(),
}));

vi.mock("@/lib/db/business-access", () => ({
  getBusinessRequestContextForSlug: getBusinessRequestContextForSlugMock,
  getCurrentBusinessRequestContext: getCurrentBusinessRequestContextMock,
}));

vi.mock("@/features/quotes/queries", () => ({
  getQuoteDetailForBusiness: getQuoteDetailForBusinessMock,
  getQuoteExportRowsForBusiness: getQuoteExportRowsForBusinessMock,
}));

vi.mock("@/features/inquiries/queries", () => ({
  getInquiryAttachmentForBusiness: getInquiryAttachmentForBusinessMock,
  getInquiryDetailForBusiness: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: createSupabaseAdminClientMock,
}));

vi.mock("@/lib/pdf/html-to-image", () => ({
  renderHtmlPageElementToPng: renderHtmlPageElementToPngMock,
}));

vi.mock("@/lib/pdf/png-to-pdf", () => ({
  createPdfFromPng: createPdfFromPngMock,
}));

import { GET as getQuoteFileExport } from "@/app/api/business/[slug]/quotes/[id]/export/route";
import { GET as getQuoteCsvExport } from "@/app/api/business/[slug]/quotes/export/route";
import { GET as getInquiryAttachment } from "@/app/api/inquiries/[id]/attachments/[attachmentId]/route";

const businessContext = {
  user: {
    id: "user_1",
  },
  businessContext: {
    business: {
      id: "biz_authorized",
      name: "Authorized Business",
      slug: "authorized-business",
      defaultCurrency: "USD",
      plan: "pro",
    },
  },
};

describe("critical API route authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getBusinessRequestContextForSlugMock.mockResolvedValue(businessContext);
    getCurrentBusinessRequestContextMock.mockResolvedValue(businessContext);
    getQuoteExportRowsForBusinessMock.mockResolvedValue([]);
    getQuoteDetailForBusinessMock.mockResolvedValue(null);
    renderHtmlPageElementToPngMock.mockResolvedValue(new Uint8Array([1, 2, 3]));
    createPdfFromPngMock.mockResolvedValue(new Uint8Array([4, 5, 6]));
    createSupabaseAdminClientMock.mockReturnValue({
      storage: {
        from: vi.fn(() => ({
          download: vi.fn(),
        })),
      },
    });
  });

  it("does not export quote CSV data without a business membership", async () => {
    getBusinessRequestContextForSlugMock.mockResolvedValue(null);

    const response = await getQuoteCsvExport(
      new Request("http://localhost/api/business/other/quotes/export"),
      {
        params: Promise.resolve({ slug: "other" }),
      },
    );

    expect(response.status).toBe(404);
    expect(getQuoteExportRowsForBusinessMock).not.toHaveBeenCalled();
  });

  it("scopes quote CSV export reads to the authorized business id", async () => {
    const response = await getQuoteCsvExport(
      new Request("http://localhost/api/business/authorized-business/quotes/export"),
      {
        params: Promise.resolve({ slug: "authorized-business" }),
      },
    );

    expect(response.status).toBe(200);
    expect(getQuoteExportRowsForBusinessMock).toHaveBeenCalledWith(
      expect.objectContaining({
        businessId: "biz_authorized",
      }),
    );
  });

  it("does not render quote files before membership and quote ownership checks pass", async () => {
    getBusinessRequestContextForSlugMock.mockResolvedValue(null);

    const noMembershipResponse = await getQuoteFileExport(
      new Request("http://localhost/api/business/other/quotes/quote_1/export"),
      {
        params: Promise.resolve({ slug: "other", id: "quote_1" }),
      },
    );

    expect(noMembershipResponse.status).toBe(404);
    expect(getQuoteDetailForBusinessMock).not.toHaveBeenCalled();
    expect(renderHtmlPageElementToPngMock).not.toHaveBeenCalled();

    getBusinessRequestContextForSlugMock.mockResolvedValue(businessContext);
    getQuoteDetailForBusinessMock.mockResolvedValue(null);

    const noQuoteResponse = await getQuoteFileExport(
      new Request(
        "http://localhost/api/business/authorized-business/quotes/quote_other/export",
      ),
      {
        params: Promise.resolve({
          slug: "authorized-business",
          id: "quote_other",
        }),
      },
    );

    expect(noQuoteResponse.status).toBe(404);
    expect(getQuoteDetailForBusinessMock).toHaveBeenCalledWith({
      businessId: "biz_authorized",
      quoteId: "quote_other",
    });
    expect(renderHtmlPageElementToPngMock).not.toHaveBeenCalled();
  });

  it("does not download inquiry attachments outside the current business", async () => {
    getCurrentBusinessRequestContextMock.mockResolvedValue(null);

    const noMembershipResponse = await getInquiryAttachment(
      new Request("http://localhost/api/inquiries/inq_1/attachments/att_1"),
      {
        params: Promise.resolve({ id: "inq_1", attachmentId: "att_1" }),
      },
    );

    expect(noMembershipResponse.status).toBe(404);
    expect(getInquiryAttachmentForBusinessMock).not.toHaveBeenCalled();
    expect(createSupabaseAdminClientMock).not.toHaveBeenCalled();

    getCurrentBusinessRequestContextMock.mockResolvedValue(businessContext);
    getInquiryAttachmentForBusinessMock.mockResolvedValue(null);

    const noAttachmentResponse = await getInquiryAttachment(
      new Request("http://localhost/api/inquiries/inq_1/attachments/att_1"),
      {
        params: Promise.resolve({ id: "inq_1", attachmentId: "att_1" }),
      },
    );

    expect(noAttachmentResponse.status).toBe(404);
    expect(getInquiryAttachmentForBusinessMock).toHaveBeenCalledWith({
      businessId: "biz_authorized",
      inquiryId: "inq_1",
      attachmentId: "att_1",
    });
    expect(createSupabaseAdminClientMock).not.toHaveBeenCalled();
  });
});
