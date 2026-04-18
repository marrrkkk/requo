import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { OnboardingForm } from "@/features/onboarding/components/onboarding-form";
import { onboardingSessionStorageKey } from "@/features/onboarding/helpers";
import type { OnboardingActionState } from "@/features/onboarding/types";

const {
  toastErrorMock,
  toastSuccessMock,
} = vi.hoisted(() => ({
  toastErrorMock: vi.fn(),
  toastSuccessMock: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    error: toastErrorMock,
    success: toastSuccessMock,
  },
}));

vi.mock("@/features/onboarding/components/onboarding-preview-dialog", () => ({
  OnboardingPreviewDialog: () => null,
}));

function seedOnboardingDraft(currentStep: number) {
  window.sessionStorage.setItem(
    onboardingSessionStorageKey,
    JSON.stringify({
      currentStep,
      draft: {
        workspaceName: "Northline Workspace",
        businessName: "Northline Studio",
        businessType: "web_it_services",
        starterTemplateBusinessType: "creative_marketing_services",
        countryCode: "US",
        defaultCurrency: "USD",
      },
    }),
  );
}

describe("onboarding form", () => {
  const actionMock = vi.fn<
    (
      state: OnboardingActionState,
      formData: FormData,
    ) => Promise<OnboardingActionState>
  >(async (state) => state);

  beforeEach(() => {
    actionMock.mockClear();
    toastErrorMock.mockReset();
    toastSuccessMock.mockReset();
    window.sessionStorage.clear();
  });

  afterEach(() => {
    window.sessionStorage.clear();
  });

  it("does not render the removed guided setup chrome", async () => {
    seedOnboardingDraft(3);

    render(<OnboardingForm action={actionMock} />);

    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: "Review your inquiry page" }),
      ).toBeInTheDocument(),
    );

    expect(screen.queryByText("Guided setup")).not.toBeInTheDocument();
    expect(screen.queryByText(/finish with/i)).not.toBeInTheDocument();
  });

  it("does not submit when Continue advances to the review step", async () => {
    seedOnboardingDraft(2);

    const user = userEvent.setup();
    render(<OnboardingForm action={actionMock} />);

    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: "Start with a template" }),
      ).toBeInTheDocument(),
    );

    await user.click(screen.getByRole("button", { name: "Continue" }));

    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: "Review your inquiry page" }),
      ).toBeInTheDocument(),
    );

    expect(screen.getByRole("button", { name: "Finish setup" })).toBeVisible();
    expect(actionMock).not.toHaveBeenCalled();
  });
});
