import "server-only";

import { wrapEmailProviderError } from "@/lib/email/errors";
import type { EmailProvider } from "@/lib/email/types";
import { env, isBrevoConfigured } from "@/lib/env";
import {
  createHttpProviderError,
  EMAIL_PROVIDER_TIMEOUT_MS,
  readProviderError,
  toProviderAddress,
  toProviderAddresses,
} from "./utils";

type BrevoSendResponse = {
  messageId?: string;
};

export const brevoEmailProvider: EmailProvider = {
  name: "brevo",
  isConfigured: () => Boolean(env.BREVO_API_KEY && isBrevoConfigured),
  async send(input) {
    if (!env.BREVO_API_KEY) {
      throw wrapEmailProviderError(
        "brevo",
        Object.assign(new Error("Brevo API key is not configured."), {
          statusCode: 401,
          code: "missing_brevo_api_key",
        }),
      );
    }

    const from = toProviderAddress(input.from);
    const replyTo = input.replyTo ? toProviderAddress(input.replyTo) : null;
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        accept: "application/json",
        "api-key": env.BREVO_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sender: from,
        to: toProviderAddresses(input.to),
        cc: input.cc ? toProviderAddresses(input.cc) : undefined,
        bcc: input.bcc ? toProviderAddresses(input.bcc) : undefined,
        replyTo: replyTo ?? undefined,
        subject: input.subject,
        htmlContent: input.html,
        textContent: input.text,
        params: input.metadata,
        tags: input.tags ? Object.values(input.tags).filter(Boolean) : undefined,
        headers: {
          "X-Requo-Idempotency-Key": input.idempotencyKey,
        },
      }),
      signal: AbortSignal.timeout(EMAIL_PROVIDER_TIMEOUT_MS),
    });

    if (!response.ok) {
      throw wrapEmailProviderError(
        "brevo",
        createHttpProviderError(
          await readProviderError(response),
          response.status,
        ),
      );
    }

    const data = (await response.json()) as BrevoSendResponse;

    if (!data.messageId) {
      throw wrapEmailProviderError(
        "brevo",
        Object.assign(new Error("Brevo accepted the request without an id."), {
          statusCode: 502,
          code: "missing_provider_message_id",
        }),
      );
    }

    return {
      provider: "brevo",
      providerMessageId: data.messageId,
      status: "queued",
      raw: data,
    };
  },
};
