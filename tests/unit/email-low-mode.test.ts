import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

afterEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.unstubAllEnvs();
});

describe("low-email deployment configuration", () => {
  it("keeps optional email paths enabled by default", async () => {
    const env = await import("@/lib/env");

    expect(env.isLowEmailMode).toBe(false);
    expect(env.isInquiryAckEmailEnabled).toBe(true);
    expect(env.isFollowUpReminderEmailEnabled).toBe(true);
    expect(env.isQuoteAutoFollowUpEmailEnabled).toBe(true);
    expect(env.isAnalyticsDigestEmailEnabled).toBe(true);
    expect(env.isAnalyticsScheduledReportEmailEnabled).toBe(true);
    expect(env.isMemberInviteEmailEnabled).toBe(true);
    expect(env.isMagicLinkLoginEnabled).toBe(true);
  });

  it("disables optional operational email in low-email mode while keeping auth and explicit quote paths", async () => {
    vi.stubEnv("LOW_EMAIL_MODE", "1");
    vi.resetModules();
    const env = await import("@/lib/env");

    expect(env.isLowEmailMode).toBe(true);
    expect(env.isInquiryAckEmailEnabled).toBe(false);
    expect(env.isFollowUpReminderEmailEnabled).toBe(false);
    expect(env.isQuoteAutoFollowUpEmailEnabled).toBe(false);
    expect(env.isAnalyticsDigestEmailEnabled).toBe(false);
    expect(env.isAnalyticsScheduledReportEmailEnabled).toBe(false);
    expect(env.isMemberInviteEmailEnabled).toBe(false);
    // Magic-link stays independently controlled.
    expect(env.isMagicLinkLoginEnabled).toBe(true);

    const paths = env.getActiveEmailPaths();
    const byKey = Object.fromEntries(paths.map((path) => [path.key, path]));

    expect(byKey["auth-verification"]?.active).toBe(true);
    expect(byKey["auth-password-reset"]?.active).toBe(true);
    expect(byKey["quote-explicit"]?.active).toBe(true);
    expect(byKey["quote-manual-link"]?.active).toBe(true);
    expect(byKey["inquiry-ack"]?.active).toBe(false);
    expect(byKey["follow-up-reminder"]?.active).toBe(false);
    expect(byKey["quote-auto-follow-up"]?.active).toBe(false);
    expect(byKey["analytics-digest"]?.active).toBe(false);
    expect(byKey["analytics-scheduled-reports"]?.active).toBe(false);
    expect(byKey["member-invite"]?.active).toBe(false);
  });

  it("disables magic-link login independently of other email paths", async () => {
    vi.stubEnv("DISABLE_MAGIC_LINK", "1");
    vi.resetModules();
    const env = await import("@/lib/env");

    expect(env.isLowEmailMode).toBe(false);
    expect(env.isMagicLinkLoginEnabled).toBe(false);
    expect(env.isMagicLinkEnabled).toBe(false);
    expect(env.isInquiryAckEmailEnabled).toBe(true);
    expect(env.isQuoteAutoFollowUpEmailEnabled).toBe(true);
  });
});

describe("quote auto-follow-ups in low-email mode", () => {
  it("produces no customer email when disabled", async () => {
    vi.resetModules();
    const sendQuoteAutoFollowUpEmail = vi.fn(async () => undefined);
    vi.doMock("@/lib/env", () => ({
      env: { BETTER_AUTH_URL: "http://127.0.0.1:3000" },
      isQuoteAutoFollowUpEmailEnabled: false,
    }));
    vi.doMock("@/lib/resend/client", () => ({
      sendQuoteAutoFollowUpEmail,
    }));
    vi.doMock("@/lib/db/client", () => ({ db: {} }));

    const { processQuoteAutoFollowUps } = await import(
      "@/features/quotes/jobs/auto-follow-ups"
    );

    await expect(processQuoteAutoFollowUps()).resolves.toEqual({
      processed: 0,
      sent: 0,
      errors: 0,
    });
    expect(sendQuoteAutoFollowUpEmail).not.toHaveBeenCalled();
  });
});

describe("analytics emails in low-email mode", () => {
  it("skips the weekly digest without sending", async () => {
    vi.resetModules();
    const sendEmailWithFallback = vi.fn(async () => ({}));
    vi.doMock("@/lib/env", () => ({
      isAnalyticsDigestEmailEnabled: false,
      isEmailConfigured: true,
    }));
    vi.doMock("@/lib/email/send-email", () => ({ sendEmailWithFallback }));
    vi.doMock("@/lib/db/client", () => ({ db: {} }));
    vi.doMock("@/lib/ai", () => ({
      generateWithFallback: vi.fn(),
      isAiConfigured: () => false,
    }));

    const { sendAnalyticsDigestEmails } = await import(
      "@/features/analytics/jobs/digest"
    );

    await expect(sendAnalyticsDigestEmails()).resolves.toEqual(
      expect.objectContaining({ skipped: true, reason: "low_email_mode" }),
    );
    expect(sendEmailWithFallback).not.toHaveBeenCalled();
  });

  it("skips scheduled reports without sending", async () => {
    vi.resetModules();
    const sendEmailWithFallback = vi.fn(async () => ({}));
    vi.doMock("@/lib/env", () => ({
      isAnalyticsScheduledReportEmailEnabled: false,
      isEmailConfigured: true,
    }));
    vi.doMock("@/lib/email/send-email", () => ({ sendEmailWithFallback }));
    vi.doMock("@/lib/db/client", () => ({ db: {} }));

    const { sendAnalyticsScheduledReports } = await import(
      "@/features/analytics/jobs/scheduled-reports"
    );

    await expect(sendAnalyticsScheduledReports()).resolves.toEqual(
      expect.objectContaining({ skipped: true, reason: "low_email_mode" }),
    );
    expect(sendEmailWithFallback).not.toHaveBeenCalled();
  });
});

describe("inquiry acknowledgment email", () => {
  async function importAckHarness(
    enabled: boolean,
    businessRow: {
      sendInquiryAckEmail: boolean;
      name: string;
      contactEmail: string | null;
    } | null,
  ) {
    vi.resetModules();
    const sendInquiryAcknowledgmentEmail = vi.fn(async () => undefined);
    vi.doMock("@/lib/env", () => ({
      isInquiryAckEmailEnabled: enabled,
    }));
    vi.doMock("@/lib/resend/client", () => ({
      sendInquiryAcknowledgmentEmail,
    }));
    vi.doMock("@/lib/inngest/send", () => ({
      sendInquiryQualifiedEvent: vi.fn(async () => undefined),
    }));
    const limit = vi.fn(async () => (businessRow ? [businessRow] : []));
    const where = vi.fn(() => ({ limit }));
    const from = vi.fn(() => ({ where }));
    const select = vi.fn(() => ({ from }));
    vi.doMock("@/lib/db/client", () => ({ db: { select } }));

    const mod = await import("@/features/inquiries/defaults");

    return { ...mod, sendInquiryAcknowledgmentEmail };
  }

  const submission = {
    businessId: "business_123",
    inquiryId: "inquiry_123",
    customerEmail: "customer@example.com",
    customerName: "Ava Cruz",
    serviceCategory: "Signage",
    details: "We need a new storefront sign.",
  };

  it("suppresses acknowledgment email in low-email mode even when the business opted in", async () => {
    // The harness flag models isInquiryAckEmailEnabled = !isLowEmailMode.
    const harness = await importAckHarness(false, {
      sendInquiryAckEmail: true,
      name: "BrightSide Print Studio",
      contactEmail: null,
    });

    await harness.maybeSendInquiryAckEmail(submission);

    expect(harness.sendInquiryAcknowledgmentEmail).not.toHaveBeenCalled();
  });

  it("sends acknowledgment email when enabled and the business opted in", async () => {
    const harness = await importAckHarness(true, {
      sendInquiryAckEmail: true,
      name: "BrightSide Print Studio",
      contactEmail: null,
    });

    await harness.maybeSendInquiryAckEmail(submission);

    expect(harness.sendInquiryAcknowledgmentEmail).toHaveBeenCalledTimes(1);
  });

  it("respects the per-business opt-out when the deployment allows email", async () => {
    const harness = await importAckHarness(true, {
      sendInquiryAckEmail: false,
      name: "BrightSide Print Studio",
      contactEmail: null,
    });

    await harness.maybeSendInquiryAckEmail(submission);

    expect(harness.sendInquiryAcknowledgmentEmail).not.toHaveBeenCalled();
  });
});

describe("follow-up reminders in low-email mode", () => {
  async function importRemindersHarness(emailEnabled: boolean) {
    vi.resetModules();
    const sendEmailWithFallback = vi.fn(async () => ({}));
    const insertBusinessNotification = vi.fn(async () => ({}));

    const dueRow = {
      followUpId: "fup_123",
      followUpTitle: "Check quote Q-1002",
      followUpReason: "Customer has not responded yet.",
      businessId: "business_123",
      businessName: "BrightSide Print Studio",
      businessSlug: "brightside-print-studio",
      businessContactEmail: "owner@example.com",
      notifyEmail: true,
      notifyInApp: true,
      inquiryId: "inquiry_123",
      quoteId: null,
      customerName: "Ava Cruz",
      quoteCustomerName: null,
      quoteNumber: null,
    };

    const emptyChain = () => ({
      from: () => ({
        innerJoin: () => ({
          leftJoin: () => ({
            leftJoin: () => ({
              where: () => ({
                orderBy: () => ({
                  limit: async () => [],
                }),
              }),
            }),
          }),
          where: () => ({
            orderBy: () => ({
              limit: async () => [],
            }),
          }),
        }),
      }),
    });

    const dueChain = {
      from: () => ({
        innerJoin: () => ({
          leftJoin: () => ({
            leftJoin: () => ({
              where: () => ({
                orderBy: () => ({
                  limit: async () => [dueRow],
                }),
              }),
            }),
          }),
        }),
      }),
    };

    const select = vi
      .fn()
      .mockImplementationOnce(() => dueChain)
      .mockImplementation(() => emptyChain());

    const tx = {
      select: () => ({
        from: () => ({
          where: () => ({
            for: async () => [{ id: "fup_123" }],
          }),
        }),
      }),
      update: () => ({
        set: () => ({
          where: async () => ({}),
        }),
      }),
    };
    const transaction = vi.fn(async (callback: (tx: unknown) => unknown) =>
      callback(tx),
    );

    vi.doMock("@/lib/env", () => ({
      env: { BETTER_AUTH_URL: "http://127.0.0.1:3000" },
      isFollowUpReminderEmailEnabled: emailEnabled,
    }));
    vi.doMock("@/lib/email", () => ({ sendEmailWithFallback }));
    vi.doMock("@/features/notifications/mutations", () => ({
      insertBusinessNotification,
    }));
    vi.doMock("@/lib/db/client", () => ({ db: { select, transaction } }));

    const mod = await import("@/features/follow-ups/jobs/reminders");

    return { ...mod, sendEmailWithFallback, insertBusinessNotification };
  }

  it("creates the in-app reminder without sending email when disabled", async () => {
    const harness = await importRemindersHarness(false);

    const summary = await harness.processFollowUpReminders();

    expect(harness.insertBusinessNotification).toHaveBeenCalledTimes(1);
    expect(harness.sendEmailWithFallback).not.toHaveBeenCalled();
    expect(summary).toEqual(
      expect.objectContaining({
        processed: 1,
        emailsSent: 0,
        inAppCreated: 1,
      }),
    );
  });

  it("sends email when explicitly enabled alongside the in-app reminder", async () => {
    const harness = await importRemindersHarness(true);

    const summary = await harness.processFollowUpReminders();

    expect(harness.insertBusinessNotification).toHaveBeenCalledTimes(1);
    expect(harness.sendEmailWithFallback).toHaveBeenCalledTimes(1);
    expect(summary).toEqual(
      expect.objectContaining({
        processed: 1,
        emailsSent: 1,
        inAppCreated: 1,
      }),
    );
  });
});

describe("member invitations without email", () => {
  async function importInviteHarness(memberInviteEmailEnabled: boolean) {
    vi.resetModules();
    vi.doMock("next/cache", () => ({
      revalidatePath: vi.fn(),
      updateTag: vi.fn(),
    }));
    vi.doMock("next/navigation", () => ({ redirect: vi.fn() }));
    vi.doMock("next/headers", () => ({
      cookies: vi.fn(async () => ({ set: vi.fn() })),
    }));
    vi.doMock("@/lib/db/client", () => ({ db: {} }));
    vi.doMock("@/lib/db/business-access", () => ({
      getOwnerBusinessActionContext: vi.fn(async () => ({
        ok: true as const,
        user: { id: "user_123", name: "Morgan Lee" },
        businessContext: {
          business: {
            id: "business_123",
            name: "BrightSide Print Studio",
            slug: "brightside-print-studio",
            plan: "free",
          },
        },
      })),
    }));
    vi.doMock("@/lib/auth/session", () => ({
      requireSession: vi.fn(),
    }));
    const createBusinessMemberInvite = vi.fn(async () => ({
      inviteId: "invite_123",
    }));
    vi.doMock("@/features/business-members/mutations", () => ({
      acceptBusinessMemberInvite: vi.fn(),
      cancelBusinessMemberInvite: vi.fn(),
      createBusinessMemberInvite,
      removeBusinessMember: vi.fn(),
      updateBusinessMemberRole: vi.fn(),
    }));
    const sendBusinessMemberInviteEmail = vi.fn(async () => true);
    vi.doMock("@/lib/resend/client", () => ({
      sendBusinessMemberInviteEmail,
    }));
    vi.doMock("@/lib/env", () => ({
      env: { BETTER_AUTH_URL: "http://127.0.0.1:3000" },
      isMemberInviteEmailEnabled: memberInviteEmailEnabled,
    }));
    vi.doMock("@/lib/plans/usage-limits", () => ({
      getUsageLimit: () => null,
    }));
    vi.doMock("@/lib/plans/usage", () => ({
      getBusinessMemberCount: vi.fn(),
    }));

    const mod = await import("@/features/business-members/actions");

    return { ...mod, createBusinessMemberInvite, sendBusinessMemberInviteEmail };
  }

  function inviteFormData() {
    const formData = new FormData();
    formData.set("email", "teammate@example.com");
    formData.set("role", "staff");
    return formData;
  }

  it("creates the invite and returns a link without sending email when disabled", async () => {
    const harness = await importInviteHarness(false);

    const result = await harness.createBusinessMemberInviteAction(
      {},
      inviteFormData(),
    );

    expect(harness.createBusinessMemberInvite).toHaveBeenCalledTimes(1);
    expect(result.inviteLink).toContain("/invite/");
    expect(harness.sendBusinessMemberInviteEmail).not.toHaveBeenCalled();
    expect(result.success).toMatch(/copy/i);
  });

  it("sends the invite email when enabled", async () => {
    const harness = await importInviteHarness(true);

    const result = await harness.createBusinessMemberInviteAction(
      {},
      inviteFormData(),
    );

    expect(harness.createBusinessMemberInvite).toHaveBeenCalledTimes(1);
    expect(result.inviteLink).toContain("/invite/");
    expect(harness.sendBusinessMemberInviteEmail).toHaveBeenCalledTimes(1);
    expect(result.success).toBe("Invite sent.");
  });
});
