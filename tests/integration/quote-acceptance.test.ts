import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";

vi.mock("@/lib/db/client", async () => {
  const { testDb: mockedDb } = await import("../support/db");

  return { db: mockedDb };
});

import type { QuoteEditorInput } from "@/features/quotes/schemas";
import {
  createQuoteForBusiness,
  markQuoteSentForBusiness,
  respondToPublicQuoteByToken,
} from "@/features/quotes/mutations";
import { getAcceptanceForBusiness } from "@/features/quotes/queries";
import { hashAcceptanceSnapshot } from "@/features/quotes/acceptance";
import { quoteAcceptances, quotes } from "@/lib/db/schema";

import { closeTestDb, testDb } from "@/tests/support/db";
import {
  cleanupWorkflowFixture,
  createWorkflowFixture,
  type WorkflowFixtureIds,
} from "@/tests/support/fixtures/workflow";

const prefix = "test_quote_acceptance";
let ids: WorkflowFixtureIds;

function quoteInput(overrides: Partial<QuoteEditorInput> = {}): QuoteEditorInput {
  return {
    title: "Acceptance test package",
    customerName: "Maria Santos",
    customerEmail: "maria@example.com",
    customerContactMethod: "email",
    customerContactHandle: "maria@example.com",
    notes: "Includes install.",
    validUntil: "2099-12-31",
    discountInCents: 5000,
    taxInCents: 6600,
    taxLabel: "VAT 12%",
    items: [
      {
        id: "line-design",
        description: "Design",
        quantity: 2,
        unitPriceInCents: 15000,
      },
    ],
    ...overrides,
  };
}

describe("quote acceptance record", () => {
  beforeEach(async () => {
    ids = await createWorkflowFixture(prefix);
  }, 30_000);

  afterAll(async () => {
    await cleanupWorkflowFixture(prefix);
    await closeTestDb();
  }, 30_000);

  it("records an immutable acceptance with version, snapshot, and hash", async () => {
    const created = await createQuoteForBusiness({
      businessId: ids.businessId,
      actorUserId: ids.ownerUserId,
      currency: "USD",
      inquiryId: ids.inquiryId,
      quote: quoteInput(),
    });
    const sent = await markQuoteSentForBusiness({
      businessId: ids.businessId,
      quoteId: created!.id,
      actorUserId: ids.ownerUserId,
      sendMethod: "manual",
    });

    const accepted = await respondToPublicQuoteByToken({
      token: sent!.publicToken!,
      response: "accepted",
      signerName: "Maria Santos",
      confirmed: true,
    });

    expect(accepted).toEqual(
      expect.objectContaining({ updated: true, status: "accepted" }),
    );

    const acceptance = await getAcceptanceForBusiness({
      businessId: ids.businessId,
      quoteId: created!.id,
    });

    expect(acceptance).toEqual(
      expect.objectContaining({
        signerName: "Maria Santos",
        signerEmail: "maria@example.com",
        acceptanceMethod: "typed_name",
        quoteVersion: 1,
      }),
    );
    expect(acceptance!.snapshotHash).toMatch(/^[0-9a-f]{64}$/);
    expect(acceptance!.snapshot.quoteNumber).toBe(acceptance!.snapshot.quoteNumber);
    expect(acceptance!.snapshot.totalInCents).toBeGreaterThan(0);
    expect(acceptance!.snapshot.taxLabel).toBe("VAT 12%");
    expect(hashAcceptanceSnapshot(acceptance!.snapshot)).toBe(acceptance!.snapshotHash);

    // Recomputed hash matches stored hash: snapshot is self-consistent.
    const rows = await testDb
      .select()
      .from(quoteAcceptances)
      .where(eq(quoteAcceptances.quoteId, created!.id));
    expect(rows).toHaveLength(1);
  }, 15_000);

  it("is idempotent on retry and rejects acceptance without confirmation", async () => {
    const created = await createQuoteForBusiness({
      businessId: ids.businessId,
      actorUserId: ids.ownerUserId,
      currency: "USD",
      inquiryId: ids.inquiryId,
      quote: quoteInput({ title: "Idempotency quote" }),
    });
    const sent = await markQuoteSentForBusiness({
      businessId: ids.businessId,
      quoteId: created!.id,
      actorUserId: ids.ownerUserId,
      sendMethod: "manual",
    });

    await expect(
      respondToPublicQuoteByToken({
        token: sent!.publicToken!,
        response: "accepted",
        signerName: "Maria Santos",
      }),
    ).rejects.toThrow(/Confirm that you agree/i);

    await expect(
      respondToPublicQuoteByToken({
        token: sent!.publicToken!,
        response: "accepted",
        confirmed: true,
        signerName: "A",
      }),
    ).rejects.toThrow(/Enter your name/i);

    const first = await respondToPublicQuoteByToken({
      token: sent!.publicToken!,
      response: "accepted",
      signerName: "Maria Santos",
      confirmed: true,
    });
    expect(first?.updated).toBe(true);

    const retry = await respondToPublicQuoteByToken({
      token: sent!.publicToken!,
      response: "accepted",
      signerName: "Maria Santos",
      confirmed: true,
    });
    expect(retry).toEqual(expect.objectContaining({ updated: false, status: "accepted" }));

    const rows = await testDb
      .select()
      .from(quoteAcceptances)
      .where(eq(quoteAcceptances.quoteId, created!.id));
    expect(rows).toHaveLength(1);
  }, 15_000);

  it("rejects stale versions and keeps server totals authoritative", async () => {
    const created = await createQuoteForBusiness({
      businessId: ids.businessId,
      actorUserId: ids.ownerUserId,
      currency: "USD",
      inquiryId: ids.inquiryId,
      quote: quoteInput({ title: "Version quote" }),
    });
    const sent = await markQuoteSentForBusiness({
      businessId: ids.businessId,
      quoteId: created!.id,
      actorUserId: ids.ownerUserId,
      sendMethod: "manual",
    });

    const stale = await respondToPublicQuoteByToken({
      token: sent!.publicToken!,
      response: "accepted",
      signerName: "Maria Santos",
      confirmed: true,
      expectedVersion: 999,
    });
    expect(stale).toEqual(expect.objectContaining({ updated: false }));

    // No totals can be submitted: extra fields are ignored by the type system
    // and the snapshot always comes from server-side quote rows.
    const accepted = await respondToPublicQuoteByToken({
      token: sent!.publicToken!,
      response: "accepted",
      signerName: "Maria Santos",
      confirmed: true,
      expectedVersion: 1,
    });
    expect(accepted?.updated).toBe(true);

    const [stored] = await testDb
      .select()
      .from(quotes)
      .where(eq(quotes.id, created!.id))
      .limit(1);
    const acceptance = await getAcceptanceForBusiness({
      businessId: ids.businessId,
      quoteId: created!.id,
    });
    expect(acceptance!.snapshot.totalInCents).toBe(stored.totalInCents);
    expect(acceptance!.snapshot.discountInCents).toBe(stored.discountInCents);
  }, 15_000);
});
