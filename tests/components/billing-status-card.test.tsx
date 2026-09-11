import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

/**
 * Billing settings card tests.
 *
 * The card is a summary surface: subscription state, credits usage, and
 * deep links into the Polar customer portal. These tests pin the states a
 * business owner can actually land in (free, active, canceling, past due,
 * highest plan) plus the usage-bar math, since a regression there silently
 * misreports how much of the monthly allowance is left.
 */

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/features/billing/components/upgrade-button", () => ({
  UpgradeButton: ({ children }: { children?: React.ReactNode }) => (
    <button type="button">{children ?? "Upgrade Plan"}</button>
  ),
}));

vi.mock("@/features/billing/components/payment-method-icon", () => ({
  PaymentMethodIcon: ({ method }: { method?: string | null }) => (
    <span data-testid="payment-method-icon">{method}</span>
  ),
}));

// ── Imports ──────────────────────────────────────────────────────────────────

import { BillingStatusCard } from "@/features/billing/components/billing-status-card";
import type { AccountBillingOverview } from "@/features/billing/types";

type Subscription = NonNullable<AccountBillingOverview["subscription"]>;

const PORTAL_HREF =
  "/api/billing/polar/customer-portal?businessId=biz_1&businessSlug=acme";

function makeBilling(
  overrides: Partial<AccountBillingOverview> = {},
): AccountBillingOverview {
  return {
    userId: "user_1",
    businessId: "biz_1",
    businessName: "Acme Services",
    businessSlug: "acme",
    currentPlan: "free",
    subscription: null,
    downgradePreview: {
      targetPlan: "free",
      activeBusinessLimit: null,
      activeBusinesses: [],
      requiresSelection: false,
    },
    ...overrides,
  };
}

function makeSubscription(overrides: Partial<Subscription> = {}): Subscription {
  return {
    status: "active",
    plan: "pro",
    provider: "polar",
    currency: "USD",
    paymentMethod: "visa",
    currentPeriodStart: new Date("2026-05-01T12:00:00.000Z"),
    currentPeriodEnd: new Date("2026-06-01T12:00:00.000Z"),
    canceledAt: null,
    providerSubscriptionId: "sub_1",
    providerCustomerId: "cus_1",
    ...overrides,
  };
}

const defaultUsage = {
  aiCredits: { used: 10, limit: 30 },
  emailsSent: 3,
};

describe("BillingStatusCard", () => {
  it("renders the free-plan summary with upgrade actions and usage bars", () => {
    render(
      <BillingStatusCard
        billing={makeBilling({ currentPlan: "free" })}
        planUsage={defaultUsage}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Free plan" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Subscribe Now" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Compare plans" }),
    ).toBeInTheDocument();

    // Free plan has no portal session, so no management/cancellation sections.
    expect(
      screen.queryByRole("link", { name: "View billing details" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Cancel plan" }),
    ).not.toBeInTheDocument();

    expect(screen.getByText("30 credits")).toBeInTheDocument();

    // Bars report the remaining allowance, which starts full and drains.
    const creditsBar = screen.getByRole("progressbar", {
      name: "AI credits remaining this month",
    });
    expect(creditsBar).toHaveAttribute("aria-valuenow", "67");

    const emailsBar = screen.getByRole("progressbar", {
      name: "Requo email sends remaining this month",
    });
    expect(emailsBar).toHaveAttribute("aria-valuenow", "80");
    expect(screen.getByText(/3 emails used · 80 % left/)).toBeInTheDocument();
  });

  it("renders an active subscription with portal deep links", () => {
    render(
      <BillingStatusCard
        billing={makeBilling({
          currentPlan: "pro",
          subscription: makeSubscription(),
        })}
        planUsage={defaultUsage}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Pro plan" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByText(/Next charge/)).toBeInTheDocument();
    expect(screen.getByText("Visa")).toBeInTheDocument();
    expect(screen.getByText("200 /month")).toBeInTheDocument();
    expect(screen.getAllByText("$9.00/mo").length).toBeGreaterThan(0);

    // The payment row renders exactly one icon (brand or card fallback),
    // never a brand icon stacked on top of a generic one.
    expect(screen.getAllByTestId("payment-method-icon")).toHaveLength(1);
    // The subscription summary has no duplicate price row.
    expect(screen.queryByText("Total")).not.toBeInTheDocument();

    expect(screen.getByRole("link", { name: "Manage" })).toHaveAttribute(
      "href",
      PORTAL_HREF,
    );
    expect(
      screen.getByRole("link", { name: /View billing details/ }),
    ).toHaveAttribute("href", PORTAL_HREF);
    expect(
      screen.getByRole("link", { name: /Cancel plan/ }),
    ).toHaveAttribute("href", PORTAL_HREF);

    // Highest-plan CTA is still an upgrade path from Pro.
    expect(
      screen.getByRole("button", { name: "Upgrade plan" }),
    ).toBeInTheDocument();
  });

  it("surfaces a canceling subscription with an access-until notice", () => {
    render(
      <BillingStatusCard
        billing={makeBilling({
          currentPlan: "pro",
          subscription: makeSubscription({
            canceledAt: new Date("2026-05-20T12:00:00.000Z"),
          }),
        })}
        planUsage={defaultUsage}
      />,
    );

    expect(screen.getByText("Canceling")).toBeInTheDocument();
    expect(screen.getByText("Subscription canceling")).toBeInTheDocument();
    expect(screen.getByText(/Access until/)).toBeInTheDocument();
  });

  it("warns when the last payment failed", () => {
    render(
      <BillingStatusCard
        billing={makeBilling({
          currentPlan: "pro",
          subscription: makeSubscription({ status: "past_due" }),
        })}
        planUsage={defaultUsage}
      />,
    );

    expect(screen.getByText("Past due")).toBeInTheDocument();
    expect(screen.getByText(/Your last payment failed/)).toBeInTheDocument();
  });

  it("shows no upgrade actions on the highest plan", () => {
    render(
      <BillingStatusCard
        billing={makeBilling({
          currentPlan: "business",
          subscription: makeSubscription({ plan: "business" }),
        })}
        planUsage={{ aiCredits: { used: 0, limit: 500 }, emailsSent: 0 }}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Business plan" }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", { name: "Highest plan active" }),
    ).toBeDisabled();
    expect(
      screen.queryByRole("button", { name: "Compare plans" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Upgrade plan/ }),
    ).not.toBeInTheDocument();
  });
});
