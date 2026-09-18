import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

/**
 * Settings → Integrations connection card tests.
 *
 * The card is the only entry point to a provider connection, and platform
 * linking (ADR-013) changes what it may offer: a Stripe platform link is
 * started with "Connect with Stripe" and pasted keys are demoted to an
 * explicit Advanced fallback, while a platform-linked row must never offer
 * the key form (the server refuses it). These tests pin the states an owner
 * can actually land in, because a wrong branch here either hides the only
 * way to connect or offers an action that always errors.
 */

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/acme/settings/integrations",
  useRouter: () => ({ replace: vi.fn() }),
}));

vi.mock("@/components/base/notification/notify", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/features/payment-providers/actions", () => ({
  connectProviderAction: vi.fn(async () => ({})),
  disconnectProviderAction: vi.fn(async () => ({})),
  startStripeConnectAction: vi.fn(async () => ({})),
}));

import { ProviderConnectionManager } from "@/features/payment-providers/components/provider-connection-manager";
import type { ProviderConnectionView } from "@/features/payment-providers/queries";

function connection(
  overrides: Partial<ProviderConnectionView> = {},
): ProviderConnectionView {
  return {
    id: "ppc_1",
    provider: "stripe",
    environment: "test",
    status: "ready",
    authMode: "byo",
    publicHint: "••••1234",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function renderManager(
  connections: ProviderConnectionView[],
  platformConnectEnabled: boolean,
) {
  return render(
    <ProviderConnectionManager
      connections={connections}
      platformConnectEnabled={platformConnectEnabled}
    />,
  );
}

/** "Secret key" also labels PayMongo's field, so assertions scope to Stripe. */
function stripeCard(): HTMLElement {
  const heading = screen.getByRole("heading", { name: "Stripe" });
  return heading.closest("section") as HTMLElement;
}

describe("ProviderConnectionManager", () => {
  it("offers the Stripe platform link when the platform is configured", () => {
    renderManager([], true);
    expect(screen.getByRole("button", { name: "Connect with Stripe" })).toBeEnabled();
    // PayMongo and PayPal stay on pasted keys, so only those show the field.
    expect(screen.getAllByText("Secret key")).toHaveLength(1);
  });

  it("keeps the platform link visible but disabled when the platform is not configured", () => {
    renderManager([], false);
    const card = stripeCard();
    // The primary path stays discoverable instead of silently vanishing.
    expect(within(card).getByRole("button", { name: "Connect with Stripe" })).toBeDisabled();
    expect(
      within(card).getByText(/Not available yet: this Requo deployment has no Stripe platform account configured/),
    ).toBeInTheDocument();
    // Pasted keys remain reachable as the Advanced fallback.
    expect(
      within(card).getByRole("button", { name: "use your own Stripe keys instead" }),
    ).toBeInTheDocument();
  });

  it("swaps to the key form from the Advanced fallback", async () => {
    const user = userEvent.setup();
    renderManager([], true);
    await user.click(screen.getByRole("button", { name: "use your own Stripe keys instead" }));
    const card = stripeCard();
    expect(within(card).getByRole("button", { name: "Connect" })).toBeInTheDocument();
    expect(within(card).queryByRole("button", { name: "Connect with Stripe" })).not.toBeInTheDocument();
  });

  it("reports a ready platform connection and never re-offers connecting", () => {
    renderManager([connection({ authMode: "platform", status: "ready" })], true);
    const card = stripeCard();
    expect(within(card).getByText("Ready")).toBeInTheDocument();
    expect(within(card).getByText("Linked account")).toBeInTheDocument();
    expect(within(card).queryByRole("button", { name: "Connect with Stripe" })).not.toBeInTheDocument();
    expect(within(card).queryByText("Secret key")).not.toBeInTheDocument();
  });

  it("offers setup completion instead of reconnecting for an incomplete account", () => {
    renderManager([connection({ authMode: "platform", status: "action_required" })], true);
    const card = stripeCard();
    expect(within(card).getByText("Action required")).toBeInTheDocument();
    expect(within(card).getByRole("button", { name: "Finish Stripe setup" })).toBeInTheDocument();
    expect(within(card).queryByRole("button", { name: "Connect with Stripe" })).not.toBeInTheDocument();
  });

  it("labels a revoked platform connection as a reconnect", () => {
    renderManager([connection({ authMode: "platform", status: "revoked" })], true);
    const card = stripeCard();
    expect(within(card).getByText("Revoked")).toBeInTheDocument();
    expect(within(card).getByRole("button", { name: "Reconnect with Stripe" })).toBeInTheDocument();
  });

  it("keeps pasted keys for an existing key connection and hides the platform path", () => {
    renderManager([connection({ authMode: "byo", status: "ready" })], true);
    const card = stripeCard();
    expect(within(card).getByRole("button", { name: "Replace keys" })).toBeInTheDocument();
    expect(within(card).queryByRole("button", { name: "Connect with Stripe" })).not.toBeInTheDocument();
  });

  it("surfaces an incomplete onboarding row instead of the key form", () => {
    renderManager([connection({ authMode: "platform", status: "onboarding" })], true);
    const card = stripeCard();
    expect(within(card).getByText("Setup incomplete")).toBeInTheDocument();
    expect(within(card).queryByText("Secret key")).not.toBeInTheDocument();
  });
});
