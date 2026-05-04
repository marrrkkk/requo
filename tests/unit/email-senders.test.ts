import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

async function importSendersWithEnv(
  envOverrides: Partial<Record<string, string | undefined>>,
) {
  vi.resetModules();
  vi.doMock("@/lib/env", () => ({
    env: {
      EMAIL_DOMAIN: "test.requo.app",
      EMAIL_FROM_DEFAULT: undefined,
      EMAIL_FROM_NOTIFICATIONS: undefined,
      EMAIL_FROM_SYSTEM: undefined,
      EMAIL_FROM_QUOTES: undefined,
      EMAIL_FROM_SUPPORT: undefined,
      RESEND_FROM_EMAIL: undefined,
      RESEND_REPLY_TO_EMAIL: undefined,
      ...envOverrides,
    },
  }));

  return import("@/lib/email/senders");
}

afterEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

describe("email sender selection", () => {
  it("selects branded senders by email type", async () => {
    const { getEmailSender } = await importSendersWithEnv({
      EMAIL_FROM_DEFAULT: "Requo Notifications <notifications@test.requo.app>",
      EMAIL_FROM_NOTIFICATIONS:
        "Requo Notifications <notifications@test.requo.app>",
      EMAIL_FROM_SYSTEM: "Requo System <system@test.requo.app>",
      EMAIL_FROM_QUOTES: "Requo Quotes <quotes@test.requo.app>",
      EMAIL_FROM_SUPPORT: "Requo Support <support@test.requo.app>",
    });

    expect(getEmailSender("quote")).toBe(
      "Requo Quotes <quotes@test.requo.app>",
    );
    expect(getEmailSender("notification")).toBe(
      "Requo Notifications <notifications@test.requo.app>",
    );
    expect(getEmailSender("auth")).toBe(
      "Requo System <system@test.requo.app>",
    );
    expect(getEmailSender("inquiry")).toBe(
      "Requo Support <support@test.requo.app>",
    );
  });

  it("falls back to the default sender when specialized senders are absent", async () => {
    const { getEmailSender } = await importSendersWithEnv({
      EMAIL_FROM_DEFAULT: "Requo Notifications <notifications@test.requo.app>",
    });

    expect(getEmailSender("quote")).toBe(
      "Requo Notifications <notifications@test.requo.app>",
    );
    expect(getEmailSender("system")).toBe(
      "Requo Notifications <notifications@test.requo.app>",
    );
  });

  it("builds a Requo notifications sender from EMAIL_DOMAIN", async () => {
    const { getEmailSender } = await importSendersWithEnv({});

    expect(getEmailSender("notification")).toBe(
      "Requo Notifications <notifications@test.requo.app>",
    );
  });

  it("rejects consumer mailbox senders", async () => {
    const { getEmailSenderConfigurationError } = await importSendersWithEnv({
      EMAIL_FROM_DEFAULT: "Requo <requo@gmail.com>",
    });

    expect(getEmailSenderConfigurationError("notification")).toContain(
      "cannot use gmail.com",
    );
  });
});
