import { describe, expect, it, vi, beforeAll, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

const setTheme = vi.fn();
const setUiScale = vi.fn();

vi.mock("@/components/theme-provider", () => ({
  useTheme: () => ({
    resolvedTheme: "light",
    setTheme,
    theme: "system",
    uiScale: "default",
    setUiScale,
  }),
}));

const updateThemePreferenceAction = vi.fn().mockResolvedValue({ ok: true });
const updateUiScalePreferenceAction = vi.fn().mockResolvedValue({ ok: true });

vi.mock("@/features/theme/actions", () => ({
  updateThemePreferenceAction: (...args: unknown[]) =>
    updateThemePreferenceAction(...args),
}));

vi.mock("@/features/theme/ui-scale-actions", () => ({
  updateUiScalePreferenceAction: (...args: unknown[]) =>
    updateUiScalePreferenceAction(...args),
}));

import { AppearanceSettingsForm } from "@/features/theme/components/appearance-settings-form";

describe("AppearanceSettingsForm", () => {
  beforeAll(() => {
    // Radix Select relies on pointer capture, which jsdom lacks.
    const proto = window.HTMLElement.prototype as HTMLElement & {
      hasPointerCapture?: () => boolean;
      setPointerCapture?: () => void;
      releasePointerCapture?: () => void;
    };
    if (typeof proto.hasPointerCapture !== "function") {
      proto.hasPointerCapture = () => false;
      proto.setPointerCapture = () => {};
      proto.releasePointerCapture = () => {};
    }
  });

  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
  });

  it("renders theme preview cards without any language setting", () => {
    render(<AppearanceSettingsForm userId="user-1" />);

    expect(
      screen.getByRole("radiogroup", { name: "Color theme" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /light/i })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /dark/i })).toBeInTheDocument();
    expect(
      screen.getByRole("radio", { name: /system settings/i }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("heading", { name: "Interface" }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/language/i)).not.toBeInTheDocument();
  });

  it("renders the scale selector with the three scale options", async () => {
    const user = userEvent.setup();
    render(<AppearanceSettingsForm userId="user-1" />);

    const trigger = screen.getByRole("combobox", { name: "Interface scale" });
    expect(trigger).toHaveTextContent(/default.*100%/i);

    await user.click(trigger);
    expect(await screen.findByRole("option", { name: "Small" })).toBeInTheDocument();
    expect(
      await screen.findByRole("option", { name: /default.*100%/i }),
    ).toBeInTheDocument();
    expect(await screen.findByRole("option", { name: "Large" })).toBeInTheDocument();
  });

  it("saves the theme optimistically when a card is selected", async () => {
    const user = userEvent.setup();
    render(<AppearanceSettingsForm userId="user-1" />);

    await user.click(screen.getByRole("radio", { name: /dark/i }));

    expect(setTheme).toHaveBeenCalledWith("dark");
    expect(updateThemePreferenceAction).toHaveBeenCalledWith("dark");
  });

  it("saves the scale when a new scale is chosen", async () => {
    const user = userEvent.setup();
    render(<AppearanceSettingsForm userId="user-1" />);

    await user.click(screen.getByRole("combobox", { name: "Interface scale" }));
    await user.click(await screen.findByRole("option", { name: "Large" }));

    expect(setUiScale).toHaveBeenCalledWith("large");
    expect(updateUiScalePreferenceAction).toHaveBeenCalledWith("large");
  });
});
