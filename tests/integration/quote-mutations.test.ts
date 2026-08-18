import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { eq, and } from "drizzle-orm";

vi.mock("@/lib/db/client", async () => {
  const { testDb: mockedDb } = await import("../support/db");

  return { db: mockedDb };
});

import type { QuoteEditorInput } from "@/features/quotes/schemas";
import {
  acknowledgeQuoteUncertaintyForBusiness,
  createQuoteForBusiness,
  markQuoteSentForBusiness,
  respondToPublicQuoteByToken,
  updateQuoteForBusiness,
} from "@/features/quotes/mutations";
import { activityLogs, inquiries, quoteItems, quotes } from "@/lib/db/schema";

import { closeTestDb, testDb } from "@/tests/support/db";
import {
  cleanupWorkflowFixture,
  createWorkflowFixture,
  getInquiryStatus,
  type WorkflowFixtureIds,
} from "@/tests/support/fixtures/workflow";

const prefix = "test_quote_workflow";
let ids: WorkflowFixtureIds;

function quoteInput(overrides: Partial<QuoteEditorInput> = {}): QuoteEditorInput {
  return {
    title: "Storefront graphics package",
    customerName: "Taylor Nguyen",
    customerEmail: "taylor@example.com",
    customerContactMethod: "email",
    customerContactHandle: "taylor@example.com",
    notes: "Includes design, production, and installation.",
    validUntil: "2099-12-31",
    discountInCents: 5000,
    taxInCents: 0,
    items: [
      {
        id: "line-design",
        description: "Design and proofing",
        quantity: 2,
        unitPriceInCents: 15000,
      },
      {
        id: "line-install",
        description: "Installation",
        quantity: 1,
        unitPriceInCents: 30000,
      },
    ],
    ...overrides,
  };
}

async function getStoredQuote(quoteId: string) {
  const [quote] = await testDb
    .select()
    .from(quotes)
    .where(eq(quotes.id, quoteId))
    .limit(1);

  return quote;
}

describe("features/quotes/mutations workflow", () => {
  beforeEach(async () => {
    ids = await createWorkflowFixture(prefix);
  }, 30_000);

  afterAll(async () => {
    await cleanupWorkflowFixture(prefix);
    await closeTestDb();
  }, 30_000);

  it("creates draft quotes with calculated totals and blocks cross-business inquiry links", async () => {
    const created = await createQuoteForBusiness({
      businessId: ids.businessId,
      actorUserId: ids.ownerUserId,
      currency: "USD",
      inquiryId: ids.inquiryId,
      quote: quoteInput(),
    });

    expect(created?.id).toMatch(/^qt_/);

    const storedQuote = await getStoredQuote(created!.id);
    const storedItems = await testDb
      .select()
      .from(quoteItems)
      .where(eq(quoteItems.quoteId, created!.id));

    expect(storedQuote).toEqual(
      expect.objectContaining({
        businessId: ids.businessId,
        inquiryId: ids.inquiryId,
        status: "draft",
        quoteNumber: "Q-0001",
        subtotalInCents: 60000,
        discountInCents: 5000,
        totalInCents: 55000,
        publicToken: expect.any(String),
        publicTokenHash: expect.any(String),
      }),
    );
    expect(storedItems).toHaveLength(2);
    expect(storedItems.map((item) => item.lineTotalInCents)).toEqual([
      30000,
      30000,
    ]);

    const invalidLinkedInquiry = await createQuoteForBusiness({
      businessId: ids.businessId,
      actorUserId: ids.ownerUserId,
      currency: "USD",
      inquiryId: ids.otherInquiryId,
      quote: quoteInput({ title: "Wrong inquiry quote" }),
    });

    expect(invalidLinkedInquiry).toBeNull();
  }, 15_000);

  it("marks draft quotes sent once and advances active linked inquiries to quoted", async () => {
    const created = await createQuoteForBusiness({
      businessId: ids.businessId,
      actorUserId: ids.ownerUserId,
      currency: "USD",
      inquiryId: ids.waitingInquiryId,
      quote: quoteInput({ title: "Vehicle wrap quote" }),
    });

    const sent = await markQuoteSentForBusiness({
      businessId: ids.businessId,
      quoteId: created!.id,
      actorUserId: ids.ownerUserId,
      sendMethod: "manual",
    });

    expect(sent).toEqual(
      expect.objectContaining({
        changed: true,
        status: "sent",
        quoteNumber: "Q-0001",
        inquiryId: ids.waitingInquiryId,
        publicToken: expect.any(String),
      }),
    );
    expect(await getInquiryStatus(ids.waitingInquiryId)).toBe("quoted");

    const repeatedSend = await markQuoteSentForBusiness({
      businessId: ids.businessId,
      quoteId: created!.id,
      actorUserId: ids.ownerUserId,
      sendMethod: "manual",
    });

    expect(repeatedSend).toEqual(
      expect.objectContaining({
        changed: false,
        status: "sent",
      }),
    );

    const wrongBusinessSend = await markQuoteSentForBusiness({
      quoteId: created!.id,
      businessId: ids.otherBusinessId,
      actorUserId: ids.outsiderUserId,
      sendMethod: "manual",
    });

    expect(wrongBusinessSend).toBeNull();
  }, 15_000);

  it("accepts only sent public quotes and moves the linked inquiry to won", async () => {
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
      sendMethod: "requo",
    });

    const accepted = await respondToPublicQuoteByToken({
      token: sent!.publicToken!,
      response: "accepted",
      message: "Approved. Please schedule production.",
    });

    expect(accepted).toEqual(
      expect.objectContaining({
        updated: true,
        status: "accepted",
        businessId: ids.businessId,
        inquiryId: ids.inquiryId,
        quoteId: created!.id,
        customerResponseMessage: "Approved. Please schedule production.",
      }),
    );
    expect(await getInquiryStatus(ids.inquiryId)).toBe("won");

    const storedQuote = await getStoredQuote(created!.id);

    expect(storedQuote.status).toBe("accepted");
    expect(storedQuote.acceptedAt).toBeInstanceOf(Date);
    expect(storedQuote.customerRespondedAt).toBeInstanceOf(Date);
    expect(storedQuote.customerResponseMessage).toBe(
      "Approved. Please schedule production.",
    );

    const repeatedResponse = await respondToPublicQuoteByToken({
      token: sent!.publicToken!,
      response: "rejected",
      message: "Changed my mind.",
    });

    expect(repeatedResponse).toEqual(
      expect.objectContaining({
        updated: false,
        status: "accepted",
      }),
    );
  }, 15_000);

  it("persists grounded pricing provenance and downgrades owner-edited items", async () => {
    const created = await createQuoteForBusiness({
      businessId: ids.businessId,
      actorUserId: ids.ownerUserId,
      currency: "USD",
      quote: quoteInput({
        title: "Provenance quote",
        aiReadiness: "needs_confirmation",
        aiGenerationId: "gen_abc123",
        aiMissingInfo: [
          { label: "Location", question: "Where will the work happen?" },
          { label: "Timeline", question: "When do you need it?", critical: true },
        ],
        items: [
          {
            id: "line-verified",
            description: "Verified item",
            quantity: 1,
            unitPriceInCents: 10000,
            aiPricingStatus: "verified",
            aiPricingLibraryEntryId: "entry_1",
            aiPricingLibraryItemId: "item_1",
            aiEvidence: {
              entryId: "entry_1",
              itemId: "item_1",
              sourceLabel: "Design work",
              matchType: "exact",
              reason: "Exact match in pricing library.",
            },
          },
          {
            id: "line-suggested",
            description: "Suggested item",
            quantity: 1,
            unitPriceInCents: 9000,
            aiPricingStatus: "suggested",
            aiPricingLibraryEntryId: "entry_2",
            aiPricingLibraryItemId: "item_2",
            aiEvidence: {
              entryId: "entry_2",
              itemId: "item_2",
              sourceLabel: "Design work",
              matchType: "suggested",
              reason: "Close match in pricing library.",
            },
          },
        ],
      }),
    });

    expect(created).not.toBeNull();

    const storedQuote = await getStoredQuote(created!.id);
    expect(storedQuote.aiReadiness).toBe("needs_confirmation");
    expect(storedQuote.aiGenerationId).toBe("gen_abc123");
    expect(storedQuote.aiMissingInfo).toEqual([
      { label: "Location", question: "Where will the work happen?", critical: false },
      { label: "Timeline", question: "When do you need it?", critical: true },
    ]);

    const storedItems = await testDb
      .select()
      .from(quoteItems)
      .where(eq(quoteItems.quoteId, created!.id))
      .orderBy(quoteItems.position);

    expect(storedItems[0]).toEqual(
      expect.objectContaining({
        aiPricingStatus: "verified",
        aiPricingLibraryEntryId: "entry_1",
        aiPricingLibraryItemId: "item_1",
        aiEvidence: expect.objectContaining({
          entryId: "entry_1",
          matchType: "exact",
        }),
      }),
    );
    expect(storedItems[1]).toEqual(
      expect.objectContaining({
        aiPricingStatus: "suggested",
        aiPricingLibraryEntryId: "entry_2",
      }),
    );

    // Owner edits the suggested item (editor marks it owner_brief) and saves:
    // the server must downgrade it to owner_set and clear its library refs.
    const updated = await updateQuoteForBusiness({
      businessId: ids.businessId,
      quoteId: created!.id,
      actorUserId: ids.ownerUserId,
      quote: quoteInput({
        title: "Provenance quote",
        aiReadiness: "needs_confirmation",
        aiGenerationId: "gen_abc123",
        items: [
          {
            id: "line-verified",
            description: "Verified item",
            quantity: 1,
            unitPriceInCents: 10000,
            aiPricingStatus: "verified",
            aiPricingLibraryEntryId: "entry_1",
            aiPricingLibraryItemId: "item_1",
            aiEvidence: {
              entryId: "entry_1",
              itemId: "item_1",
              sourceLabel: "Design work",
              matchType: "exact",
              reason: "Exact match in pricing library.",
            },
          },
          {
            id: "line-suggested",
            description: "Suggested item (owner price)",
            quantity: 1,
            unitPriceInCents: 12000,
            aiPricingStatus: "suggested",
            aiPricingLibraryEntryId: "entry_2",
            aiPricingLibraryItemId: "item_2",
            aiEvidence: {
              entryId: "entry_2",
              itemId: "item_2",
              sourceLabel: "Design work",
              matchType: "suggested",
              reason: "Close match in pricing library.",
            },
            aiReview: {
              name: "Suggested item",
              pricingSource: "owner_brief",
              pricingSourceLabel: "Owner-set price",
              confidence: "high",
              reviewStatus: "matched",
              reason: "Owner set a custom price.",
            },
          },
        ],
      }),
    });

    expect(updated?.updated).toBe(true);

    const afterUpdateItems = await testDb
      .select()
      .from(quoteItems)
      .where(eq(quoteItems.quoteId, created!.id))
      .orderBy(quoteItems.position);

    expect(afterUpdateItems[1]).toEqual(
      expect.objectContaining({
        description: "Suggested item (owner price)",
        aiPricingStatus: "owner_set",
        aiPricingLibraryEntryId: null,
        aiPricingLibraryItemId: null,
        aiEvidence: null,
      }),
    );
    expect(afterUpdateItems[0]).toEqual(
      expect.objectContaining({
        aiPricingStatus: "verified",
        aiPricingLibraryEntryId: "entry_1",
      }),
    );
  }, 15_000);

  it("records the owner's pricing acknowledgement once for needs-confirmation quotes", async () => {
    const created = await createQuoteForBusiness({
      businessId: ids.businessId,
      actorUserId: ids.ownerUserId,
      currency: "USD",
      quote: quoteInput({
        title: "Ack gate quote",
        aiReadiness: "needs_confirmation",
      }),
    });

    expect(created).not.toBeNull();
    expect((await getStoredQuote(created!.id)).aiAcknowledgedAt).toBeNull();

    const firstAck = await acknowledgeQuoteUncertaintyForBusiness({
      businessId: ids.businessId,
      quoteId: created!.id,
      actorUserId: ids.ownerUserId,
    });

    expect(firstAck).toEqual(
      expect.objectContaining({ updated: true, locked: false }),
    );

    const storedQuote = await getStoredQuote(created!.id);
    expect(storedQuote.aiAcknowledgedAt).toBeInstanceOf(Date);
    expect(storedQuote.aiAcknowledgedBy).toBe(ids.ownerUserId);

    const activity = await testDb
      .select()
      .from(activityLogs)
      .where(
        and(
          eq(activityLogs.quoteId, created!.id),
          eq(activityLogs.type, "quote.ai_pricing_acknowledged"),
        ),
      );

    expect(activity).toHaveLength(1);

    // Idempotent: a second acknowledgement is a no-op.
    const secondAck = await acknowledgeQuoteUncertaintyForBusiness({
      businessId: ids.businessId,
      quoteId: created!.id,
      actorUserId: ids.ownerUserId,
    });

    expect(secondAck).toEqual(
      expect.objectContaining({ updated: false, locked: false }),
    );

    // Sent quotes can't be acknowledged.
    await markQuoteSentForBusiness({
      businessId: ids.businessId,
      quoteId: created!.id,
      actorUserId: ids.ownerUserId,
      sendMethod: "manual",
    });

    const sentAck = await acknowledgeQuoteUncertaintyForBusiness({
      businessId: ids.businessId,
      quoteId: created!.id,
      actorUserId: ids.ownerUserId,
    });

    expect(sentAck).toEqual(
      expect.objectContaining({ updated: false, locked: true }),
    );
  }, 15_000);
});
