import "server-only";

import { Resend } from "resend";

import { wrapEmailProviderError } from "@/lib/email/errors";
import type { EmailProvider } from "@/lib/email/types";
import { env, isResendConfigured } from "@/lib/env";

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

function toResendTags(tags?: Record<string, string>) {
  if (!tags) {
    return undefined;
  }

  return Object.entries(tags)
    .filter(([name, value]) => name.trim() && value.trim())
    .map(([name, value]) => ({ name, value }));
}

export const resendEmailProvider: EmailProvider = {
  name: "resend",
  isConfigured: () => Boolean(resend && isResendConfigured),
  async send(input) {
    if (!resend) {
      throw wrapEmailProviderError(
        "resend",
        Object.assign(new Error("Resend API key is not configured."), {
          statusCode: 401,
          code: "missing_resend_api_key",
        }),
      );
    }

    const { data, error } = await resend.emails.send(
      {
        from: input.from,
        to: input.to,
        cc: input.cc,
        bcc: input.bcc,
        replyTo: input.replyTo ? [input.replyTo] : undefined,
        subject: input.subject,
        html: input.html,
        text: input.text,
        tags: toResendTags(input.tags),
      },
      {
        idempotencyKey: input.idempotencyKey,
      },
    );

    if (error) {
      throw wrapEmailProviderError("resend", error);
    }

    if (!data?.id) {
      throw wrapEmailProviderError(
        "resend",
        Object.assign(new Error("Resend accepted the request without an id."), {
          statusCode: 502,
          code: "missing_provider_message_id",
        }),
      );
    }

    return {
      provider: "resend",
      providerMessageId: data.id,
      status: "queued",
      raw: data,
    };
  },
};
