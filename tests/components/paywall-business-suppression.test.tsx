import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

/**
 * Business plan suppression end-to-end tests.
 *
 * Validates Requirements 5.5 and 1.4:
 * - Business plan users never see upgrade prompts, locked-state indicators,
 *   plan badges, or blur overlays.
 * - UpgradePrompt returns null for business plan.
 * - LockedAction, FeaturePreviewPaywall, and PremiumContentBlur all pass
 *   through children normally for business plan users.
 */

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

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

// ── Imports ──────────────────────────────────────────────────────────────────

import { UpgradePrompt } from "@/features/paywall/components/upgrade-prompt";
import { LockedAction } from "@/features/paywall/components/locked-action";
import { FeaturePreviewPaywall } from "@/features/paywall/components/feature-preview-paywall";
import { PremiumContentBlur } from "@/features/paywall/components/premium-content-blur";
import type { PlanFeature } from "@/lib/plans/entitlements";

const BUSINESS_PLAN = "business" as const;

// Test across multiple features to ensure suppression is universal
const testFeatures: PlanFeature[] = [
  "analyticsConversion",
  "analyticsWorkflow",
  "members",
  "aiAssistant",
  "branding",
];

describe("Business plan suppression", () => {
  describe("UpgradePrompt", () => {
    it("returns null for business plan (no output rendered)", () => {
      const { container } = render(
        <UpgradePrompt
          variant="card"
          plan={BUSINESS_PLAN}
          description="Unlock advanced analytics"
          feature="analyticsConversion"
          showBadge
        />,
      );

      expect(container.innerHTML).toBe("");
    });

    it("returns null for all variants on business plan", () => {
      const variants = [
        "inline",
        "card",
        "banner",
        "empty-state",
        "modal",
      ] as const;

      for (const variant of variants) {
        const { container } = render(
          <UpgradePrompt
            variant={variant}
            plan={BUSINESS_PLAN}
            description="Some upgrade description"
            feature="members"
            showBadge
          />,
        );

        expect(container.innerHTML).toBe("");
      }
    });
  });

  describe("LockedAction", () => {
    it("renders children normally without lock indicators for business plan", () => {
      render(
        <LockedAction feature="members" plan={BUSINESS_PLAN}>
          <button type="button">Invite member</button>
        </LockedAction>,
      );

      const button = screen.getByRole("button", { name: "Invite member" });
      expect(button).toBeInTheDocument();
      // Should NOT have aria-disabled
      expect(button).not.toHaveAttribute("aria-disabled");
      // Should NOT have reduced opacity wrapper
      expect(button.closest("[class*='opacity-50']")).toBeNull();
    });

    it("passes through for all features on business plan", () => {
      for (const feature of testFeatures) {
        const { unmount } = render(
          <LockedAction feature={feature} plan={BUSINESS_PLAN}>
            <button type="button">Action for {feature}</button>
          </LockedAction>,
        );

        const button = screen.getByRole("button", {
          name: `Action for ${feature}`,
        });
        expect(button).toBeInTheDocument();
        expect(button).not.toHaveAttribute("aria-disabled");

        unmount();
      }
    });

    it("does not render lock icon or plan badge for business plan", () => {
      const { container } = render(
        <LockedAction feature="analyticsConversion" plan={BUSINESS_PLAN}>
          <button type="button">View analytics</button>
        </LockedAction>,
      );

      // No lock icon (svg with Lock class or aria-hidden lock)
      expect(container.querySelector("[aria-hidden='true']")).toBeNull();
      // No plan badge
      expect(screen.queryByText("Pro")).not.toBeInTheDocument();
      expect(screen.queryByText("Business")).not.toBeInTheDocument();
    });
  });

  describe("FeaturePreviewPaywall", () => {
    it("renders children without paywall indicators for business plan", () => {
      render(
        <FeaturePreviewPaywall
          feature="analyticsConversion"
          plan={BUSINESS_PLAN}
          previewContent={<div>Preview data</div>}
        >
          <div data-testid="real-content">Real analytics content</div>
        </FeaturePreviewPaywall>,
      );

      // Real content is rendered
      expect(screen.getByTestId("real-content")).toBeInTheDocument();
      expect(screen.getByText("Real analytics content")).toBeInTheDocument();

      // Preview content is NOT rendered
      expect(screen.queryByText("Preview data")).not.toBeInTheDocument();
      // No "Demo data" badge
      expect(screen.queryByText("Demo data")).not.toBeInTheDocument();
      // No upgrade prompt
      expect(screen.queryByText(/Upgrade to/)).not.toBeInTheDocument();
    });

    it("renders children for all features on business plan", () => {
      for (const feature of testFeatures) {
        const { unmount } = render(
          <FeaturePreviewPaywall feature={feature} plan={BUSINESS_PLAN}>
            <div data-testid={`content-${feature}`}>Content for {feature}</div>
          </FeaturePreviewPaywall>,
        );

        expect(screen.getByTestId(`content-${feature}`)).toBeInTheDocument();
        expect(screen.queryByText("Demo data")).not.toBeInTheDocument();
        expect(screen.queryByText(/Upgrade to/)).not.toBeInTheDocument();

        unmount();
      }
    });
  });

  describe("PremiumContentBlur", () => {
    it("renders children without blur for business plan", () => {
      const { container } = render(
        <PremiumContentBlur
          feature="analyticsConversion"
          plan={BUSINESS_PLAN}
          placeholder={<div>Placeholder content</div>}
        >
          <div data-testid="premium-data">Real premium data</div>
        </PremiumContentBlur>,
      );

      // Real content is rendered
      expect(screen.getByTestId("premium-data")).toBeInTheDocument();
      expect(screen.getByText("Real premium data")).toBeInTheDocument();

      // Placeholder is NOT rendered
      expect(screen.queryByText("Placeholder content")).not.toBeInTheDocument();
      // No blur class
      expect(container.querySelector("[class*='blur']")).toBeNull();
      // No upgrade prompt overlay
      expect(screen.queryByText(/Upgrade to/)).not.toBeInTheDocument();
    });

    it("renders children for all features on business plan", () => {
      for (const feature of testFeatures) {
        const { unmount } = render(
          <PremiumContentBlur
            feature={feature}
            plan={BUSINESS_PLAN}
            placeholder={<div>Placeholder for {feature}</div>}
          >
            <div data-testid={`premium-${feature}`}>
              Premium content for {feature}
            </div>
          </PremiumContentBlur>,
        );

        expect(screen.getByTestId(`premium-${feature}`)).toBeInTheDocument();
        expect(
          screen.queryByText(`Placeholder for ${feature}`),
        ).not.toBeInTheDocument();
        expect(screen.queryByText(/Upgrade to/)).not.toBeInTheDocument();

        unmount();
      }
    });
  });

  describe("Integration: no paywall UI renders for business-plan users", () => {
    it("renders a full page with all paywall components and no upgrade UI for business plan", () => {
      const { container } = render(
        <div data-testid="page-layout">
          {/* UpgradePrompt should render nothing */}
          <UpgradePrompt
            variant="banner"
            plan={BUSINESS_PLAN}
            description="Unlock premium features"
            feature="analyticsConversion"
            showBadge
          />

          {/* LockedAction should pass through */}
          <LockedAction feature="members" plan={BUSINESS_PLAN}>
            <button type="button">Invite team member</button>
          </LockedAction>

          {/* FeaturePreviewPaywall should show children */}
          <FeaturePreviewPaywall
            feature="analyticsWorkflow"
            plan={BUSINESS_PLAN}
            previewContent={<div>Demo workflow data</div>}
          >
            <section data-testid="workflow-section">
              Workflow analytics content
            </section>
          </FeaturePreviewPaywall>

          {/* PremiumContentBlur should show children */}
          <PremiumContentBlur
            feature="aiAssistant"
            plan={BUSINESS_PLAN}
            placeholder={<div>AI placeholder</div>}
          >
            <div data-testid="ai-content">AI-generated suggestions</div>
          </PremiumContentBlur>
        </div>,
      );

      // All real content is visible
      expect(
        screen.getByRole("button", { name: "Invite team member" }),
      ).toBeInTheDocument();
      expect(screen.getByTestId("workflow-section")).toBeInTheDocument();
      expect(screen.getByTestId("ai-content")).toBeInTheDocument();

      // No paywall UI anywhere
      expect(screen.queryByText(/Upgrade to/)).not.toBeInTheDocument();
      expect(screen.queryByText("Demo data")).not.toBeInTheDocument();
      expect(screen.queryByText("Demo workflow data")).not.toBeInTheDocument();
      expect(screen.queryByText("AI placeholder")).not.toBeInTheDocument();
      expect(container.querySelector("[class*='blur']")).toBeNull();
      expect(
        container.querySelector("[aria-disabled='true']"),
      ).not.toBeInTheDocument();
    });
  });
});
