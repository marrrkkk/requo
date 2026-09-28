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
import { createDraftChangeOrder, addChangeOrderDelta, submitChangeOrderForApproval, decideChangeOrderByToken } from "@/features/change-orders/mutations";
import { createInvoiceForBusiness } from "@/features/invoices/mutations";
import {
  createQuoteForBusiness,
  markQuoteSentForBusiness,
  respondToPublicQuoteByToken,
} from "@/features/quotes/mutations";
import type { QuoteEditorInput } from "@/features/quotes/schemas";
import {
  getLatestApprovedScheduleForQuote,
} from "@/features/schedules/queries";
import {
  resolveSchedulePrefillLines,
  saveScheduleForQuote,
} from "@/features/schedules/mutations";
import {
  auditLogs,
  businessMembers,
  businessPackAssignmentHistory,
  businessPackAssignments,
  businesses,
  changeOrderLines,
  changeOrders,
  commercialScheduleItems,
  commercialSchedules,
  invoiceLineItems,
  invoices,
  packRecipes,
  profiles,
  user,
} from "@/lib/db/schema";

import { closeTestDb, testDb } from "@/tests/support/db";

const prefix = "test_schedules";
const now = new Date("2026-05-07T00:00:00.000Z");

function slug(value: string) {
  return value.replace(/_/g, "-");
}

function quoteInput(): QuoteEditorInput {
  return {
    title: "Portrait session",
    customerName: "Sam Kim",
    customerEmail: "sam@example.com",
    customerContactMethod: "email",
    customerContactHandle: "sam@example.com",
    validUntil: "2099-12-31",
    discountInCents: 0,
    taxInCents: 0,
    items: [{ id: "line-shoot", description: "Session", quantity: 1, unitPriceInCents: 10000 }],
  };
}

async function cleanup() {
  await testDb.delete(changeOrderLines).where(like(changeOrderLines.businessId, `${prefix}%`));
  await testDb.delete(changeOrders).where(like(changeOrders.businessId, `${prefix}%`));
  await testDb.delete(invoiceLineItems).where(like(invoiceLineItems.businessId, `${prefix}%`));
  await testDb.delete(invoices).where(like(invoices.businessId, `${prefix}%`));
  await testDb.delete(commercialScheduleItems).where(like(commercialScheduleItems.businessId, `${prefix}%`));
  await testDb.delete(commercialSchedules).where(like(commercialSchedules.businessId, `${prefix}%`));
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

async function setupBusiness(suffix: string) {
  const userId = `${prefix}_owner_${suffix}`;
  const name = `${prefix}_biz_${suffix}`;

  await testDb.insert(user).values({
    id: userId,
    name: "Schedule Owner",
    email: `${userId}@example.com`,
    emailVerified: true,
    createdAt: now,
    updatedAt: now,
  });

  await createBusinessForUser({
    user: { id: userId, name: "Schedule Owner", email: `${userId}@example.com` },
    businessId: slug(name),
    defaultCurrency: "USD",
    name,
    businessType: "photo_video_production",
    plan: "free",
  });

  return { userId, businessId: slug(name) };
}

describe("commercial schedules", () => {
  beforeEach(async () => {
    await cleanup();
  }, 30_000);

  afterAll(async () => {
    await cleanup();
    await closeTestDb();
  }, 30_000);

  it("saves coherent schedules, snapshots on acceptance, and prefills invoices", async () => {
    const { userId, businessId } = await setupBusiness("s1");

    const created = await createQuoteForBusiness({
      businessId,
      actorUserId: userId,
      currency: "USD",
      quote: quoteInput(),
    });
    const quoteId = created!.id;

    // Incoherent: rejected at write.
    await expect(
      saveScheduleForQuote({
        businessId,
        quoteId,
        items: [{ category: "deposit", label: "Deposit", amountCents: 1000, dueCondition: "on acceptance" }],
        actorUserId: userId,
        actorRole: "owner",
      }),
    ).rejects.toThrow("incoherent");

    await saveScheduleForQuote({
      businessId,
      quoteId,
      items: [
        { category: "retainer", label: "Retainer", percentBps: 3000, dueCondition: "on acceptance" },
        { category: "balance", label: "Balance", percentBps: 7000, dueCondition: "on delivery" },
      ],
      actorUserId: userId,
      actorRole: "owner",
    });

    // No scope blocks on photo pack? scope recipe requires deliverables + usage_rights.
    // Add them so the send gate passes.
    const { upsertScopeBlockForQuote } = await import("@/features/scope-blocks/mutations");
    await upsertScopeBlockForQuote({
      businessId,
      quoteId,
      kind: "deliverables",
      content: { items: [{ label: "Gallery" }] },
      actorUserId: userId,
    });
    await upsertScopeBlockForQuote({
      businessId,
      quoteId,
      kind: "usage_rights",
      content: { matrix: [{ media: "print", term: "1 year", territory: "PH" }], carveouts: [] },
      actorUserId: userId,
    });

    const sent = await markQuoteSentForBusiness({
      businessId,
      quoteId,
      actorUserId: userId,
      sendMethod: "manual",
    });

    expect(sent?.changed).toBe(true);

    await respondToPublicQuoteByToken({
      token: sent!.publicToken!,
      response: "accepted",
      signerName: "Sam Kim",
      confirmed: true,
    });

    const accepted = await getLatestApprovedScheduleForQuote({ businessId, quoteId });
    expect(accepted?.state).toBe("accepted");
    expect(accepted?.items.map((item) => item.computedAmountCents)).toEqual([3000, 7000]);

    const prefill = await resolveSchedulePrefillLines({ businessId, quoteId });
    expect(prefill?.lines).toHaveLength(2);

    const invoice = await createInvoiceForBusiness({
      businessId,
      actorUserId: userId,
      quoteId,
      title: "Portrait session",
      customerName: "Sam Kim",
      customerEmail: "sam@example.com",
      customerContactMethod: "email",
      customerContactHandle: "sam@example.com",
      currency: "USD",
      issueDate: "2026-05-07",
      dueDate: "2026-05-21",
      discountInCents: 0,
      taxInCents: 0,
      items: [],
    });

    expect("id" in invoice && invoice.id).toBeTruthy();

    const lines = await testDb
      .select()
      .from(invoiceLineItems)
      .where(eq(invoiceLineItems.invoiceId, (invoice as { id: string }).id));

    expect(lines.map((line) => line.unitPriceInCents).sort()).toEqual([3000, 7000]);
  }, 30_000);

  it("derives schedule v2 through an approved change order, v1 untouched", async () => {
    const { userId, businessId } = await setupBusiness("s2");

    const created = await createQuoteForBusiness({
      businessId,
      actorUserId: userId,
      currency: "USD",
      quote: quoteInput(),
    });
    const quoteId = created!.id;

    await saveScheduleForQuote({
      businessId,
      quoteId,
      items: [
        { category: "retainer", label: "Retainer", percentBps: 3000, dueCondition: "on acceptance" },
        { category: "balance", label: "Balance", percentBps: 7000, dueCondition: "on delivery" },
      ],
      actorUserId: userId,
      actorRole: "owner",
    });

    const { upsertScopeBlockForQuote } = await import("@/features/scope-blocks/mutations");
    await upsertScopeBlockForQuote({
      businessId, quoteId, kind: "deliverables",
      content: { items: [{ label: "Gallery" }] }, actorUserId: userId,
    });
    await upsertScopeBlockForQuote({
      businessId, quoteId, kind: "usage_rights",
      content: { matrix: [{ media: "print", term: "1 year", territory: "PH" }], carveouts: [] },
      actorUserId: userId,
    });

    const sent = await markQuoteSentForBusiness({
      businessId, quoteId, actorUserId: userId, sendMethod: "manual",
    });

    await respondToPublicQuoteByToken({
      token: sent!.publicToken!,
      response: "accepted",
      signerName: "Sam Kim",
      confirmed: true,
    });

    const v1 = await getLatestApprovedScheduleForQuote({ businessId, quoteId });
    expect(v1?.version).toBe(1);

    const draft = await createDraftChangeOrder({
      businessId, quoteId, reason: "Split the balance", actorUserId: userId, actorRole: "owner",
    });

    await addChangeOrderDelta({
      businessId,
      changeOrderId: draft.id,
      targetKind: "schedule_item",
      targetScheduleItemId: v1!.items[1].id,
      change: "modify",
      payload: { percentBps: 7000, label: "Balance (two parts)" },
      actorRole: "owner",
    });

    // Add a second item so v2 differs structurally.
    await addChangeOrderDelta({
      businessId,
      changeOrderId: draft.id,
      targetKind: "schedule_item",
      change: "add",
      payload: { id: "sched-print-credit", category: "milestone", label: "Print credit", percentBps: 0, amountCents: null, dueCondition: "on delivery" },
      actorRole: "owner",
    });

    const submitted = await submitChangeOrderForApproval({
      businessId, changeOrderId: draft.id, actorUserId: userId, actorRole: "owner",
    });

    const decided = await decideChangeOrderByToken({
      token: submitted.customerToken,
      decision: "approved",
      approverName: "Sam Kim",
    });

    expect(decided.state).toBe("approved");

    const latest = await getLatestApprovedScheduleForQuote({ businessId, quoteId });
    expect(latest?.version).toBe(2);
    expect(latest?.items).toHaveLength(3);

    // v1 remains historical truth.
    const v1Rows = await testDb
      .select({ state: commercialSchedules.state, version: commercialSchedules.version })
      .from(commercialSchedules)
      .where(eq(commercialSchedules.quoteId, quoteId));

    expect(v1Rows.find((row) => row.version === 1)?.state).toBe("accepted");
  }, 30_000);
});
