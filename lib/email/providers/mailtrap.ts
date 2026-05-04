import "server-only";

import { wrapEmailProviderError } from "@/lib/email/errors";
import type { EmailProvider } from "@/lib/email/types";
import { env, isMailtrapConfigured } from "@/lib/env";
import {
  createHttpProviderError,
  EMAIL_PROVIDER_TIMEOUT_MS,
  readProviderError,
  toProviderAddress,
  toProviderAddresses,
} from "./utils";

type MailtrapSendResponse = {
  success?: boolean;
  message_ids?: string[];
  message_id?: string;
  id?: string;
};

function getMessageId(response: MailtrapSendResponse) {
  return response.message_ids?.[0] ?? response.message_id ?? response.id;
}

export const mailtrapEmailProvider: EmailProvider = {
  name: "mailtrap",
  isConfigured: () => Boolean(env.MAILTRAP_API_TOKEN && isMailtrapConfigured),
  async send(input) {
    if (!env.MAILTRAP_API_TOKEN) {
      throw wrapEmailProviderError(
        "mailtrap",
        Object.assign(new Error("Mailtrap API token is not configured."), {
          statusCode: 401,
          code: "missing_mailtrap_api_token",
        }),
      );
    }

    const from = toProviderAddress(input.from);
    const replyTo = input.replyTo ? toProviderAddress(input.replyTo) : null;
    const response = await fetch("https://send.api.mailtrap.io/api/send", {
      method: "POST",
      headers: {
        "Api-Token": env.MAILTRAP_API_TOKEN,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: toProviderAddresses(input.to),
        cc: input.cc ? toProviderAddresses(input.cc) : undefined,
        bcc: input.bcc ? toProviderAddresses(input.bcc) : undefined,
        reply_to: replyTo ?? undefined,
        subject: input.subject,
        html: input.html,
        text: input.text,
        custom_variables: input.metadata,
        headers: {
          "X-Requo-Idempotency-Key": input.idempotencyKey,
        },
      }),
      signal: AbortSignal.timeout(EMAIL_PROVIDER_TIMEOUT_MS),
    });

    if (!response.ok) {
      throw wrapEmailProviderError(
        "mailtrap",
        createHttpProviderError(
          await readProviderError(response),
          response.status,
        ),
      );
    }

    const data = (await response.json()) as MailtrapSendResponse;
    const providerMessageId = getMessageId(data);

    if (!providerMessageId) {
      throw wrapEmailProviderError(
        "mailtrap",
        Object.assign(
          new Error("Mailtrap accepted the request without an id."),
          {
            statusCode: 502,
            code: "missing_provider_message_id",
          },
        ),
      );
    }

    return {
      provider: "mailtrap",
      providerMessageId,
      status: "queued",
      raw: data,
    };
  },
};
