import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { eq, and } from "drizzle-orm";

vi.mock("@/lib/db/client", async () => {
  const { testDb: mockedDb } = await import("./db");

  return { db: mockedDb };
});

import type { QuoteEditorInput } from "@/features/quotes/schemas";
import {
  createQuoteForBusiness,
  markQuoteSentForBusiness,
  respondToPublicQuoteByToken,
  updateQuotePostAcceptanceStatusForBusiness,
} from "@/features/quotes/mutations";
import { activityLogs, inquiries, quoteItems, quotes } from "@/lib/db/schema";

import { closeTestDb, testDb } from "./db";
import {
  cleanupWorkflowFixture,
  createWorkflowFixture,
  getInquiryStatus,
  type WorkflowFixtureIds,
} from "./workflow-fixtures";

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
    validUntil: "2026-05-31",
    discountInCents: 5000,
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
      businessId: ids.otherBusinessId,
      quoteId: created!.id,
      actorUserId: ids.ownerUserId,
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

  it("updates post-acceptance status only after the customer accepts", async () => {
    const created = await createQuoteForBusiness({
      businessId: ids.businessId,
      actorUserId: ids.ownerUserId,
      currency: "USD",
      inquiryId: ids.inquiryId,
      quote: quoteInput(),
    });

    const lockedBeforeAcceptance =
      await updateQuotePostAcceptanceStatusForBusiness({
        businessId: ids.businessId,
        quoteId: created!.id,
        actorUserId: ids.ownerUserId,
        postAcceptanceStatus: "scheduled",
      });

    expect(lockedBeforeAcceptance).toEqual(
      expect.objectContaining({
        updated: false,
        locked: true,
        postAcceptanceStatus: "none",
      }),
    );

    const sent = await markQuoteSentForBusiness({
      businessId: ids.businessId,
      quoteId: created!.id,
      actorUserId: ids.ownerUserId,
      sendMethod: "requo",
    });
    await respondToPublicQuoteByToken({
      token: sent!.publicToken!,
      response: "accepted",
    });

    const scheduled = await updateQuotePostAcceptanceStatusForBusiness({
      businessId: ids.businessId,
      quoteId: created!.id,
      actorUserId: ids.ownerUserId,
      postAcceptanceStatus: "scheduled",
    });

    expect(scheduled).toEqual(
      expect.objectContaining({
        updated: true,
        locked: false,
        postAcceptanceStatus: "scheduled",
      }),
    );

    const [activity] = await testDb
      .select()
      .from(activityLogs)
      .where(
        and(
          eq(activityLogs.type, "quote.post_acceptance_updated"),
          eq(activityLogs.businessId, ids.businessId)
        )
      )
      .limit(1);

    expect(activity).toEqual(
      expect.objectContaining({
        businessId: ids.businessId,
        quoteId: created!.id,
        inquiryId: ids.inquiryId,
      }),
    );

    const [inquiry] = await testDb
      .select({ status: inquiries.status })
      .from(inquiries)
      .where(eq(inquiries.id, ids.inquiryId));

    expect(inquiry.status).toBe("won");
  }, 15_000);
});
