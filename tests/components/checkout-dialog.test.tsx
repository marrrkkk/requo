import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";

const { cancelPendingQrCheckoutActionMock, createCheckoutActionMock, refreshMock } =
  vi.hoisted(() => ({
    cancelPendingQrCheckoutActionMock: vi.fn(),
    createCheckoutActionMock: vi.fn(async () => ({})),
    refreshMock: vi.fn(),
  }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: refreshMock,
  }),
}));

vi.mock("@/features/billing/actions", () => ({
  cancelPendingQrCheckoutAction: cancelPendingQrCheckoutActionMock,
  createCheckoutAction: createCheckoutActionMock,
}));

import { CheckoutDialog } from "@/features/billing/components/checkout-dialog";

function renderCheckoutDialog(
  props?: Partial<ComponentProps<typeof CheckoutDialog>>,
) {
  return render(
    <CheckoutDialog
      currentPlan="free"
      defaultCurrency="USD"
      onOpenChange={vi.fn()}
      open
      plan="pro"
      region="PH"
      userId="user_123"
      businessId="business_123"
      businessName="Demo Workspace"
      businessSlug="demo-business"
      {...props}
    />,
  );
}

describe("CheckoutDialog", () => {
  it("renders Paddle card checkout as the primary option before QRPh", () => {
    renderCheckoutDialog();

    const cardButton = screen.getByRole("button", { name: /Pay with Card/i });
    const qrButton = screen.getByRole("button", { name: /Pay with QRPh/i });

    expect(cardButton.compareDocumentPosition(qrButton)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(cardButton).toBeVisible();
    expect(qrButton).toBeVisible();
  });

  it("hides the QRPh option outside the Philippines", () => {
    renderCheckoutDialog({ region: "INTL" });

    expect(
      screen.queryByRole("button", { name: /Pay with QRPh/i }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Pay with Card/i })).toBeVisible();
  });

  it("closes checkout and calls the plan changer", async () => {
    const user = userEvent.setup();
    const onChangePlan = vi.fn();
    const onOpenChange = vi.fn();

    renderCheckoutDialog({ onChangePlan, onOpenChange });

    await user.click(screen.getByRole("button", { name: "Change plan" }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onChangePlan).toHaveBeenCalledOnce();
  });
});
