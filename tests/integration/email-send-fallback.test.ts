import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { asc, eq } from "drizzle-orm";

import { closeTestDb, testDb } from "./db";

vi.mock("@/lib/db/client", () => ({ db: testDb }));

import { sendEmailWithFallback } from "@/lib/email/send-email";
import type { EmailProvider } from "@/lib/email/types";
import { emailAttempts, emailOutbox } from "@/lib/db/schema";

const touchedKeys = new Set<string>();

function provider(
  name: EmailProvider["name"],
  implementation: EmailProvider["send"],
): EmailProvider {
  return {
    name,
    isConfigured: () => true,
    send: vi.fn(implementation),
  };
}

function successProvider(name: EmailProvider["name"], messageId: string) {
  return provider(name, async () => ({
    provider: name,
    providerMessageId: messageId,
    status: "queued",
  }));
}

function failureProvider(
  name: EmailProvider["name"],
  statusCode: number,
  message: string,
) {
  return provider(name, async () => {
    throw Object.assign(new Error(message), {
      statusCode,
      code: `http_${statusCode}`,
    });
  });
}

function input(idempotencyKey: string) {
  touchedKeys.add(idempotencyKey);

  return {
    to: "customer@example.com",
    subject: "Test email",
    html: "<p>Hello from Requo</p>",
    text: "Hello from Requo",
    idempotencyKey,
    emailType: "notification" as const,
    metadata: {
      test: true,
    },
  };
}

async function readOutbox(idempotencyKey: string) {
  const [row] = await testDb
    .select()
    .from(emailOutbox)
    .where(eq(emailOutbox.idempotencyKey, idempotencyKey))
    .limit(1);

  return row;
}

async function readAttempts(emailOutboxId: string) {
  return testDb
    .select()
    .from(emailAttempts)
    .where(eq(emailAttempts.emailOutboxId, emailOutboxId))
    .orderBy(asc(emailAttempts.createdAt));
}

afterEach(async () => {
  for (const key of touchedKeys) {
    await testDb
      .delete(emailOutbox)
      .where(eq(emailOutbox.idempotencyKey, key));
  }

  touchedKeys.clear();
  vi.clearAllMocks();
});

afterAll(async () => {
  await closeTestDb();
});

describe("sendEmailWithFallback", () => {
  it("sends only through Resend when Resend accepts the email", async () => {
    const resend = successProvider("resend", "resend_1");
    const mailtrap = successProvider("mailtrap", "mailtrap_1");
    const brevo = successProvider("brevo", "brevo_1");

    const result = await sendEmailWithFallback(input("email-test:resend-only"), {
      providers: [resend, mailtrap, brevo],
    });

    expect(result).toMatchObject({
      provider: "resend",
      providerMessageId: "resend_1",
    });
    expect(resend.send).toHaveBeenCalledTimes(1);
    expect(mailtrap.send).not.toHaveBeenCalled();
    expect(brevo.send).not.toHaveBeenCalled();
  });

  it("falls back to Mailtrap for a retryable Resend rate limit", async () => {
    const resend = failureProvider("resend", 429, "rate limit exceeded");
    const mailtrap = successProvider("mailtrap", "mailtrap_1");
    const brevo = successProvider("brevo", "brevo_1");

    const result = await sendEmailWithFallback(
      input("email-test:resend-rate-limit"),
      {
        providers: [resend, mailtrap, brevo],
      },
    );

    expect(result.provider).toBe("mailtrap");
    expect(resend.send).toHaveBeenCalledTimes(1);
    expect(mailtrap.send).toHaveBeenCalledTimes(1);
    expect(brevo.send).not.toHaveBeenCalled();
  });

  it("falls back to Brevo when Resend and Mailtrap fail retryably", async () => {
    const resend = failureProvider("resend", 503, "provider unavailable");
    const mailtrap = failureProvider("mailtrap", 500, "temporary outage");
    const brevo = successProvider("brevo", "brevo_1");

    const result = await sendEmailWithFallback(input("email-test:brevo"), {
      providers: [resend, mailtrap, brevo],
    });

    expect(result.provider).toBe("brevo");
    expect(resend.send).toHaveBeenCalledTimes(1);
    expect(mailtrap.send).toHaveBeenCalledTimes(1);
    expect(brevo.send).toHaveBeenCalledTimes(1);
  });

  it("does not fallback for non-retryable provider validation errors", async () => {
    const resend = failureProvider("resend", 422, "invalid recipient");
    const mailtrap = successProvider("mailtrap", "mailtrap_1");

    await expect(
      sendEmailWithFallback(input("email-test:non-retryable"), {
        providers: [resend, mailtrap],
      }),
    ).rejects.toMatchObject({
      code: "email_delivery_rejected",
    });

    expect(resend.send).toHaveBeenCalledTimes(1);
    expect(mailtrap.send).not.toHaveBeenCalled();
  });

  it("returns an existing sent result without sending a duplicate", async () => {
    const idempotencyKey = "email-test:idempotency";
    const resend = successProvider("resend", "resend_once");

    const first = await sendEmailWithFallback(input(idempotencyKey), {
      providers: [resend],
    });
    const second = await sendEmailWithFallback(input(idempotencyKey), {
      providers: [resend],
    });

    expect(first).toEqual(second);
    expect(resend.send).toHaveBeenCalledTimes(1);
  });

  it("records attempts and updates the outbox status", async () => {
    const idempotencyKey = "email-test:attempt-audit";
    const resend = failureProvider("resend", 429, "rate limit exceeded");
    const mailtrap = successProvider("mailtrap", "mailtrap_audit");

    await sendEmailWithFallback(input(idempotencyKey), {
      providers: [resend, mailtrap],
    });

    const outbox = await readOutbox(idempotencyKey);
    expect(outbox).toMatchObject({
      status: "sent",
      provider: "mailtrap",
      providerMessageId: "mailtrap_audit",
      attempts: 2,
    });

    const attempts = await readAttempts(outbox!.id);
    expect(attempts).toHaveLength(2);
    expect(attempts.map((attempt) => attempt.status)).toEqual([
      "failed",
      "success",
    ]);
    expect(attempts[0]?.retryable).toBe(true);
  });

  it("marks ambiguous timeout failures as unknown without fallback", async () => {
    const idempotencyKey = "email-test:unknown-timeout";
    const resend = provider("resend", async () => {
      throw Object.assign(new Error("operation was aborted by timeout"), {
        code: "AbortError",
      });
    });
    const mailtrap = successProvider("mailtrap", "mailtrap_should_not_send");

    await expect(
      sendEmailWithFallback(input(idempotencyKey), {
        providers: [resend, mailtrap],
      }),
    ).rejects.toMatchObject({
      code: "email_delivery_unknown",
    });

    const outbox = await readOutbox(idempotencyKey);
    expect(outbox?.status).toBe("unknown");
    expect(mailtrap.send).not.toHaveBeenCalled();
  });
});
