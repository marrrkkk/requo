import { describe, expect, it } from "vitest";

import {
  createQuotePublicToken,
  QUOTE_PUBLIC_TOKEN_LENGTH,
} from "@/features/quotes/utils";
import { quotePublicTokenSchema } from "@/features/quotes/schemas";

describe("createQuotePublicToken", () => {
  it("generates a compact token of the expected length", () => {
    expect(QUOTE_PUBLIC_TOKEN_LENGTH).toBe(20);
    expect(createQuotePublicToken()).toHaveLength(20);
  });

  it("uses only URL-safe characters accepted by the route schema", () => {
    for (let i = 0; i < 50; i++) {
      const token = createQuotePublicToken();
      expect(token).toMatch(/^[a-zA-Z0-9_-]+$/);
      expect(quotePublicTokenSchema.safeParse(token).success).toBe(true);
    }
  });

  it("generates unique tokens", () => {
    const tokens = new Set(
      Array.from({ length: 1000 }, () => createQuotePublicToken()),
    );
    expect(tokens.size).toBe(1000);
  });
});
