import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { AdminBusinessBillingSection } from "@/features/admin/components/billing/admin-business-billing-section";
import type { AdminBusinessBilling } from "@/features/admin/types";

function makeBusinessBilling(
  overrides: Partial<AdminBusinessBilling> = {},
): AdminBusinessBilling {
  return {
    businessId: "biz_1",
    plan: "pro",
    subscription: {
      id: "bsub_1",
      plan: "pro",
      status: "active",
      provider: "polar",
      currentPeriodEnd: new Date("2026-09-01T00:00:00Z"),
      canceledAt: null,
    },
    ...overrides,
  };
}

describe("AdminBusinessBillingSection", () => {
  it("renders the business subscription without legacy account details", () => {
    render(<AdminBusinessBillingSection billing={makeBusinessBilling()} />);

    expect(screen.getByText("Subscription")).toBeInTheDocument();
    expect(screen.getByText("polar")).toBeInTheDocument();
    // The legacy account-subscription split must not render here.
    expect(screen.queryByText(/account subscription/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/effective plan/i)).not.toBeInTheDocument();
  });

  it("names the free plan when there is no subscription row", () => {
    render(
      <AdminBusinessBillingSection
        billing={makeBusinessBilling({ plan: "free", subscription: null })}
      />,
    );

    expect(screen.getByText("Free")).toBeInTheDocument();
    expect(
      screen.getByText(/No subscription for this business/),
    ).toBeInTheDocument();
  });
});
