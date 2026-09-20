import { describe, expect, it } from "vitest";

import {
  QUOTE_ACCEPTANCE_TEXT,
  buildAcceptanceSnapshot,
  canonicalizeSnapshot,
  hashAcceptanceSnapshot,
  validateSignerName,
} from "@/features/quotes/acceptance";

function snapshotInput() {
  return {
    quoteNumber: "Q-0001",
    quoteVersion: 2,
    title: "Storefront package",
    businessName: "Acme Co",
    customerName: "Maria Santos",
    customerEmail: "maria@example.com",
    currency: "USD",
    notes: "Includes install.",
    terms: "Valid 14 days.",
    validUntil: "2026-10-04",
    subtotalInCents: 60000,
    discountInCents: 5000,
    taxInCents: 6600,
    taxLabel: "VAT 12%",
    totalInCents: 61600,
    items: [
      {
        description: "Install",
        quantity: 1,
        unitPriceInCents: 30000,
        lineTotalInCents: 30000,
        position: 1,
      },
      {
        description: "Design",
        quantity: 2,
        unitPriceInCents: 15000,
        lineTotalInCents: 30000,
        position: 0,
      },
    ],
  };
}

describe("quote acceptance", () => {
  it("validates signer names", () => {
    expect(validateSignerName("Maria Santos")).toBe("Maria Santos");
    expect(validateSignerName("  Maria   Santos  ")).toBe("Maria Santos");
    expect(validateSignerName("A")).toBeNull();
    expect(validateSignerName("")).toBeNull();
    expect(validateSignerName(undefined)).toBeNull();
    expect(validateSignerName("a".repeat(121))).toBeNull();
  });

  it("builds a snapshot sorted by position with acceptance text", () => {
    const snapshot = buildAcceptanceSnapshot(snapshotInput());
    expect(snapshot.items.map((item) => item.position)).toEqual([0, 1]);
    expect(snapshot.acceptanceText).toBe(QUOTE_ACCEPTANCE_TEXT);
    expect(snapshot.acceptanceTextVersion).toBe(1);
    expect(snapshot.taxLabel).toBe("VAT 12%");
  });

  it("canonicalizes independent of key order and hashes deterministically", () => {
    const a = buildAcceptanceSnapshot(snapshotInput());
    const b = buildAcceptanceSnapshot({
      ...snapshotInput(),
      items: [...snapshotInput().items].reverse(),
    });
    expect(canonicalizeSnapshot(a)).toBe(canonicalizeSnapshot(b));
    expect(hashAcceptanceSnapshot(a)).toBe(hashAcceptanceSnapshot(b));
    expect(hashAcceptanceSnapshot(a)).toMatch(/^[0-9a-f]{64}$/);
  });

  it("hash changes when totals change", () => {
    const a = buildAcceptanceSnapshot(snapshotInput());
    const tampered = buildAcceptanceSnapshot({
      ...snapshotInput(),
      totalInCents: 1,
    });
    expect(hashAcceptanceSnapshot(a)).not.toBe(hashAcceptanceSnapshot(tampered));
  });
});
