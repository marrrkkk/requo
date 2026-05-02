import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { CreateWorkspaceDialog } from "@/features/workspaces/components/create-workspace-dialog";

vi.mock("@/features/workspaces/components/create-workspace-form", () => ({
  CreateWorkspaceForm: () => <div>Mock workspace form</div>,
}));

describe("CreateWorkspaceDialog", () => {
  it("opens from the card trigger on click", async () => {
    const user = userEvent.setup();

    render(<CreateWorkspaceDialog triggerVariant="card" />);

    const trigger = screen.getByRole("button", { name: /new workspace/i });

    expect(trigger).toHaveAttribute("aria-expanded", "false");

    await user.click(trigger);

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Create new workspace" }),
    ).toBeInTheDocument();
    expect(trigger).toHaveAttribute("aria-expanded", "true");
  });

  it("opens from the card trigger on keyboard activation", async () => {
    const user = userEvent.setup();

    render(<CreateWorkspaceDialog triggerVariant="card" />);

    const trigger = screen.getByRole("button", { name: /new workspace/i });

    trigger.focus();
    await user.keyboard("[Space]");

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
  });
});
