import "server-only";

import { eq, or } from "drizzle-orm";

import { createQuotePublicToken } from "@/features/quotes/utils";
import { quotes } from "@/lib/db/schema";
import { hashOpaqueToken } from "@/lib/security/tokens";

type StoredQuotePublicTokenFields = {
  publicToken: string | null;
};

/**
 * Creates a recoverable public-link token pair.
 *
 * Security tradeoff (SEC-018): `publicToken` is stored in plaintext alongside
 * `publicTokenHash` because owner flows (resend, copy-link, send-email) must
 * recover the original link after creation — the HMAC hash is one-way and
 * cannot regenerate it. This means database read access implies bearer-token
 * access for `sent` quotes. Mitigations: direct-Drizzle-only data plane, RLS
 * `deny_all` for PostgREST, no `publicToken` in list queries, token-gated
 * public reads only for non-draft quotes. Do not expose `publicToken` in
 * logs or list responses.
 */

export function createStoredQuotePublicToken(rawToken = createQuotePublicToken()) {
  return {
    publicToken: rawToken,
    publicTokenHash: hashOpaqueToken(rawToken),
    rawToken,
  };
}

export function resolveStoredQuotePublicToken(
  value: StoredQuotePublicTokenFields,
) {
  const resolvedToken = tryResolveStoredQuotePublicToken(value);

  if (resolvedToken) {
    return resolvedToken;
  }

  throw new Error("The quote is missing a recoverable public token.");
}

export function tryResolveStoredQuotePublicToken(
  value: StoredQuotePublicTokenFields,
) {
  return value.publicToken;
}

export function getQuotePublicTokenLookupCondition(token: string) {
  return or(
    eq(quotes.publicTokenHash, hashOpaqueToken(token)),
    eq(quotes.publicToken, token),
  )!;
}
