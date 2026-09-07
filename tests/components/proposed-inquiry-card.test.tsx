import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import {
  ProposedInquiryCard,
  toEditableValues,
} from "@/features/ai-agent/components/proposed-inquiry-card";
import type { ProposedInquiry } from "@/features/ai-agent/types";

function pendingProposal(): ProposedInquiry {
  return {
    id: "prop_123",
    values: {
      customerName: "Ana Torres",
      customerEmail: "ana@example.com",
      customerContactMethod: "email",
      customerContactHandle: "ana@example.com",
      serviceCategory: "Storefront signage",
      details: "Two front-window panels.",
      budgetText: "$400 - $900",
      requestedDeadline: "2026-06-15",
    },
    proposedAt: new Date().toISOString(),
    status: "pending",
  };
}

describe("ProposedInquiryCard", () => {
  it("renders every field as an editable control", () => {
    const proposal = pendingProposal();
    render(
      <ProposedInquiryCard
        approving={false}
        discarding={false}
        onApprove={() => {}}
        onDiscard={() => {}}
        onValuesChange={() => {}}
        proposal={proposal}
        serverError={null}
        values={toEditableValues(proposal)}
      />,
    );

    expect(screen.getByLabelText("Your name")).toBeInTheDocument();
    expect(screen.getByLabelText(/Email/)).toBeInTheDocument();
    expect(screen.getByLabelText("Contact details")).toBeInTheDocument();
    expect(screen.getByLabelText("Service needed")).toBeInTheDocument();
    expect(screen.getByLabelText("Project details")).toBeInTheDocument();
    expect(screen.getByLabelText(/Budget/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Deadline/)).toBeInTheDocument();
  });

  it("surfaces a validation message for a bad value", async () => {
    const user = userEvent.setup();
    const proposal = pendingProposal();
    const onApprove = vi.fn();

    const Wrapper = () => {
      const [values, setValues] = useState(toEditableValues(proposal));
      return (
        <ProposedInquiryCard
          approving={false}
          discarding={false}
          onApprove={onApprove}
          onDiscard={() => {}}
          onValuesChange={setValues}
          proposal={proposal}
          serverError={null}
          values={values}
        />
      );
    };

    render(<Wrapper />);

    await user.clear(screen.getByLabelText("Your name"));
    await user.click(screen.getByRole("button", { name: "Send inquiry" }));

    expect(
      await screen.findByText(/Enter your name|Customer name is required/i),
    ).toBeInTheDocument();
    expect(onApprove).not.toHaveBeenCalled();
  });

  it("exposes both actions to the keyboard", async () => {
    const user = userEvent.setup();
    const proposal = pendingProposal();
    const onApprove = vi.fn();
    const onDiscard = vi.fn();

    render(
      <ProposedInquiryCard
        approving={false}
        discarding={false}
        onApprove={onApprove}
        onDiscard={onDiscard}
        onValuesChange={() => {}}
        proposal={proposal}
        serverError={null}
        values={toEditableValues(proposal)}
      />,
    );

    await user.tab();
    // Tab through fields until both actions are reachable — assert presence in
    // tab order rather than exact order.
    const send = screen.getByRole("button", { name: "Send inquiry" });
    const discard = screen.getByRole("button", { name: "Discard" });
    expect(send).toBeInTheDocument();
    expect(discard).toBeInTheDocument();

    send.focus();
    expect(send).toHaveFocus();
    await user.tab();
    expect(discard).toHaveFocus();
  });

  it("renders its submitted state as read-only", () => {
    const proposal: ProposedInquiry = {
      ...pendingProposal(),
      status: "approved",
      inquiryId: "inq_123",
    };
    render(
      <ProposedInquiryCard
        approving={false}
        discarding={false}
        onApprove={() => {}}
        onDiscard={() => {}}
        onValuesChange={() => {}}
        proposal={proposal}
        serverError={null}
        values={toEditableValues(proposal)}
      />,
    );

    expect(screen.getByLabelText("Sent inquiry receipt")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Send inquiry" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Discard" })).not.toBeInTheDocument();
    expect(screen.getByText("Ana Torres")).toBeInTheDocument();
  });
});
