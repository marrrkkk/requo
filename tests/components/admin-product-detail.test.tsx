import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { AdminInquiryDetail } from "@/features/admin/components/product/inquiries/admin-inquiry-detail";
import { AdminQuoteDetail } from "@/features/admin/components/product/quotes/admin-quote-detail";
import type {
  AdminInquiryDetail as AdminInquiryDetailPayload,
  AdminQuoteDetail as AdminQuoteDetailPayload,
} from "@/features/admin/types";

function makeInquiryDetail(
  overrides: Partial<AdminInquiryDetailPayload> = {},
): AdminInquiryDetailPayload {
  return {
    id: "inq_1",
    businessId: "biz_1",
    subject: "Leaky faucet repair",
    customerName: "Jane Doe",
    customerEmail: "jane@example.com",
    customerContactMethod: "email",
    customerContactHandle: "jane@example.com",
    serviceCategory: "Plumbing",
    requestedDeadline: null,
    budgetText: "$200",
    details: "Kitchen faucet drips all night.",
    source: "service_form",
    quoteRequested: true,
    status: "new",
    submittedAt: new Date("2026-09-10T09:00:00Z"),
    lastRespondedAt: null,
    archivedAt: null,
    deletedAt: null,
    qualificationScore: 80,
    qualificationTemperature: "warm",
    aiAssisted: false,
    escalated: false,
    business: { id: "biz_1", name: "Acme Plumbing", slug: "acme", plan: "pro" },
    owner: { userId: "user_1", name: "Owen Owner", email: "owen@example.com" },
    messages: [
      {
        id: "msg_1",
        role: "user",
        content: "Can someone come Tuesday?",
        status: "completed",
        createdAt: new Date("2026-09-10T09:05:00Z"),
      },
    ],
    notes: [
      {
        id: "note_1",
        body: "Called back, confirmed Tuesday.",
        authorName: "Owen Owner",
        authorEmail: "owen@example.com",
        createdAt: new Date("2026-09-10T10:00:00Z"),
      },
    ],
    attachments: [
      {
        id: "att_1",
        fileName: "faucet.jpg",
        contentType: "image/jpeg",
        fileSize: 204800,
        createdAt: new Date("2026-09-10T09:02:00Z"),
      },
    ],
    linkedQuotes: [
      {
        id: "quote_1",
        quoteNumber: "Q-1001",
        status: "sent",
        totalInCents: 25000,
        currency: "USD",
        sentAt: new Date("2026-09-11T09:00:00Z"),
      },
    ],
    ...overrides,
  };
}

function makeQuoteDetail(
  overrides: Partial<AdminQuoteDetailPayload> = {},
): AdminQuoteDetailPayload {
  return {
    id: "quote_1",
    businessId: "biz_1",
    inquiryId: "inq_1",
    quoteNumber: "Q-1001",
    title: "Faucet repair",
    customerName: "Jane Doe",
    customerEmail: "jane@example.com",
    customerContactMethod: "email",
    customerContactHandle: "jane@example.com",
    status: "sent",
    currency: "USD",
    notes: "Includes parts.",
    terms: "Due on completion.",
    subtotalInCents: 25000,
    discountInCents: 0,
    taxInCents: 0,
    totalInCents: 25000,
    sentAt: new Date("2026-09-11T09:00:00Z"),
    acceptedAt: null,
    publicViewedAt: new Date("2026-09-11T12:00:00Z"),
    customerRespondedAt: null,
    customerResponseMessage: null,
    validUntil: "2026-10-11",
    version: 1,
    autoFollowUp: {
      enabled: true,
      delayDays: 3,
      maxAttempts: 2,
      attempts: 1,
      lastSentAt: new Date("2026-09-14T09:00:00Z"),
      stoppedAt: null,
    },
    createdAt: new Date("2026-09-10T11:00:00Z"),
    updatedAt: new Date("2026-09-14T09:00:00Z"),
    business: { id: "biz_1", name: "Acme Plumbing", slug: "acme", plan: "pro" },
    linkedInquiry: {
      id: "inq_1",
      subject: "Leaky faucet repair",
      customerName: "Jane Doe",
      status: "quoted",
    },
    items: [
      {
        id: "item_1",
        description: "Faucet cartridge replacement",
        quantity: 1,
        unitPriceInCents: 25000,
        lineTotalInCents: 25000,
        position: 0,
      },
    ],
    versions: [],
    revisionRequests: [],
    emails: [
      {
        id: "email_1",
        subject: "Your quote Q-1001 from Acme Plumbing",
        status: "sent",
        provider: "resend",
        sentAt: new Date("2026-09-11T09:01:00Z"),
        createdAt: new Date("2026-09-11T09:00:00Z"),
        attempts: 1,
      },
    ],
    ...overrides,
  };
}

describe("AdminInquiryDetail", () => {
  it("renders the request with customer, business, and qualification", () => {
    render(<AdminInquiryDetail detail={makeInquiryDetail()} />);

    expect(screen.getByText("Leaky faucet repair")).toBeInTheDocument();
    expect(
      screen.getByText("Kitchen faucet drips all night."),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Acme Plumbing").length).toBeGreaterThan(0);
    expect(screen.getByText("owen@example.com")).toBeInTheDocument();
  });

  it("renders messages, notes, and attachment metadata", () => {
    render(<AdminInquiryDetail detail={makeInquiryDetail()} />);

    expect(screen.getByText("Can someone come Tuesday?")).toBeInTheDocument();
    expect(
      screen.getByText("Called back, confirmed Tuesday."),
    ).toBeInTheDocument();
    expect(screen.getByText("faucet.jpg")).toBeInTheDocument();
    expect(screen.getByText("200 KB")).toBeInTheDocument();
  });

  it("never exposes the private storage path", () => {
    const { container } = render(
      <AdminInquiryDetail detail={makeInquiryDetail()} />,
    );

    expect(container.innerHTML).not.toContain("storagePath");
    expect(container.innerHTML).not.toContain("storage_path");
  });

  it("links each quoted draft to its quote detail page", () => {
    render(<AdminInquiryDetail detail={makeInquiryDetail()} />);

    expect(
      screen.getByRole("link", { name: "Open" }),
    ).toHaveAttribute("href", "/quotes/quote_1");
  });

  it("names empty collections instead of rendering empty feeds", () => {
    render(
      <AdminInquiryDetail
        detail={makeInquiryDetail({
          messages: [],
          notes: [],
          attachments: [],
          linkedQuotes: [],
        })}
      />,
    );

    expect(screen.getByText("No messages recorded.")).toBeInTheDocument();
    expect(screen.getByText("No notes recorded.")).toBeInTheDocument();
    expect(screen.getByText("No attachments.")).toBeInTheDocument();
    expect(
      screen.getByText("No quotes drafted from this inquiry yet."),
    ).toBeInTheDocument();
  });
});

describe("AdminQuoteDetail", () => {
  it("answers delivery with the verdict, timeline, and emails", () => {
    render(<AdminQuoteDetail detail={makeQuoteDetail()} />);

    expect(screen.getByText(/delivery confirmed/)).toBeInTheDocument();
    expect(
      screen.getByText("Your quote Q-1001 from Acme Plumbing"),
    ).toBeInTheDocument();
    expect(screen.getByText(/every 3 days/)).toBeInTheDocument();
  });

  it("names manual sharing when sent with no delivery email", () => {
    render(
      <AdminQuoteDetail
        detail={makeQuoteDetail({ emails: [], publicViewedAt: null })}
      />,
    );

    expect(screen.getByText(/shared manually/)).toBeInTheDocument();
    expect(
      screen.getByText("No delivery emails on record for this quote."),
    ).toBeInTheDocument();
  });

  it("renders amounts, items, and the source inquiry link", () => {
    render(<AdminQuoteDetail detail={makeQuoteDetail()} />);

    expect(screen.getAllByText("$250.00").length).toBeGreaterThan(0);
    expect(
      screen.getByText("Faucet cartridge replacement"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Open inquiry" }),
    ).toHaveAttribute("href", "/inquiries/inq_1");
  });

  it("renders versions and revision requests when present", () => {
    render(
      <AdminQuoteDetail
        detail={makeQuoteDetail({
          versions: [
            {
              id: "ver_0",
              version: 1,
              title: "Faucet repair",
              totalInCents: 20000,
              currency: "USD",
              validUntil: "2026-10-11",
              createdAt: new Date("2026-09-10T11:00:00Z"),
            },
          ],
          revisionRequests: [
            {
              id: "rev_1",
              version: 1,
              message: "Can you use brass parts?",
              status: "pending",
              createdAt: new Date("2026-09-12T09:00:00Z"),
              resolvedAt: null,
            },
          ],
        })}
      />,
    );

    expect(screen.getByText(/Version 1 — Faucet repair/)).toBeInTheDocument();
    expect(screen.getByText("Can you use brass parts?")).toBeInTheDocument();
  });
});
