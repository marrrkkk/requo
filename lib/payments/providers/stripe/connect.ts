import "server-only";

import { stripeReadinessFromAccount, type ConnectionCapability } from "@/lib/payments/connection-status";
import { stripeRequest, type StripeFetch } from "@/lib/payments/providers/stripe/client";
import { asString } from "@/lib/payments/providers/stripe/types";

export type StripeConnectedAccount = {
  id: string;
  charges_enabled?: boolean;
  details_submitted?: boolean;
  requirements?: { currently_due?: string[] } | null;
};

/**
 * Current controller-based Express account creation (docs.stripe.com/connect/hosted-onboarding).
 * Dashboard type is immutable — Express is Requo's SaaS choice.
 */
export async function createConnectedAccount(input: {
  platformSecretKey: string;
  email?: string;
  fetchImpl?: StripeFetch;
}): Promise<{ accountId: string }> {
  const form: Record<string, string> = {
    "controller[fees][payer]": "application",
    "controller[losses][payments]": "application",
    "controller[stripe_dashboard][type]": "express",
  };
  if (input.email) form.email = input.email;
  const account = await stripeRequest<StripeConnectedAccount>({
    secretKey: input.platformSecretKey,
    method: "POST",
    path: "/v1/accounts",
    form,
    fetchImpl: input.fetchImpl,
  });
  if (!asString(account?.id)) throw new Error("Stripe did not return a connected account.");
  return { accountId: account.id };
}

export async function createAccountLink(input: {
  platformSecretKey: string;
  accountId: string;
  returnUrl: string;
  refreshUrl: string;
  fetchImpl?: StripeFetch;
}): Promise<{ url: string }> {
  const link = await stripeRequest<{ url?: string; expires_at?: number }>({
    secretKey: input.platformSecretKey,
    method: "POST",
    path: "/v1/account_links",
    form: {
      account: input.accountId,
      return_url: input.returnUrl,
      refresh_url: input.refreshUrl,
      type: "account_onboarding",
      "collection_options[fields]": "eventually_due",
    },
    fetchImpl: input.fetchImpl,
  });
  if (!asString(link?.url)) throw new Error("Stripe did not return an onboarding link.");
  return { url: link.url as string };
}

export async function retrieveConnectedAccount(input: {
  platformSecretKey: string;
  accountId: string;
  fetchImpl?: StripeFetch;
}): Promise<StripeConnectedAccount> {
  const account = await stripeRequest<StripeConnectedAccount>({
    secretKey: input.platformSecretKey,
    method: "GET",
    path: `/v1/accounts/${encodeURIComponent(input.accountId)}`,
    fetchImpl: input.fetchImpl,
  });
  if (!asString(account?.id)) throw new Error("Stripe connected account not found.");
  return account;
}

export function readinessFromAccount(account: StripeConnectedAccount): ConnectionCapability {
  return stripeReadinessFromAccount({
    charges_enabled: account.charges_enabled,
    details_submitted: account.details_submitted,
    requirements: account.requirements ?? null,
  });
}
