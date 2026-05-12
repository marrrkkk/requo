import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const {
  assignMock,
  routerPushMock,
  signOutMock,
  toastErrorMock,
  toastInfoMock,
  toastSuccessMock,
} = vi.hoisted(() => ({
  assignMock: vi.fn(),
  routerPushMock: vi.fn(),
  signOutMock: vi.fn(),
  toastErrorMock: vi.fn(),
  toastInfoMock: vi.fn(),
  toastSuccessMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: routerPushMock,
  }),
}));

vi.mock("@/lib/auth/client", () => ({
  authClient: {
    signOut: signOutMock,
  },
}));

vi.mock("sonner", () => ({
  toast: {
    error: toastErrorMock,
    info: toastInfoMock,
    success: toastSuccessMock,
  },
}));

import { CommandMenu } from "@/components/shell/command-menu";
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
    routerPushMock.mockReset();
    signOutMock.mockReset();
    toastErrorMock.mockReset();
    toastInfoMock.mockReset();
    toastSuccessMock.mockReset();
  });

  it("shows a Pro notice instead of a PDF link in the send quote dialog", async () => {
    const user = userEvent.setup();
    renderSendQuoteDialog({ pdfExportLocked: true });

    await user.click(screen.getByRole("button", { name: "Send quote" }));

    const lockedPdfAction = await screen.findByRole("button", {
      name: "Download PDF",
    });

    expect(
      screen.queryByRole("link", { name: "Download PDF" }),
    ).not.toBeInTheDocument();

    await user.click(lockedPdfAction);

    expect(
      await screen.findByText("PDF export is a Pro feature."),
    ).toBeVisible();
  });

  it("does not navigate command-menu exports on the free plan", async () => {
    const user = userEvent.setup();

    render(
      <CommandMenu
        businessSlug="demo-business"
        role="owner"
        plan="free"
        
      />,
    );

    await user.click(screen.getByRole("button", { name: /quick actions/i }));
    await user.click(await screen.findByText("Download quotes (CSV)"));

    expect(assignMock).not.toHaveBeenCalled();
    expect(toastInfoMock).toHaveBeenCalledWith("Export is a Pro feature.", {
      description: "Upgrade to Pro to download quote and inquiry CSV exports.",
    });
  });

  it("keeps command-menu exports available on paid plans", async () => {
    const user = userEvent.setup();

    render(
      <CommandMenu
        businessSlug="demo-business"
        role="owner"
        plan="pro"
        
      />,
    );

    await user.click(screen.getByRole("button", { name: /quick actions/i }));
    await user.click(await screen.findByText("Download quotes (CSV)"));

    expect(assignMock).toHaveBeenCalledWith(
      "/api/business/demo-business/quotes/export",
    );
  });
});
