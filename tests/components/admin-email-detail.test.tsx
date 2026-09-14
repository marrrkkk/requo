import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { AdminEmailDetailView } from "@/features/admin/components/operations/emails/admin-email-detail";
import type { AdminEmailDetail } from "@/features/admin/types";

function makeEmailDetail(
  overrides: Partial<AdminEmailDetail> = {},
): AdminEmailDetail {
  return {
    id: "email_1",
    businessId: "biz_1",
    businessName: "Acme Plumbing",
    type: "quote",
    recipients: ["jane@example.com"],
    subject: "Your quote Q-1001 from Acme Plumbing",
    html: "<p>Hi Jane, your quote is ready.</p>",
    textBody: "Hi Jane, your quote is ready.",
    bodyRedacted: false,
    status: "sent",
    provider: "resend",
    providerMessageId: "pm_1",
    attempts: 1,
    lastError: null,
    idempotencyKey: "quote:quote_1:sent:jane",
    sentAt: new Date("2026-09-11T09:01:00Z"),
    createdAt: new Date("2026-09-11T09:00:00Z"),
    updatedAt: new Date("2026-09-11T09:01:00Z"),
    timeline: [
      {
        id: "att_1",
        provider: "resend",
        status: "success",
        errorMessage: null,
        retryable: false,
        createdAt: new Date("2026-09-11T09:01:00Z"),
      },
    ],
    ...overrides,
  };
}

describe("AdminEmailDetailView", () => {
  it("renders delivery state, recipients, and attempts", () => {
    render(<AdminEmailDetailView detail={makeEmailDetail()} />);

    expect(
      screen.getByText("Your quote Q-1001 from Acme Plumbing"),
    ).toBeInTheDocument();
    expect(screen.getByText("jane@example.com")).toBeInTheDocument();
    expect(screen.getByText("pm_1")).toBeInTheDocument();
    expect(screen.getAllByText("Acme Plumbing").length).toBeGreaterThan(0);
  });

  it("renders the body for non-auth emails", () => {
    render(<AdminEmailDetailView detail={makeEmailDetail()} />);

    expect(
      screen.getByText("Hi Jane, your quote is ready."),
    ).toBeInTheDocument();
    expect(
      screen.getByTitle('HTML body of "Your quote Q-1001 from Acme Plumbing"'),
    ).toBeInTheDocument();
  });

  it("redacts the body for auth emails", () => {
    const { container } = render(
      <AdminEmailDetailView
        detail={makeEmailDetail({
          type: "auth",
          subject: "Verify your email",
          html: null,
          textBody: null,
          bodyRedacted: true,
        })}
      />,
    );

    expect(
      screen.getByText("Body redacted for auth emails."),
    ).toBeInTheDocument();
    expect(container.querySelector("iframe")).not.toBeInTheDocument();
  });

  it("never renders cc or bcc", () => {
    render(<AdminEmailDetailView detail={makeEmailDetail()} />);

    expect(screen.queryByText("Cc")).not.toBeInTheDocument();
    expect(screen.queryByText("Bcc")).not.toBeInTheDocument();
  });

  it("names the empty timeline instead of rendering an empty feed", () => {
    render(
      <AdminEmailDetailView
        detail={makeEmailDetail({ timeline: [], status: "pending" }) as AdminEmailDetail}
      />,
    );

    expect(screen.getByText(/still pending/)).toBeInTheDocument();
  });
});
