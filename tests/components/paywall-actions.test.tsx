import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { assignMock, pushMock, toastErrorMock } = vi.hoisted(() => ({
  assignMock: vi.fn(),
  toastErrorMock: vi.fn(),
  pushMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}));

vi.mock("sonner", () => ({
  toast: {
    error: toastErrorMock,
  },
}));

import { SendQuoteDialog } from "@/features/quotes/components/send-quote-dialog";

const quoteForSend = {
  quoteNumber: "Q-1001",
  title: "Storefront refresh",
  customerName: "Alicia Cruz",
  customerEmail: "alicia@example.com",
  customerContactMethod: "email",
  customerContactHandle: "alicia@example.com",
  totalInCents: 125000,
  currency: "PHP",
  validUntil: "2026-06-01",
  status: "draft" as const,
};

function renderSendQuoteDialog(props?: { pdfExportHref?: string; pdfExportLocked?: boolean }) {
  return render(
    <SendQuoteDialog
      sendAction={vi.fn(async () => ({}))}
      logEventAction={vi.fn(async () => ({}))}
      createFollowUpAction={vi.fn(async () => ({}))}
      quote={quoteForSend}
      customerQuoteUrl="https://requo.test/quote/test-token"
      businessName="Demo Business"
      isRequoEmailAvailable={false}
      pdfExportHref={props?.pdfExportHref}
      pdfExportLocked={props?.pdfExportLocked}
    />,
  );
}

describe("paywalled export actions", () => {
  const originalLocation = window.location;

  beforeAll(() => {
    Object.defineProperty(window, "location", {
      configurable: true,
      value: {
        assign: assignMock,
        origin: "http://localhost",
      },
    });
  });

  afterAll(() => {
    Object.defineProperty(window, "location", {
      configurable: true,
      value: originalLocation,
    });
  });

  beforeEach(() => {
    assignMock.mockReset();
    toastErrorMock.mockReset();
  });

  it("shows a Pro notice instead of a PDF link in the send quote dialog", async () => {
    const user = userEvent.setup();
    renderSendQuoteDialog({ pdfExportLocked: true });

    await user.click(screen.getByRole("button", { name: "Send quote" }));

    const lockedPdfAction = await screen.findByRole("button", {
      name: "PDF",
    });

    expect(
      screen.queryByRole("link", { name: "PDF" }),
    ).not.toBeInTheDocument();

    await user.click(lockedPdfAction);

    expect(
      await screen.findByText("PDF is a Pro feature."),
    ).toBeVisible();
  });
});