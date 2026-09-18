import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { and, eq, inArray, sql } from "drizzle-orm";

vi.mock("@/lib/db/client", async () => {
  const { testDb: mockedDb } = await import("../support/db");

  return { db: mockedDb };
});

vi.mock("next/cache", () => ({
  cacheLife: vi.fn(),
  cacheTag: vi.fn(),
  revalidateTag: vi.fn(),
}));

import { createFakeAdapter } from "@/lib/payments/fake-adapter";
import {
  findStaleProcessingPaymentEvents,
  insertPaymentEvent,
  processStoredPaymentEvent,
  reconcileNormalizedEvent,
  refreshProviderPayment,
  resubmitStalePaymentEvents,
  sanitizeWebhookPayload,
} from "@/lib/payments/reconciliation";
import type {
  NormalizedWebhook,
  ProviderPaymentSnapshot,
} from "@/lib/payments/types";
import { recordPaymentForBusiness } from "@/features/invoices/mutations";
import { createInvoiceForBusiness, markInvoiceSentForBusiness } from "@/features/invoices/mutations";
import {
  activityLogs,
  businessNotifications,
  invoiceLineItems,
  invoices,
  paymentEvents,
  paymentProviderConnections,
  payments,
} from "@/lib/db/schema";

import { closeTestDb, testDb } from "@/tests/support/db";
import {
  cleanupWorkflowFixture,
  createWorkflowFixture,
  type WorkflowFixtureIds,
} from "@/tests/support/fixtures/workflow";

const prefix = "test_provider_pay";
let ids: WorkflowFixtureIds;
let connectionId: string;
let n = 0;

const nextId = (p: string) => `${p}_${(n += 1)}`;

function snap(overrides: Partial<ProviderPaymentSnapshot> = {}): ProviderPaymentSnapshot {
  return {
    provider: "paymongo",
    environment: "test",
    status: "succeeded",
    amountInCents: 10000,
    refundedAmountInCents: 0,
    currency: "USD",
    invoiceId: "",
    businessId: ids.businessId,
    connectionId,
    occurredAt: new Date("2026-06-10T00:00:00.000Z"),
    ...overrides,
  };
}

function normalized(snapshot: ProviderPaymentSnapshot, eventId = nextId("evt")): NormalizedWebhook {
  return { providerEventId: eventId, rawType: "payment.paid", snapshot, rawPayload: {} };
}

async function sentInvoice(totalInCents = 10000) {
  const created = await createInvoiceForBusiness({
    businessId: ids.businessId,
    actorUserId: ids.ownerUserId,
    title: "Provider invoice",
    customerName: "Jane Doe",
    customerEmail: "jane@example.com",
    customerContactMethod: "email",
    customerContactHandle: "jane@example.com",
    currency: "USD",
    issueDate: "2026-06-01",
    dueDate: "2027-07-15",
    notes: null,
    paymentTerms: null,
    discountInCents: 0,
    taxInCents: 0,
    taxLabel: null,
    items: [{ description: "Work", quantity: 1, unitPriceInCents: totalInCents }],
  });
  const id = (created as { id: string }).id;
  await markInvoiceSentForBusiness({ businessId: ids.businessId, invoiceId: id, actorUserId: ids.ownerUserId });
  return id;
}

async function invoiceState(invoiceId: string) {
  const [row] = await testDb.select().from(invoices).where(eq(invoices.id, invoiceId)).limit(1);
  return row;
}

async function invoicePayments(invoiceId: string) {
  return testDb.select().from(payments).where(eq(payments.invoiceId, invoiceId));
}

async function paidNotifications(invoiceId: string) {
  return testDb
    .select()
    .from(businessNotifications)
    .where(and(eq(businessNotifications.invoiceId, invoiceId), eq(businessNotifications.type, "invoice_paid")));
}

async function cleanup() {
  const businessIds = [ids.businessId, ids.otherBusinessId, ids.archivedBusinessId];
  await testDb.delete(paymentEvents).where(inArray(paymentEvents.businessId, businessIds));
  await testDb.delete(payments).where(inArray(payments.businessId, businessIds));
  await testDb.delete(businessNotifications).where(inArray(businessNotifications.businessId, businessIds));
  await testDb.delete(activityLogs).where(inArray(activityLogs.businessId, businessIds));
  await testDb.delete(invoiceLineItems).where(inArray(invoiceLineItems.businessId, businessIds));
  await testDb.delete(invoices).where(inArray(invoices.businessId, businessIds));
}

describe("provider payment reconciliation", () => {
  beforeAll(async () => {
    ids = await createWorkflowFixture(prefix);
    await testDb
      .insert(paymentProviderConnections)
      .values({
        id: `${prefix}_conn`,
        businessId: ids.businessId,
        provider: "paymongo",
        environment: "test",
        credentialsCiphertext: "test-ciphertext",
        publicHint: "••••1234",
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .onConflictDoNothing();
    connectionId = `${prefix}_conn`;
  }, 60_000);

  beforeEach(async () => {
    await cleanup();
  }, 60_000);

  vi.setConfig({ testTimeout: 60_000 });

  afterAll(async () => {
    await cleanup();
    await testDb.delete(paymentProviderConnections).where(eq(paymentProviderConnections.id, `${prefix}_conn`));
    await cleanupWorkflowFixture(prefix);
    await closeTestDb();
  }, 60_000);

  it("records a full payment and fires the paid notification once", async () => {
    const invoiceId = await sentInvoice();
    const result = await reconcileNormalizedEvent({
      normalized: normalized(snap({ invoiceId, providerCheckoutId: nextId("chk"), providerPaymentId: nextId("pay") })),
      connectionId,
      actorUserId: null,
    });
    expect(result.ok && "paymentId" in result && result.paidTransition).toBe(true);
    const stored = await invoiceState(invoiceId);
    expect(stored?.status).toBe("paid");
    expect(await paidNotifications(invoiceId)).toHaveLength(1);
    const rows = await invoicePayments(invoiceId);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ source: "provider", method: "other", status: "succeeded" });
  });

  it("tracks partial then full payment across two checkouts", async () => {
    const invoiceId = await sentInvoice();
    await reconcileNormalizedEvent({
      normalized: normalized(snap({ invoiceId, amountInCents: 4000, providerCheckoutId: nextId("chk"), providerPaymentId: nextId("pay") })),
      connectionId,
      actorUserId: null,
    });
    expect((await invoiceState(invoiceId))?.status).toBe("partially_paid");
    expect(await paidNotifications(invoiceId)).toHaveLength(0);
    await reconcileNormalizedEvent({
      normalized: normalized(snap({ invoiceId, amountInCents: 6000, providerCheckoutId: nextId("chk"), providerPaymentId: nextId("pay") })),
      connectionId,
      actorUserId: null,
    });
    expect((await invoiceState(invoiceId))?.status).toBe("paid");
    expect(await paidNotifications(invoiceId)).toHaveLength(1);
  });

  it("keeps overpayment as paid with an unclamped total", async () => {
    const invoiceId = await sentInvoice();
    await reconcileNormalizedEvent({
      normalized: normalized(snap({ invoiceId, amountInCents: 12000, providerCheckoutId: nextId("chk"), providerPaymentId: nextId("pay") })),
      connectionId,
      actorUserId: null,
    });
    const stored = await invoiceState(invoiceId);
    expect(stored?.status).toBe("paid");
    const rows = await invoicePayments(invoiceId);
    const net = rows.reduce((s, r) => s + (r.amountInCents - r.refundedAmountInCents), 0);
    expect(net).toBe(12000);
  });

  it("treats duplicate event deliveries as a single mutation", async () => {
    const invoiceId = await sentInvoice();
    const first = await insertPaymentEvent({
      connectionId,
      businessId: ids.businessId,
      provider: "paymongo",
      providerEventId: "evt_dup",
      payload: { a: 1 },
    });
    expect(first.inserted).toBe(true);
    const second = await insertPaymentEvent({
      connectionId,
      businessId: ids.businessId,
      provider: "paymongo",
      providerEventId: "evt_dup",
      payload: { a: 1 },
    });
    expect(second.inserted).toBe(false);
    expect(second.eventId).toBe(first.eventId);
    const s = snap({ invoiceId, providerCheckoutId: nextId("chk"), providerPaymentId: nextId("pay") });
    await reconcileNormalizedEvent({ eventId: first.eventId, normalized: normalized(s, "evt_dup"), connectionId, actorUserId: null });
    const again = await reconcileNormalizedEvent({ eventId: first.eventId, normalized: normalized(s, "evt_dup"), connectionId, actorUserId: null });
    expect(again.ok).toBe(true);
    expect(await invoicePayments(invoiceId)).toHaveLength(1);
    const [event] = await testDb.select().from(paymentEvents).where(eq(paymentEvents.id, first.eventId));
    expect(event?.status).toBe("processed");
  });

  it("folds pending, processing, and succeeded events into one row", async () => {
    const invoiceId = await sentInvoice();
    const chk = nextId("chk");
    const pay = nextId("pay");
    await reconcileNormalizedEvent({ normalized: normalized(snap({ invoiceId, status: "pending", providerCheckoutId: chk })), connectionId, actorUserId: null });
    await reconcileNormalizedEvent({ normalized: normalized(snap({ invoiceId, status: "processing", providerCheckoutId: chk })), connectionId, actorUserId: null });
    await reconcileNormalizedEvent({ normalized: normalized(snap({ invoiceId, status: "succeeded", providerCheckoutId: chk, providerPaymentId: pay })), connectionId, actorUserId: null });
    const rows = await invoicePayments(invoiceId);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ providerCheckoutId: chk, providerPaymentId: pay, status: "succeeded" });
    expect((await invoiceState(invoiceId))?.status).toBe("paid");
  });

  it("never lets stale events downgrade a succeeded payment", async () => {
    const invoiceId = await sentInvoice();
    const chk = nextId("chk");
    const pay = nextId("pay");
    await reconcileNormalizedEvent({ normalized: normalized(snap({ invoiceId, status: "succeeded", providerCheckoutId: chk, providerPaymentId: pay })), connectionId, actorUserId: null });
    for (const stale of ["processing", "pending", "failed", "canceled"] as const) {
      const result = await reconcileNormalizedEvent({ normalized: normalized(snap({ invoiceId, status: stale, providerCheckoutId: chk, providerPaymentId: pay })), connectionId, actorUserId: null });
      expect(result.ok).toBe(true);
    }
    const rows = await invoicePayments(invoiceId);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.status).toBe("succeeded");
    expect((await invoiceState(invoiceId))?.status).toBe("paid");
  });

  it("lets a new checkout succeed after an earlier checkout failed", async () => {
    const invoiceId = await sentInvoice();
    await reconcileNormalizedEvent({ normalized: normalized(snap({ invoiceId, status: "failed", providerCheckoutId: nextId("chk") })), connectionId, actorUserId: null });
    expect((await invoiceState(invoiceId))?.status).toBe("unpaid");
    await reconcileNormalizedEvent({ normalized: normalized(snap({ invoiceId, status: "succeeded", providerCheckoutId: nextId("chk"), providerPaymentId: nextId("pay") })), connectionId, actorUserId: null });
    expect((await invoiceState(invoiceId))?.status).toBe("paid");
  });

  it("accumulates partial refunds monotonically and survives duplicates", async () => {
    const invoiceId = await sentInvoice();
    const chk = nextId("chk");
    const pay = nextId("pay");
    await reconcileNormalizedEvent({ normalized: normalized(snap({ invoiceId, providerCheckoutId: chk, providerPaymentId: pay })), connectionId, actorUserId: null });
    await reconcileNormalizedEvent({ normalized: normalized(snap({ invoiceId, status: "succeeded", refundedAmountInCents: 2000, providerCheckoutId: chk, providerPaymentId: pay })), connectionId, actorUserId: null });
    let rows = await invoicePayments(invoiceId);
    expect(rows[0]).toMatchObject({ status: "partially_refunded", refundedAmountInCents: 2000 });
    expect((await invoiceState(invoiceId))?.status).toBe("partially_paid");
    await reconcileNormalizedEvent({ normalized: normalized(snap({ invoiceId, status: "succeeded", refundedAmountInCents: 2000, providerCheckoutId: chk, providerPaymentId: pay })), connectionId, actorUserId: null });
    rows = await invoicePayments(invoiceId);
    expect(rows[0]?.refundedAmountInCents).toBe(2000);
    await reconcileNormalizedEvent({ normalized: normalized(snap({ invoiceId, status: "refunded", refundedAmountInCents: 10000, providerCheckoutId: chk, providerPaymentId: pay })), connectionId, actorUserId: null });
    rows = await invoicePayments(invoiceId);
    expect(rows[0]).toMatchObject({ status: "refunded", refundedAmountInCents: 10000 });
    expect((await invoiceState(invoiceId))?.status).toBe("unpaid");
  });

  it("applies a refund against an overpayment back to exactly paid", async () => {
    const invoiceId = await sentInvoice();
    const chk = nextId("chk");
    const pay = nextId("pay");
    await reconcileNormalizedEvent({ normalized: normalized(snap({ invoiceId, amountInCents: 12000, providerCheckoutId: chk, providerPaymentId: pay })), connectionId, actorUserId: null });
    await reconcileNormalizedEvent({ normalized: normalized(snap({ invoiceId, amountInCents: 12000, refundedAmountInCents: 2000, providerCheckoutId: chk, providerPaymentId: pay })), connectionId, actorUserId: null });
    expect((await invoiceState(invoiceId))?.status).toBe("paid");
    const rows = await invoicePayments(invoiceId);
    expect(rows[0]?.refundedAmountInCents).toBe(2000);
  });

  it("rejects currency mismatch without mutating anything", async () => {
    const invoiceId = await sentInvoice();
    const result = await reconcileNormalizedEvent({
      normalized: normalized(snap({ invoiceId, currency: "eur", providerCheckoutId: nextId("chk"), providerPaymentId: nextId("pay") })),
      connectionId,
      actorUserId: null,
    });
    expect(result).toEqual({ ok: false, reason: "currency_mismatch" });
    expect(await invoicePayments(invoiceId)).toHaveLength(0);
  });

  it("rejects unknown invoices, business, provider, and environment mismatches", async () => {
    const invoiceId = await sentInvoice();
    expect(
      await reconcileNormalizedEvent({ normalized: normalized(snap({ invoiceId: "inv_missing", providerCheckoutId: nextId("chk") })), connectionId, actorUserId: null }),
    ).toEqual({ ok: false, reason: "unknown_invoice" });
    expect(
      await reconcileNormalizedEvent({ normalized: normalized(snap({ invoiceId, businessId: ids.otherBusinessId, providerCheckoutId: nextId("chk") })), connectionId, actorUserId: null }),
    ).toEqual({ ok: false, reason: "business_mismatch" });
    expect(
      await reconcileNormalizedEvent({ normalized: normalized({ ...snap({ invoiceId, providerCheckoutId: nextId("chk") }), provider: "stripe" }), connectionId, actorUserId: null }),
    ).toEqual({ ok: false, reason: "provider_mismatch" });
    expect(
      await reconcileNormalizedEvent({ normalized: normalized({ ...snap({ invoiceId, providerCheckoutId: nextId("chk") }), environment: "live" }), connectionId, actorUserId: null }),
    ).toEqual({ ok: false, reason: "environment_mismatch" });
    expect(await invoicePayments(invoiceId)).toHaveLength(0);
  });

  it("ignores unknown event types without failing", async () => {
    const { eventId } = await insertPaymentEvent({
      connectionId,
      businessId: ids.businessId,
      provider: "paymongo",
      providerEventId: nextId("evt"),
      payload: {},
    });
    const result = await reconcileNormalizedEvent({
      eventId,
      normalized: { providerEventId: "x", rawType: "weird.event", snapshot: null, rawPayload: {} },
      connectionId,
      actorUserId: null,
    });
    expect(result).toEqual({ ok: true, ignored: true });
    const [event] = await testDb.select().from(paymentEvents).where(eq(paymentEvents.id, eventId));
    expect(event?.status).toBe("ignored");
  });

  it("combines manual and provider payments toward paid", async () => {
    const invoiceId = await sentInvoice();
    const manual = await recordPaymentForBusiness({
      businessId: ids.businessId,
      invoiceId,
      actorUserId: ids.ownerUserId,
      amountInCents: 4000,
      paymentDate: "2026-06-05",
      method: "cash",
    });
    expect("paymentId" in manual).toBe(true);
    await reconcileNormalizedEvent({
      normalized: normalized(snap({ invoiceId, amountInCents: 6000, providerCheckoutId: nextId("chk"), providerPaymentId: nextId("pay") })),
      connectionId,
      actorUserId: null,
    });
    expect((await invoiceState(invoiceId))?.status).toBe("paid");
  });

  it("stays silent on paid-to-paid and re-fires after refund then repay", async () => {
    const invoiceId = await sentInvoice();
    const chk = nextId("chk");
    const pay = nextId("pay");
    await reconcileNormalizedEvent({ normalized: normalized(snap({ invoiceId, providerCheckoutId: chk, providerPaymentId: pay })), connectionId, actorUserId: null });
    await reconcileNormalizedEvent({ normalized: normalized(snap({ invoiceId, amountInCents: 2000, providerCheckoutId: nextId("chk"), providerPaymentId: nextId("pay") })), connectionId, actorUserId: null });
    expect(await paidNotifications(invoiceId)).toHaveLength(1);
    await reconcileNormalizedEvent({ normalized: normalized(snap({ invoiceId, refundedAmountInCents: 10000, providerCheckoutId: chk, providerPaymentId: pay })), connectionId, actorUserId: null });
    expect((await invoiceState(invoiceId))?.status).toBe("partially_paid");
    const adapter = createFakeAdapter("paymongo");
    const refreshed: ProviderPaymentSnapshot = { ...snap({ invoiceId, providerCheckoutId: chk, providerPaymentId: pay }), refundedAmountInCents: 2000 };
    adapter.parseWebhook({ providerEventId: pay, rawType: "payment.paid", snapshot: refreshed }, "test");
    const result = await refreshProviderPayment({
      businessId: ids.businessId,
      actorUserId: ids.ownerUserId,
      connectionId,
      providerPaymentId: pay,
      credentials: {},
      adapter,
    });
    expect(result.ok).toBe(true);
    expect((await invoiceState(invoiceId))?.status).toBe("paid");
    expect(await paidNotifications(invoiceId)).toHaveLength(2);
    const refreshedActivities = await testDb
      .select()
      .from(activityLogs)
      .where(
        and(
          eq(activityLogs.businessId, ids.businessId),
          eq(activityLogs.type, "payment.refreshed"),
          sql`${activityLogs.metadata}->>'invoiceId' = ${invoiceId}`,
        ),
      );
    expect(refreshedActivities.length).toBeGreaterThanOrEqual(1);
  });

  it("processes a stored event end to end through the fake adapter", async () => {
    const invoiceId = await sentInvoice();
    const chk = nextId("chk");
    const pay = nextId("pay");
    const adapter = createFakeAdapter("paymongo");
    const fakeConnectionId = connectionId;
    const parsed = adapter.parseWebhook(
      { providerEventId: nextId("evt"), rawType: "payment.paid", snapshot: snap({ invoiceId, providerCheckoutId: chk, providerPaymentId: pay, connectionId: fakeConnectionId }) },
      "test",
    );
    const { eventId } = await insertPaymentEvent({
      connectionId,
      businessId: ids.businessId,
      provider: "paymongo",
      providerEventId: parsed.providerEventId,
      payload: { providerEventId: parsed.providerEventId, rawType: "payment.paid", snapshot: parsed.snapshot },
    });
    const result = await processStoredPaymentEvent(eventId, { adapter });
    expect(result.ok).toBe(true);
    expect((await invoiceState(invoiceId))?.status).toBe("paid");
  });

  it("resubmits only stale processing events", async () => {
    const stale = await insertPaymentEvent({
      connectionId,
      businessId: ids.businessId,
      provider: "paymongo",
      providerEventId: nextId("evt"),
      payload: {},
    });
    await testDb
      .update(paymentEvents)
      .set({ createdAt: new Date(Date.now() - 20 * 60 * 1000) })
      .where(eq(paymentEvents.id, stale.eventId));
    const fresh = await insertPaymentEvent({
      connectionId,
      businessId: ids.businessId,
      provider: "paymongo",
      providerEventId: nextId("evt"),
      payload: {},
    });
    const found = await findStaleProcessingPaymentEvents();
    expect(found.map((r) => r.id)).toContain(stale.eventId);
    expect(found.map((r) => r.id)).not.toContain(fresh.eventId);
    const sent: string[] = [];
    const resubmitted = await resubmitStalePaymentEvents(async (id) => {
      sent.push(id);
    });
    expect(resubmitted.ids).toContain(stale.eventId);
    expect(sent).toContain(stale.eventId);
    expect(sent).not.toContain(fresh.eventId);
  });

  it("sanitizes secrets out of persisted payloads", () => {
    const clean = sanitizeWebhookPayload({
      id: "evt_1",
      secretKey: "sk_live_x",
      nested: { client_secret: "cs", amount: 5 },
      list: [{ password: "p", ok: 1 }],
    }) as Record<string, unknown>;
    expect(clean.secretKey).toBe("[redacted]");
    expect((clean.nested as Record<string, unknown>).client_secret).toBe("[redacted]");
    expect((clean.nested as Record<string, unknown>).amount).toBe(5);
    expect(((clean.list as unknown[])?.[0] as Record<string, unknown>).password).toBe("[redacted]");
    expect(JSON.stringify(clean)).not.toContain("sk_live_x");
  });
});
