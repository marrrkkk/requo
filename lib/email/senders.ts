import "server-only";

import { z } from "zod";

import type { EmailType } from "@/lib/email/types";
import { env } from "@/lib/env";

const consumerMailboxProviderDomains = new Set([
  "gmail.com",
  "googlemail.com",
  "hotmail.com",
  "outlook.com",
  "live.com",
  "msn.com",
  "yahoo.com",
  "ymail.com",
  "rocketmail.com",
  "icloud.com",
  "me.com",
  "mac.com",
  "aol.com",
  "protonmail.com",
  "proton.me",
  "pm.me",
]);

const emailAddressSchema = z.email();

export type ParsedEmailAddress = {
  email: string;
  name?: string;
};

function trimDisplayName(value: string) {
  const trimmed = value.trim();

  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }

  return trimmed;
}

export function parseEmailAddress(value: string): ParsedEmailAddress | null {
  const trimmed = value.trim();
  const namedMatch = trimmed.match(/^(.+?)\s*<([^<>]+)>$/);

  if (namedMatch) {
    const name = trimDisplayName(namedMatch[1] ?? "");
    const email = (namedMatch[2] ?? "").trim().toLowerCase();

    if (!emailAddressSchema.safeParse(email).success) {
      return null;
    }

    return name ? { name, email } : { email };
  }

  const email = trimmed.toLowerCase();

  if (!emailAddressSchema.safeParse(email).success) {
    return null;
  }

  return { email };
}

export function getEmailAddressDomain(address: string) {
  const parsed = parseEmailAddress(address);

  if (!parsed) {
    return "";
  }

  const atIndex = parsed.email.lastIndexOf("@");

  return atIndex >= 0 ? parsed.email.slice(atIndex + 1).toLowerCase() : "";
}

export function formatEmailAddress(address: ParsedEmailAddress) {
  return address.name ? `${address.name} <${address.email}>` : address.email;
}

export function normalizeEmailAddress(value: string) {
  const parsed = parseEmailAddress(value);

  if (!parsed) {
    return null;
  }

  return parsed.email;
}

export function getEmailSender(type: EmailType = "notification") {
  const defaultSender =
    env.EMAIL_FROM_DEFAULT ??
    env.RESEND_FROM_EMAIL ??
    `Requo Notifications <notifications@${env.EMAIL_DOMAIN}>`;

  switch (type) {
    case "quote":
      return env.EMAIL_FROM_QUOTES ?? defaultSender;
    case "system":
    case "auth":
      return env.EMAIL_FROM_SYSTEM ?? defaultSender;
    case "support":
    case "inquiry":
      return env.EMAIL_FROM_SUPPORT ?? defaultSender;
    case "notification":
    default:
      return env.EMAIL_FROM_NOTIFICATIONS ?? defaultSender;
  }
}

export function getEmailSenderConfigurationError(
  type: EmailType = "notification",
  from = getEmailSender(type),
) {
  const parsed = parseEmailAddress(from);

  if (!parsed) {
    return "Email sender is not configured correctly. Use a plain email or Name <email@example.com> format.";
  }

  const domain = getEmailAddressDomain(parsed.email);

  if (!domain) {
    return "Email sender must use a verified sending domain.";
  }

  if (consumerMailboxProviderDomains.has(domain)) {
    return `Email sender cannot use ${domain}. Use an address on a domain verified with the configured email providers.`;
  }

  return null;
}

export function getDefaultReplyToEmail() {
  return env.RESEND_REPLY_TO_EMAIL;
}
