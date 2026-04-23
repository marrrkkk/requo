import "server-only";

import { eq, or } from "drizzle-orm";

import { createQuotePublicToken } from "@/features/quotes/utils";
import { quotes } from "@/lib/db/schema";
import { hashOpaqueToken } from "@/lib/security/tokens";

type StoredQuotePublicTokenFields = {
  publicToken: string | null;
};

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
