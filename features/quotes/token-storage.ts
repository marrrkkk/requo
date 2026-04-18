import "server-only";

import { eq, or } from "drizzle-orm";

import { createQuotePublicToken } from "@/features/quotes/utils";
import { quotes } from "@/lib/db/schema";
import { decryptValue, encryptValue } from "@/lib/security/encryption";
import { hashOpaqueToken } from "@/lib/security/tokens";

type StoredQuotePublicTokenFields = {
  publicToken: string | null;
  publicTokenEncrypted: string | null;
};

export function createStoredQuotePublicToken(rawToken = createQuotePublicToken()) {
  return {
    publicTokenEncrypted: encryptValue(rawToken),
    publicTokenHash: hashOpaqueToken(rawToken),
    rawToken,
  };
}

export function resolveStoredQuotePublicToken(
  value: StoredQuotePublicTokenFields,
) {
  if (value.publicTokenEncrypted) {
    return decryptValue(value.publicTokenEncrypted);
  }

  if (value.publicToken) {
    return value.publicToken;
  }

  throw new Error("The quote is missing a recoverable public token.");
}

export function getQuotePublicTokenLookupCondition(token: string) {
  return or(
    eq(quotes.publicTokenHash, hashOpaqueToken(token)),
    eq(quotes.publicToken, token),
  )!;
}
