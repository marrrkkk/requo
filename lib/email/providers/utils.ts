import "server-only";

import {
  parseEmailAddress,
  type ParsedEmailAddress,
} from "@/lib/email/senders";

export const EMAIL_PROVIDER_TIMEOUT_MS = 15_000;

export function toProviderAddress(value: string): ParsedEmailAddress {
  const parsed = parseEmailAddress(value);

  if (!parsed) {
    throw Object.assign(new Error("Invalid email address."), {
      statusCode: 400,
      code: "invalid_email_address",
    });
  }

  return parsed;
}

export function toProviderAddresses(values: string[]) {
  return values.map(toProviderAddress);
}

export async function readProviderError(response: Response) {
  const text = await response.text();

  if (!text) {
    return response.statusText || "Email provider request failed.";
  }

  try {
    const parsed = JSON.parse(text) as unknown;

    if (typeof parsed === "object" && parsed !== null) {
      const record = parsed as Record<string, unknown>;

      if (typeof record.message === "string") {
        return record.message;
      }

      if (typeof record.error === "string") {
        return record.error;
      }

      if (Array.isArray(record.errors)) {
        return record.errors
          .map((error) =>
            typeof error === "string" ? error : JSON.stringify(error),
          )
          .join("; ");
      }
    }

    return JSON.stringify(parsed);
  } catch {
    return text;
  }
}

export function createHttpProviderError(
  message: string,
  statusCode: number,
  code?: string | null,
) {
  return Object.assign(new Error(message), {
    statusCode,
    code: code ?? `http_${statusCode}`,
  });
}
