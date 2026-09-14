import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { AdminBillingPanel } from "@/features/admin/components/billing/admin-billing-panel";
import { AdminBusinessBillingSection } from "@/features/admin/components/billing/admin-business-billing-section";
import type {
  AdminBusinessBilling,
  AdminSubscriptionDetail,
} from "@/features/admin/types";

function makeSubscription(
  overrides: Partial<AdminSubscriptionDetail> = {},
): AdminSubscriptionDetail {
  return {
    id: "sub_1",
    userId: "user_1",
    ownerEmail: "owner@example.com",
    plan: "pro",
    status: "active",
    provider: "polar",
    billingCurrency: "USD",
    providerCustomerId: "cus_1",
    providerSubscriptionId: "psub_1",
    providerCheckoutId: null,
    paymentMethod: "card",
    currentPeriodStart: new Date("2026-08-01T00:00:00Z"),
    currentPeriodEnd: new Date("2026-09-01T00:00:00Z"),
    canceledAt: null,
    trialEndsAt: null,
    createdAt: new Date("2026-08-01T00:00:00Z"),
    updatedAt: new Date("2026-08-15T00:00:00Z"),
    recentPaymentAttempts: [
      {
        id: "pay_1",
        plan: "pro",
        provider: "polar",
        providerPaymentId: "ppay_1",
        amount: 2900,
        currency: "USD",
        status: "succeeded",
        createdAt: new Date("2026-08-01T00:00:00Z"),
      },
    ],
    recentBillingEvents: [
      {
        id: "evt_1",
        providerEventId: "evt_polar_1",
        provider: "polar",
        eventType: "subscription.created",
        processedAt: new Date("2026-08-01T00:01:00Z"),
        createdAt: new Date("2026-08-01T00:00:00Z"),
      },
    ],
    ...overrides,
  };
}

function makeBusinessBilling(
  overrides: Partial<AdminBusinessBilling> = {},
): AdminBusinessBilling {
  return {
    businessId: "biz_1",
    effectivePlan: "pro",
    ownerUserId: "user_1",
    ownerEmail: "owner@example.com",
    accountSubscription: makeSubscription(),
    businessSubscription: {
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

describe("AdminBillingPanel", () => {
  it("renders the details grid with the authoritative source labelled", () => {
    render(<AdminBillingPanel subscription={makeSubscription()} />);

    expect(screen.getByText("Billing")).toBeInTheDocument();
    expect(
      screen.getByText(/Authoritative subscription state/),
    ).toBeInTheDocument();
    expect(screen.getByText("cus_1")).toBeInTheDocument();
  });

  it("renders recent payments and billing events", () => {
    render(<AdminBillingPanel subscription={makeSubscription()} />);

    expect(screen.getByText("Recent payment attempts")).toBeInTheDocument();
    expect(screen.getByText("ppay_1")).toBeInTheDocument();
    expect(screen.getByText("Recent billing events")).toBeInTheDocument();
    expect(screen.getByText("subscription.created")).toBeInTheDocument();
  });

  it("renders empty states when there is no payment or event history", () => {
    render(
      <AdminBillingPanel
        subscription={makeSubscription({
          recentPaymentAttempts: [],
          recentBillingEvents: [],
        })}
      />,
    );

    expect(screen.getByText("No payment attempts")).toBeInTheDocument();
    expect(screen.getByText("No billing events")).toBeInTheDocument();
  });

  it("names the free plan instead of rendering an empty grid", () => {
    render(<AdminBillingPanel subscription={null} />);

    expect(screen.getByText(/on the free plan/)).toBeInTheDocument();
    expect(screen.queryByText("Recent payment attempts")).not.toBeInTheDocument();
  });
});

describe("AdminBusinessBillingSection", () => {
  it("labels each plan source distinctly", () => {
    render(<AdminBusinessBillingSection billing={makeBusinessBilling()} />);

    expect(screen.getByText("Effective plan (cached)")).toBeInTheDocument();
    expect(screen.getByText("Account subscription (owner)")).toBeInTheDocument();
    expect(screen.getByText("Business subscription")).toBeInTheDocument();
    // No drift warning when every source agrees.
    expect(screen.queryByText(/neither/)).not.toBeInTheDocument();
  });

  it("warns when the account subscription disagrees with the cached plan", () => {
    render(
      <AdminBusinessBillingSection
        billing={makeBusinessBilling({
          effectivePlan: "pro",
          accountSubscription: makeSubscription({ plan: "business" }),
        })}
      />,
    );

    const note = screen.getByText(/neither/);
    expect(note).toBeInTheDocument();
    expect(note.textContent).toContain("business");
  });

  it("links to the owner's full billing on the user detail page", () => {
    render(<AdminBusinessBillingSection billing={makeBusinessBilling()} />);

    const link = screen.getByRole("link", { name: /View owner billing/ });
    expect(link).toHaveAttribute("href", "/users/user_1");
  });

  it("names the free plan for each missing source", () => {
    render(
      <AdminBusinessBillingSection
        billing={makeBusinessBilling({
          effectivePlan: "free",
          accountSubscription: null,
          businessSubscription: null,
        })}
      />,
    );

    expect(screen.getAllByText(/on the free plan/)).toHaveLength(2);
    expect(screen.getByText(/implicitly on the free plan/)).toBeInTheDocument();
  });
});
