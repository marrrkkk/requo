import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";

import { statusTones } from "@/components/shared/status-badge";
import { InquiryRecordStateBadge } from "@/features/inquiries/components/inquiry-record-state-badge";
import { InquiryStatusBadge } from "@/features/inquiries/components/inquiry-status-badge";
import {
  inquiryRecordStateTones,
  inquiryStatusTones,
} from "@/features/inquiries/utils";
import type { InquiryStatus } from "@/features/inquiries/types";
import { InvoiceStatusBadge } from "@/features/invoices/components/invoice-status-badge";
import { invoiceStatusTones } from "@/features/invoices/utils";
import type { InvoiceStatus } from "@/features/invoices/types";
import { AiReviewBadge } from "@/features/quotes/components/quote-editor/line-item-row";
import { QuoteRecordStateBadge } from "@/features/quotes/components/quote-record-state-badge";
import { QuoteReminderBadge } from "@/features/quotes/components/quote-reminder-badge";
import { QuoteStatusBadge } from "@/features/quotes/components/quote-status-badge";
import {
  quoteRecordStateTones,
  quoteReminderTones,
  quoteStatusTones,
} from "@/features/quotes/utils";
import type { QuoteStatus } from "@/features/quotes/types";
import type { AdminHealthCheckStatus } from "@/lib/admin/health-checks";
import type { EmailOutboxStatus } from "@/lib/db/schema/email";
import {
  AdminAiStatusBadge,
  AdminEmailStatusBadge,
  AdminHealthStatusBadge,
  AdminUserStatusBadge,
  type AdminAiCallStatus,
  type AdminUserAccountStatus,
} from "@/features/admin/components/primitives/admin-status-badges";
import { BusinessStatusBadge } from "@/features/businesses/components/business-status-badge";
import type { BusinessRecordState } from "@/features/businesses/lifecycle";
import {
  FollowUpDueBadge,
  FollowUpStatusBadge,
} from "@/features/follow-ups/components/follow-up-status-badge";
import type {
  FollowUpDueBucket,
  FollowUpStatus,
} from "@/features/follow-ups/types";
import {
  followUpDueBucketTones,
  followUpStatusTones,
} from "@/features/follow-ups/utils";

/**
 * The migrated wrappers keep their names and props, so these tests assert the
 * two things that actually changed: the tone each status resolves to, and that
 * no wrapper reintroduces an `!important` colour override.
 */

// Leading (`!bg-x`) or trailing (`bg-x!`) important-flagged colour utilities.
// The Badge primitive's own `[&>svg]:size-3!` is unrelated icon sizing.
const IMPORTANT_COLOUR = [
  /(?:^|\s)!(?:bg|text|border|ring)-/,
  /(?:bg|text|border|ring)-[a-z0-9./-]+!/,
] as const;

function badgeOf(container: HTMLElement) {
  const badge = container.querySelector('[data-slot="badge"]');
  expect(badge).not.toBeNull();
  return badge as HTMLElement;
}

function expectNoImportantColour(badge: HTMLElement) {
  for (const pattern of IMPORTANT_COLOUR) {
    expect(badge.className).not.toMatch(pattern);
  }
}

describe("domain status badges", () => {
  it("resolves every quote status to its mapped tone", () => {
    for (const [status, tone] of Object.entries(quoteStatusTones)) {
      const { container, unmount } = render(
        <QuoteStatusBadge status={status as QuoteStatus} />,
      );
      const badge = badgeOf(container);

      expect(badge).toHaveAttribute("data-tone", tone);
      expect(badge.textContent).not.toBe("");
      expectNoImportantColour(badge);

      unmount();
    }
  });

  it("resolves every inquiry status to its mapped tone", () => {
    for (const [status, tone] of Object.entries(inquiryStatusTones)) {
      const { container, unmount } = render(
        <InquiryStatusBadge status={status as InquiryStatus} />,
      );
      const badge = badgeOf(container);

      expect(badge).toHaveAttribute("data-tone", tone);
      expect(badge.textContent).not.toBe("");
      expectNoImportantColour(badge);

      unmount();
    }
  });

  it("resolves every invoice status to its mapped tone", () => {
    for (const [status, tone] of Object.entries(invoiceStatusTones)) {
      const { container, unmount } = render(
        <InvoiceStatusBadge status={status as InvoiceStatus} />,
      );
      const badge = badgeOf(container);

      expect(badge).toHaveAttribute("data-tone", tone);
      expect(badge.textContent).not.toBe("");
      expectNoImportantColour(badge);

      unmount();
    }
  });

  it("keeps void invoices struck through", () => {
    const { container } = render(<InvoiceStatusBadge status="voided" />);
    expect(badgeOf(container).className).toContain("line-through");
  });

  it("does not strike through a non-void invoice", () => {
    const { container } = render(<InvoiceStatusBadge status="paid" />);
    expect(badgeOf(container).className).not.toContain("line-through");
  });

  it("resolves reminder and record-state badges through the shared tones", () => {
    for (const [kind, tone] of Object.entries(quoteReminderTones)) {
      const { container, unmount } = render(
        <QuoteReminderBadge kind={kind as keyof typeof quoteReminderTones} />,
      );
      expect(badgeOf(container)).toHaveAttribute("data-tone", tone);
      unmount();
    }

    const quoteArchived = render(<QuoteRecordStateBadge state="archived" />);
    expect(badgeOf(quoteArchived.container)).toHaveAttribute(
      "data-tone",
      quoteRecordStateTones.archived,
    );
    quoteArchived.unmount();

    const inquiryArchived = render(
      <InquiryRecordStateBadge state="archived" />,
    );
    expect(badgeOf(inquiryArchived.container)).toHaveAttribute(
      "data-tone",
      inquiryRecordStateTones.archived,
    );
    inquiryArchived.unmount();
  });

  it("maps the AI line-item review badge onto the shared tones", () => {
    const base = {
      name: "Interior painting",
      pricingSourceLabel: null,
      confidence: "high",
      reason: "",
    } as const;

    const matched = render(
      <AiReviewBadge
        review={{
          ...base,
          pricingSource: "pricing_library_block",
          reviewStatus: "matched",
        }}
      />,
    );
    expect(badgeOf(matched.container)).toHaveAttribute("data-tone", "success");

    const calculated = render(
      <AiReviewBadge
        review={{
          ...base,
          pricingSource: "past_quote",
          reviewStatus: "calculated",
        }}
      />,
    );
    expect(badgeOf(calculated.container)).toHaveAttribute("data-tone", "info");
  });

  it("renders nothing for a review that is not pricing-library sourced", () => {
    const { container } = render(
      <AiReviewBadge
        review={{
          name: "Unpriced item",
          pricingSource: "none",
          pricingSourceLabel: null,
          confidence: "low",
          reviewStatus: "needs_review",
          reason: "",
        }}
      />,
    );
    expect(container.querySelector('[data-slot="badge"]')).toBeNull();
  });

  it("only uses tones from the shared vocabulary", () => {
    const used = [
      ...Object.values(quoteStatusTones),
      ...Object.values(quoteReminderTones),
      ...Object.values(quoteRecordStateTones),
      ...Object.values(inquiryStatusTones),
      ...Object.values(inquiryRecordStateTones),
      ...Object.values(invoiceStatusTones),
      ...Object.values(followUpStatusTones),
      ...Object.values(followUpDueBucketTones),
    ];

    expect(used.length).toBeGreaterThan(0);
    for (const tone of used) {
      expect(statusTones).toContain(tone);
    }
  });
});

describe("follow-up, business, and admin status badges", () => {
  it("resolves every follow-up status to its mapped tone", () => {
    for (const [status, tone] of Object.entries(followUpStatusTones)) {
      const { container, unmount } = render(
        <FollowUpStatusBadge status={status as FollowUpStatus} />,
      );
      const badge = badgeOf(container);

      expect(badge).toHaveAttribute("data-tone", tone);
      expectNoImportantColour(badge);

      unmount();
    }
  });

  it("resolves every follow-up due bucket to its mapped tone", () => {
    for (const [bucket, tone] of Object.entries(followUpDueBucketTones)) {
      const { container, unmount } = render(
        <FollowUpDueBadge bucket={bucket as FollowUpDueBucket} />,
      );
      const badge = badgeOf(container);

      expect(badge).toHaveAttribute("data-tone", tone);
      expectNoImportantColour(badge);

      unmount();
    }
  });

  it("accepts a caller className on the follow-up badges", () => {
    const { container } = render(
      <FollowUpStatusBadge status="pending" className="mt-2" />,
    );
    expect(badgeOf(container).className).toContain("mt-2");
  });

  it("pins the business lifecycle tones", () => {
    const expected: Record<BusinessRecordState, string> = {
      active: "success",
      locked: "warning",
      archived: "neutral",
      trash: "danger",
    };

    for (const [status, tone] of Object.entries(expected)) {
      const { container, unmount } = render(
        <BusinessStatusBadge status={status as BusinessRecordState} />,
      );
      const badge = badgeOf(container);

      expect(badge).toHaveAttribute("data-tone", tone);
      expectNoImportantColour(badge);

      unmount();
    }
  });

  it("pins the admin account, email, and AI tones", () => {
    const users: Record<AdminUserAccountStatus, string> = {
      active: "success",
      unverified: "warning",
      suspended: "danger",
      admin: "progress",
    };

    for (const [status, tone] of Object.entries(users)) {
      const { container, unmount } = render(
        <AdminUserStatusBadge status={status as AdminUserAccountStatus} />,
      );
      expect(badgeOf(container)).toHaveAttribute("data-tone", tone);
      unmount();
    }

    const emails: Record<EmailOutboxStatus, string> = {
      pending: "neutral",
      sending: "active",
      sent: "success",
      failed: "danger",
      unknown: "warning",
    };

    for (const [status, tone] of Object.entries(emails)) {
      const { container, unmount } = render(
        <AdminEmailStatusBadge status={status as EmailOutboxStatus} />,
      );
      expect(badgeOf(container)).toHaveAttribute("data-tone", tone);
      unmount();
    }

    const ai: Record<AdminAiCallStatus, string> = {
      success: "success",
      error: "danger",
    };

    for (const [status, tone] of Object.entries(ai)) {
      const { container, unmount } = render(
        <AdminAiStatusBadge status={status as AdminAiCallStatus} />,
      );
      expect(badgeOf(container)).toHaveAttribute("data-tone", tone);
      unmount();
    }
  });

  it("pins the health tones and reuses the system page's labels", () => {
    const expected: Record<AdminHealthCheckStatus, string> = {
      pass: "success",
      warn: "warning",
      fail: "danger",
      skip: "neutral",
    };

    for (const [status, tone] of Object.entries(expected)) {
      const { container, unmount } = render(
        <AdminHealthStatusBadge status={status as AdminHealthCheckStatus} />,
      );
      const badge = badgeOf(container);

      expect(badge).toHaveAttribute("data-tone", tone);
      expectNoImportantColour(badge);

      unmount();
    }

    // Labels come from `checkStatusLabel`, not a local map, so this badge and
    // the rest of the system page cannot drift apart.
    const { container } = render(<AdminHealthStatusBadge status="pass" />);
    expect(badgeOf(container).textContent).toBe("Healthy");
  });
});
