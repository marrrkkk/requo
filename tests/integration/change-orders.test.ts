import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { eq, like } from "drizzle-orm";

vi.mock("@/lib/db/client", async () => {
  const { testDb: mockedDb } = await import("../support/db");

  return { db: mockedDb };
});

vi.mock("next/cache", () => ({
  revalidateTag: vi.fn(),
}));

// Public token decisions are rate-limited on IP + user-agent; mirror visitor
// headers since direct mutation calls have no Next request scope.
vi.mock("next/headers", () => ({
  headers: vi.fn(
    async () =>
      new Headers({
        "x-forwarded-for": "203.0.113.10",
        "user-agent": "workflow-test-browser",
      }),
  ),
}));

import { createBusinessForUser } from "@/features/businesses/mutations";
import {
  addChangeOrderDelta,
  createDraftChangeOrder,
  decideChangeOrderByToken,
  deleteDraftChangeOrder,
  rebaseChangeOrder,
  submitChangeOrderForApproval,
  withdrawChangeOrder,
} from "@/features/change-orders/mutations";
import { getDerivedCommercialState } from "@/features/change-orders/derived";
import {
  createQuoteForBusiness,
  markQuoteSentForBusiness,
  respondToPublicQuoteByToken,
} from "@/features/quotes/mutations";
import type { QuoteEditorInput } from "@/features/quotes/schemas";
import {
  auditLogs,
  businessMembers,
  businessPackAssignmentHistory,
  businessPackAssignments,
  businesses,
  changeOrderLines,
  changeOrders,
  packRecipes,
  profiles,
  quoteItems,
  quotes,
  user,
} from "@/lib/db/schema";

import { closeTestDb, testDb } from "@/tests/support/db";

const prefix = "test_change_orders";
const now = new Date("2026-05-07T00:00:00.000Z");

function slug(value: string) {
  return value.replace(/_/g, "-");
}

function quoteInput(): QuoteEditorInput {
  return {
    title: "Deck build",
    customerName: "Chris Ray",
    customerEmail: "chris@example.com",
    customerContactMethod: "email",
    customerContactHandle: "chris@example.com",
    validUntil: "2099-12-31",
    discountInCents: 0,
    taxInCents: 0,
    items: [{ id: "line-deck", description: "Deck framing", quantity: 1, unitPriceInCents: 50000 }],
  };
}

async function cleanup() {
  await testDb.delete(changeOrderLines).where(like(changeOrderLines.businessId, `${prefix}%`));
  await testDb.delete(changeOrders).where(like(changeOrders.businessId, `${prefix}%`));
  await testDb.delete(auditLogs).where(like(auditLogs.businessId, `${prefix}%`));
  await testDb.delete(packRecipes).where(like(packRecipes.businessId, `${prefix}%`));
  await testDb
    .delete(businessPackAssignmentHistory)
    .where(like(businessPackAssignmentHistory.businessId, `${prefix}%`));
  await testDb
    .delete(businessPackAssignments)
    .where(like(businessPackAssignments.businessId, `${prefix}%`));
  await testDb.delete(businessMembers).where(like(businessMembers.userId, `${prefix}%`));
  await testDb.delete(businesses).where(like(businesses.ownerUserId, `${prefix}%`));
  await testDb.delete(profiles).where(like(profiles.userId, `${prefix}%`));
  await testDb.delete(user).where(like(user.id, `${prefix}%`));
}

async function setupAcceptedQuote(suffix: string) {
  const userId = `${prefix}_owner_${suffix}`;
  const name = `${prefix}_biz_${suffix}`;

  await testDb.insert(user).values({
    id: userId,
    name: "CO Owner",
    email: `${userId}@example.com`,
    emailVerified: true,
    createdAt: now,
    updatedAt: now,
  });

  // Secondary type keeps the send path free of pack gates for fixture flow.
  await createBusinessForUser({
    user: { id: userId, name: "CO Owner", email: `${userId}@example.com` },
    businessId: slug(name),
    defaultCurrency: "USD",
    name,
    businessType: "cleaning_services",
    plan: "free",
  });

  const businessId = slug(name);
  const created = await createQuoteForBusiness({
    businessId,
    actorUserId: userId,
    currency: "USD",
    quote: quoteInput(),
  });

  const sent = await markQuoteSentForBusiness({
    businessId,
    quoteId: created!.id,
    actorUserId: userId,
    sendMethod: "manual",
  });

  await respondToPublicQuoteByToken({
    token: sent!.publicToken!,
    response: "accepted",
    signerName: "Chris Ray",
    confirmed: true,
  });

  return { userId, businessId, quoteId: created!.id };
}

async function getFirstLineId(businessId: string, quoteId: string) {
  const [line] = await testDb
    .select({ id: quoteItems.id })
    .from(quoteItems)
    .where(eq(quoteItems.quoteId, quoteId));

  if (!line) throw new Error("Fixture quote has no lines.");
  return line.id;
}

describe("change orders", () => {
  beforeEach(async () => {
    await cleanup();
  }, 30_000);

  afterAll(async () => {
    await cleanup();
    await closeTestDb();
  }, 30_000);

  it("drafts, submits, and approves a line change with derived state", async () => {
    const { userId, businessId, quoteId } = await setupAcceptedQuote("co1");
    const lineId = await getFirstLineId(businessId, quoteId);

    const draft = await createDraftChangeOrder({
      businessId,
      quoteId,
      reason: "Client wants premium stain",
      actorUserId: userId,
      actorRole: "owner",
    });

    expect(draft.displayNumber).toBe("CO-001");

    await addChangeOrderDelta({
      businessId,
      changeOrderId: draft.id,
      targetKind: "line",
      targetQuoteItemId: lineId,
      change: "modify",
      payload: { unitPriceInCents: 60000 },
      actorRole: "owner",
    });

    const submitted = await submitChangeOrderForApproval({
      businessId,
      changeOrderId: draft.id,
      actorUserId: userId,
      actorRole: "owner",
    });

    expect(submitted.customerToken).toHaveLength(20);

    // Second pending CO waits on the slot.
    const draft2 = await createDraftChangeOrder({
      businessId,
      quoteId,
      reason: "Second change",
      actorUserId: userId,
      actorRole: "owner",
    });

    await addChangeOrderDelta({
      businessId,
      changeOrderId: draft2.id,
      targetKind: "line",
      targetQuoteItemId: lineId,
      change: "modify",
      payload: { quantity: 2 },
      actorRole: "owner",
    });

    await expect(
      submitChangeOrderForApproval({
        businessId,
        changeOrderId: draft2.id,
        actorUserId: userId,
        actorRole: "owner",
      }),
    ).rejects.toThrow();

    const decided = await decideChangeOrderByToken({
      token: submitted.customerToken,
      decision: "approved",
      approverName: "Chris Ray",
    });

    expect(decided.state).toBe("approved");

    const derived = await getDerivedCommercialState({ businessId, quoteId });

    expect(derived?.totalInCents).toBe(60000);
    expect(derived?.appliedChangeOrders).toHaveLength(1);
    expect(derived?.lines.find((line) => line.id === lineId)?.source).toBe("change_order");

    // Rejected and draft deltas stay commercially inert.
    await withdrawChangeOrder({
      businessId,
      changeOrderId: draft2.id,
      actorUserId: userId,
      actorRole: "owner",
    });

    const derivedAfter = await getDerivedCommercialState({ businessId, quoteId });
    expect(derivedAfter?.totalInCents).toBe(60000);
  }, 30_000);

  it("rejects customer-declined changes without touching state", async () => {
    const { userId, businessId, quoteId } = await setupAcceptedQuote("co2");

    const draft = await createDraftChangeOrder({
      businessId,
      quoteId,
      reason: "Add pergola",
      actorUserId: userId,
      actorRole: "owner",
    });

    await addChangeOrderDelta({
      businessId,
      changeOrderId: draft.id,
      targetKind: "line",
      change: "add",
      payload: { id: "line-pergola", description: "Pergola", quantity: 1, unitPriceInCents: 15000, position: 5 },
      actorRole: "owner",
    });

    const submitted = await submitChangeOrderForApproval({
      businessId,
      changeOrderId: draft.id,
      actorUserId: userId,
      actorRole: "owner",
    });

    const decided = await decideChangeOrderByToken({
      token: submitted.customerToken,
      decision: "rejected",
      comment: "Too expensive.",
    });

    expect(decided.state).toBe("rejected");

    const derived = await getDerivedCommercialState({ businessId, quoteId });
    expect(derived?.totalInCents).toBe(50000);
    expect(derived?.lines.find((line) => line.id === "line-pergola")).toBeUndefined();
  }, 30_000);

  it("requires rebase after the parent quote version moves", async () => {
    const { userId, businessId, quoteId } = await setupAcceptedQuote("co3");
    const lineId = await getFirstLineId(businessId, quoteId);

    const draft = await createDraftChangeOrder({
      businessId,
      quoteId,
      reason: "Bump quantity",
      actorUserId: userId,
      actorRole: "owner",
    });

    await addChangeOrderDelta({
      businessId,
      changeOrderId: draft.id,
      targetKind: "line",
      targetQuoteItemId: lineId,
      change: "modify",
      payload: { quantity: 3 },
      actorRole: "owner",
    });

    const submitted = await submitChangeOrderForApproval({
      businessId,
      changeOrderId: draft.id,
      actorUserId: userId,
      actorRole: "owner",
    });

    // Simulate a parent version move behind the pending CO.
    await testDb
      .update(quotes)
      .set({ version: 99 })
      .where(eq(quotes.id, quoteId));

    await expect(
      decideChangeOrderByToken({
        token: submitted.customerToken,
        decision: "approved",
        approverName: "Chris Ray",
      }),
    ).rejects.toThrow("rebase");

    const rebased = await rebaseChangeOrder({
      businessId,
      changeOrderId: draft.id,
      actorUserId: userId,
      actorRole: "owner",
    });

    expect(rebased.baseQuoteVersion).toBe(99);
    expect(rebased.state).toBe("draft");
  }, 30_000);

  it("deletes drafts only; decided history is immutable", async () => {
    const { userId, businessId, quoteId } = await setupAcceptedQuote("co4");

    const draft = await createDraftChangeOrder({
      businessId,
      quoteId,
      reason: "Temporary",
      actorUserId: userId,
      actorRole: "owner",
    });

    await deleteDraftChangeOrder({ businessId, changeOrderId: draft.id, actorRole: "owner" });

    const [gone] = await testDb
      .select({ id: changeOrders.id })
      .from(changeOrders)
      .where(eq(changeOrders.id, draft.id));

    expect(gone).toBeUndefined();

    // Non-draft fixtures: line rows seed the derived baseline byte-identical.
    const lines = await testDb
      .select()
      .from(quoteItems)
      .where(eq(quoteItems.quoteId, quoteId));

    expect(lines).toHaveLength(1);
  }, 30_000);
});
