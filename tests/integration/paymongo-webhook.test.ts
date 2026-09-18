import { createHmac } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { eq, inArray } from "drizzle-orm";

vi.mock("@/lib/db/client", async () => {
  const { testDb: mockedDb } = await import("../support/db");

  return { db: mockedDb };
});

vi.mock("next/cache", () => ({
  cacheLife: vi.fn(),
  cacheTag: vi.fn(),
  revalidateTag: vi.fn(),
}));

vi.mock("@/lib/inngest/client", () => ({
  inngest: { send: vi.fn(async () => undefined) },
}));

import { POST } from "@/app/api/payments/webhooks/paymongo/[connectionId]/route";
import { inngest } from "@/lib/inngest/client";
import { encryptSecret } from "@/lib/payments/secret-box";
import { processStoredPaymentEvent } from "@/lib/payments/reconciliation";
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

const prefix = "test_paymongo_wh";
const WEBHOOK_SECRET = "whsk_test_signing_secret";

let ids: WorkflowFixtureIds;
let connectionId: string;
let invoiceId: string;

function sign(rawBody: string, timestamp: number): string {
  const sig = createHmac("sha256", WEBHOOK_SECRET).update(`${timestamp}.${rawBody}`, "utf8").digest("hex");
  return `t=${timestamp},te=${sig},li=`;
}

function checkoutPaidEvent() {
  return {
    data: {
      id: "evt_route_paid",
      type: "checkout_session.payment.paid",
      resource: "checkout_session",
      livemode: false,
      attributes: {
        reference_number: "INV-ROUTE-1",
        metadata: {
          requoInvoiceId: invoiceId,
          requoInvoiceNumber: "INV-ROUTE-1",
          requoBusinessId: ids.businessId,
          requoConnectionId: connectionId,
        },
        payment_intent: { id: "pi_route" },
        payments: [
          {
            id: "pay_route_1",
            attributes: {
              amount: 10000,
              currency: "PHP",
              status: "paid",
              livemode: false,
              paid_at: 1781000000,
              created_at: 1780999900,
              updated_at: 1781000000,
              refunds: [],
            },
          },
        ],
      },
    },
  };
}

async function postWebhook(rawBody: string, signature: string | null) {
  const headers = new Headers({ "content-type": "application/json" });
  if (signature) headers.set("paymongo-signature", signature);
  const request = new Request("https://app.example.com/api/payments/webhooks/paymongo/x", {
    method: "POST",
    headers,
    body: rawBody,
  });
  return POST(request, { params: Promise.resolve({ connectionId }) });
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

describe("paymongo webhook route", () => {
  vi.setConfig({ testTimeout: 120_000 });

  beforeAll(async () => {
    ids = await createWorkflowFixture(prefix);
    connectionId = `${prefix}_conn`;
    await testDb
      .insert(paymentProviderConnections)
      .values({
        id: connectionId,
        businessId: ids.businessId,
        provider: "paymongo",
        environment: "test",
        credentialsCiphertext: encryptSecret(JSON.stringify({ secretKey: "sk_test_x", webhookSecret: WEBHOOK_SECRET })),
        publicHint: "••••1234",
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .onConflictDoNothing();
  }, 60_000);

  beforeEach(async () => {
    vi.clearAllMocks();
    await cleanup();
    const created = await createInvoiceForBusiness({
      businessId: ids.businessId,
      actorUserId: ids.ownerUserId,
      title: "Route invoice",
      customerName: "Jane Doe",
      customerEmail: "jane@example.com",
      customerContactMethod: "email",
      customerContactHandle: "jane@example.com",
      currency: "PHP",
      issueDate: "2026-06-01",
      dueDate: "2027-07-15",
      notes: null,
      paymentTerms: null,
      discountInCents: 0,
      taxInCents: 0,
      taxLabel: null,
      items: [{ description: "Work", quantity: 1, unitPriceInCents: 10000 }],
    });
    invoiceId = (created as { id: string }).id;
    await markInvoiceSentForBusiness({ businessId: ids.businessId, invoiceId, actorUserId: ids.ownerUserId });
  }, 60_000);

  afterAll(async () => {
    await cleanup();
    await testDb.delete(paymentProviderConnections).where(eq(paymentProviderConnections.id, connectionId));
    await cleanupWorkflowFixture(prefix);
    await closeTestDb();
  }, 60_000);

  it("accepts a signed payment event, persists it, and enqueues reconciliation", async () => {
    const rawBody = JSON.stringify(checkoutPaidEvent());
    const response = await postWebhook(rawBody, sign(rawBody, Math.floor(Date.now() / 1000)));
    expect(response.status).toBe(200);
    const [event] = await testDb.select().from(paymentEvents).where(eq(paymentEvents.providerEventId, "evt_route_paid"));
    expect(event?.status).toBe("processing");
    expect(inngest.send).toHaveBeenCalledOnce();
    expect(inngest.send).toHaveBeenCalledWith(
      expect.objectContaining({ name: "requo/payment.event-received" }),
    );

    const result = await processStoredPaymentEvent(event!.id);
    expect(result.ok).toBe(true);
    const [invoice] = await testDb.select().from(invoices).where(eq(invoices.id, invoiceId));
    expect(invoice?.status).toBe("paid");
    const rows = await testDb.select().from(payments).where(eq(payments.invoiceId, invoiceId));
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ providerPaymentId: "pay_route_1", status: "succeeded" });
  });

  it("rejects invalid signatures without persisting", async () => {
    const rawBody = JSON.stringify(checkoutPaidEvent());
    const response = await postWebhook(rawBody, sign(`${rawBody} `, Math.floor(Date.now() / 1000)));
    expect(response.status).toBe(400);
    expect(await testDb.select().from(paymentEvents).where(eq(paymentEvents.businessId, ids.businessId))).toHaveLength(0);
    expect(inngest.send).not.toHaveBeenCalled();
  });

  it("rejects replayed timestamps without persisting", async () => {
    const rawBody = JSON.stringify(checkoutPaidEvent());
    const response = await postWebhook(rawBody, sign(rawBody, Math.floor(Date.now() / 1000) - 3600));
    expect(response.status).toBe(400);
    expect(await testDb.select().from(paymentEvents).where(eq(paymentEvents.businessId, ids.businessId))).toHaveLength(0);
  });

  it("treats redelivery as a harmless duplicate", async () => {
    const rawBody = JSON.stringify(checkoutPaidEvent());
    const first = await postWebhook(rawBody, sign(rawBody, Math.floor(Date.now() / 1000)));
    expect(first.status).toBe(200);
    const second = await postWebhook(rawBody, sign(rawBody, Math.floor(Date.now() / 1000)));
    expect(second.status).toBe(200);
    expect(await second.json()).toMatchObject({ ok: true, duplicate: true });
    expect(await testDb.select().from(paymentEvents).where(eq(paymentEvents.businessId, ids.businessId))).toHaveLength(1);
    expect(inngest.send).toHaveBeenCalledOnce();
  });

  it("records unknown event types as ignored without enqueueing", async () => {
    const rawBody = JSON.stringify({ data: { id: "evt_unknown", type: "payout.paid", resource: "payout", livemode: false, attributes: {} } });
    const response = await postWebhook(rawBody, sign(rawBody, Math.floor(Date.now() / 1000)));
    expect(response.status).toBe(200);
    const [event] = await testDb.select().from(paymentEvents).where(eq(paymentEvents.providerEventId, "evt_unknown"));
    expect(event?.status).toBe("ignored");
    expect(inngest.send).not.toHaveBeenCalled();
  });

  it("records live-mode delivery on a test connection as failed without enqueueing", async () => {
    const payload = checkoutPaidEvent();
    payload.data.id = "evt_wrong_env";
    payload.data.livemode = true;
    const rawBody = JSON.stringify(payload);
    const response = await postWebhook(rawBody, sign(rawBody, Math.floor(Date.now() / 1000)));
    expect(response.status).toBe(200);
    const [event] = await testDb.select().from(paymentEvents).where(eq(paymentEvents.providerEventId, "evt_wrong_env"));
    expect(event?.status).toBe("failed");
    expect(event?.error).toBe("environment_mismatch");
    expect(inngest.send).not.toHaveBeenCalled();
    expect(await testDb.select().from(payments).where(eq(payments.invoiceId, invoiceId))).toHaveLength(0);
  });

  it("reconciles payment failure and refund events through the worker", async () => {
    const failed = {
      data: {
        id: "pay_route_fail",
        type: "payment.failed",
        resource: "payment",
        livemode: false,
        attributes: {
          amount: 10000,
          currency: "PHP",
          status: "failed",
          checkout_session_id: "cs_route_fail",
          created_at: 1781000000,
          updated_at: 1781000010,
          refunds: [],
          metadata: { requoInvoiceId: invoiceId, requoBusinessId: ids.businessId, requoConnectionId: connectionId },
        },
      },
    };
    const failedBody = JSON.stringify(failed);
    expect((await postWebhook(failedBody, sign(failedBody, Math.floor(Date.now() / 1000)))).status).toBe(200);
    const [failedEvent] = await testDb.select().from(paymentEvents).where(eq(paymentEvents.providerEventId, "pay_route_fail"));
    await processStoredPaymentEvent(failedEvent!.id);
    let rows = await testDb.select().from(payments).where(eq(payments.invoiceId, invoiceId));
    expect(rows[0]?.status).toBe("failed");
    let [invoice] = await testDb.select().from(invoices).where(eq(invoices.id, invoiceId));
    expect(invoice?.status).toBe("unpaid");

    const paidBody = JSON.stringify(checkoutPaidEvent());
    expect((await postWebhook(paidBody, sign(paidBody, Math.floor(Date.now() / 1000)))).status).toBe(200);
    const [paidEvent] = await testDb.select().from(paymentEvents).where(eq(paymentEvents.providerEventId, "evt_route_paid"));
    await processStoredPaymentEvent(paidEvent!.id);

    const refunded = {
      data: {
        id: "pay_route_1",
        type: "payment.refunded",
        resource: "payment",
        livemode: false,
        attributes: {
          amount: 10000,
          currency: "PHP",
          status: "paid",
          paid_at: 1781000000,
          checkout_session_id: "evt_route_paid",
          refunds: [{ id: "ref_1", amount: 10000 }],
          metadata: {},
        },
      },
    };
    const refundBody = JSON.stringify(refunded);
    expect((await postWebhook(refundBody, sign(refundBody, Math.floor(Date.now() / 1000)))).status).toBe(200);
    const [refundEvent] = await testDb.select().from(paymentEvents).where(eq(paymentEvents.providerEventId, "pay_route_1"));
    const refundResult = await processStoredPaymentEvent(refundEvent!.id);
    expect(refundResult.ok).toBe(true);
    rows = await testDb.select().from(payments).where(eq(payments.invoiceId, invoiceId));
    const paid = rows.find((r) => r.providerPaymentId === "pay_route_1");
    expect(paid).toMatchObject({ status: "refunded", refundedAmountInCents: 10000 });
    [invoice] = await testDb.select().from(invoices).where(eq(invoices.id, invoiceId));
    expect(invoice?.status).toBe("unpaid");
  });

  it("records malformed payloads as failed without enqueueing", async () => {
    const rawBody = "{not json";
    const response = await postWebhook(rawBody, sign(rawBody, Math.floor(Date.now() / 1000)));
    expect(response.status).toBe(200);
    const events = await testDb
      .select()
      .from(paymentEvents)
      .where(eq(paymentEvents.businessId, ids.businessId));
    const malformed = events.filter((e) => e.providerEventId.startsWith("malformed:"));
    expect(malformed).toHaveLength(1);
    expect(malformed[0]?.status).toBe("failed");
    expect(malformed[0]?.error).toBe("malformed_json");
    expect(inngest.send).not.toHaveBeenCalled();
  });
});
