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

import { POST } from "@/app/api/payments/webhooks/stripe/[connectionId]/route";
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

const prefix = "test_stripe_wh";
const WEBHOOK_SECRET = "whsec_test_signing_secret";

let ids: WorkflowFixtureIds;
let connectionId: string;
let invoiceId: string;

function sign(rawBody: string, timestamp: number): string {
  const sig = createHmac("sha256", WEBHOOK_SECRET).update(`${timestamp}.${rawBody}`, "utf8").digest("hex");
  return `t=${timestamp},v1=${sig}`;
}

function sessionCompleted(paymentStatus: string, eventId = "evt_stripe_cs") {
  return {
    id: eventId,
    type: "checkout.session.completed",
    livemode: false,
    created: 1781000000,
    data: {
      object: {
        id: "cs_test_route",
        object: "checkout.session",
        status: "complete",
        payment_status: paymentStatus,
        amount_total: 10000,
        currency: "usd",
        created: 1781000000,
        livemode: false,
        metadata: {
          requoInvoiceId: invoiceId,
          requoInvoiceNumber: "INV-ROUTE-S",
          requoBusinessId: ids.businessId,
          requoConnectionId: connectionId,
        },
        payment_intent: "pi_route_1",
      },
    },
  };
}

async function postWebhook(rawBody: string, signature: string | null) {
  const headers = new Headers({ "content-type": "application/json" });
  if (signature) headers.set("stripe-signature", signature);
  const request = new Request("https://app.example.com/api/payments/webhooks/stripe/x", {
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

describe("stripe webhook route", () => {
  vi.setConfig({ testTimeout: 120_000 });

  beforeAll(async () => {
    ids = await createWorkflowFixture(prefix);
    connectionId = `${prefix}_conn`;
    await testDb
      .insert(paymentProviderConnections)
      .values({
        id: connectionId,
        businessId: ids.businessId,
        provider: "stripe",
        environment: "test",
        credentialsCiphertext: encryptSecret(JSON.stringify({ secretKey: "sk_test_x", webhookSecret: WEBHOOK_SECRET })),
        publicHint: "••••4242",
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
      currency: "USD",
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

  it("pays the invoice from a paid checkout.session.completed", async () => {
    const rawBody = JSON.stringify(sessionCompleted("paid"));
    const response = await postWebhook(rawBody, sign(rawBody, Math.floor(Date.now() / 1000)));
    expect(response.status).toBe(200);
    const [event] = await testDb.select().from(paymentEvents).where(eq(paymentEvents.providerEventId, "evt_stripe_cs"));
    expect(event?.status).toBe("processing");
    expect(inngest.send).toHaveBeenCalledOnce();

    const result = await processStoredPaymentEvent(event!.id);
    expect(result.ok).toBe(true);
    const [invoice] = await testDb.select().from(invoices).where(eq(invoices.id, invoiceId));
    expect(invoice?.status).toBe("paid");
    const rows = await testDb.select().from(payments).where(eq(payments.invoiceId, invoiceId));
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      providerCheckoutId: "cs_test_route",
      providerPaymentId: "pi_route_1",
      status: "succeeded",
    });
  });

  it("records an unpaid checkout.session.completed as processing, not paid", async () => {
    const rawBody = JSON.stringify(sessionCompleted("unpaid", "evt_stripe_unpaid"));
    expect((await postWebhook(rawBody, sign(rawBody, Math.floor(Date.now() / 1000)))).status).toBe(200);
    const [event] = await testDb.select().from(paymentEvents).where(eq(paymentEvents.providerEventId, "evt_stripe_unpaid"));
    await processStoredPaymentEvent(event!.id);
    const rows = await testDb.select().from(payments).where(eq(payments.invoiceId, invoiceId));
    expect(rows).toHaveLength(1);
    expect(rows[0]?.status).toBe("processing");
    const [invoice] = await testDb.select().from(invoices).where(eq(invoices.id, invoiceId));
    expect(invoice?.status).toBe("unpaid");
  });

  it("handles async payment success and failure", async () => {
    const succeeded = {
      id: "evt_async_ok",
      type: "checkout.session.async_payment_succeeded",
      livemode: false,
      data: { object: { ...sessionCompleted("paid", "x").data.object, id: "cs_async" } },
    };
    const okBody = JSON.stringify(succeeded);
    expect((await postWebhook(okBody, sign(okBody, Math.floor(Date.now() / 1000)))).status).toBe(200);
    const [okEvent] = await testDb.select().from(paymentEvents).where(eq(paymentEvents.providerEventId, "evt_async_ok"));
    await processStoredPaymentEvent(okEvent!.id);
    let [invoice] = await testDb.select().from(invoices).where(eq(invoices.id, invoiceId));
    expect(invoice?.status).toBe("paid");

    const failed = {
      id: "evt_async_fail",
      type: "checkout.session.async_payment_failed",
      livemode: false,
      data: {
        object: {
          id: "cs_async_fail",
          status: "complete",
          payment_status: "unpaid",
          amount_total: 10000,
          currency: "usd",
          created: 1781000000,
          livemode: false,
          metadata: {
            requoInvoiceId: invoiceId,
            requoInvoiceNumber: "INV-ROUTE-S",
            requoBusinessId: ids.businessId,
            requoConnectionId: connectionId,
          },
          payment_intent: "pi_async_fail",
        },
      },
    };
    const failBody = JSON.stringify(failed);
    expect((await postWebhook(failBody, sign(failBody, Math.floor(Date.now() / 1000)))).status).toBe(200);
    const [failEvent] = await testDb.select().from(paymentEvents).where(eq(paymentEvents.providerEventId, "evt_async_fail"));
    const failResult = await processStoredPaymentEvent(failEvent!.id);
    expect(failResult.ok).toBe(true);
    [invoice] = await testDb.select().from(invoices).where(eq(invoices.id, invoiceId));
    expect(invoice?.status).toBe("paid");
    const rows = await testDb.select().from(payments).where(eq(payments.invoiceId, invoiceId));
    expect(rows.find((r) => r.providerPaymentId === "pi_async_fail")?.status).toBe("failed");
  });

  it("applies charge.refunded cumulatively to the payment intent", async () => {
    const paidBody = JSON.stringify(sessionCompleted("paid"));
    expect((await postWebhook(paidBody, sign(paidBody, Math.floor(Date.now() / 1000)))).status).toBe(200);
    const [paidEvent] = await testDb.select().from(paymentEvents).where(eq(paymentEvents.providerEventId, "evt_stripe_cs"));
    await processStoredPaymentEvent(paidEvent!.id);

    const refund = {
      id: "evt_charge_ref",
      type: "charge.refunded",
      livemode: false,
      data: {
        object: { id: "ch_1", amount: 10000, amount_refunded: 10000, currency: "usd", payment_intent: "pi_route_1", livemode: false },
      },
    };
    const refundBody = JSON.stringify(refund);
    expect((await postWebhook(refundBody, sign(refundBody, Math.floor(Date.now() / 1000)))).status).toBe(200);
    const [refundEvent] = await testDb.select().from(paymentEvents).where(eq(paymentEvents.providerEventId, "evt_charge_ref"));
    await processStoredPaymentEvent(refundEvent!.id);
    const rows = await testDb.select().from(payments).where(eq(payments.invoiceId, invoiceId));
    expect(rows.find((r) => r.providerPaymentId === "pi_route_1")).toMatchObject({
      status: "refunded",
      refundedAmountInCents: 10000,
    });
    const [invoice] = await testDb.select().from(invoices).where(eq(invoices.id, invoiceId));
    expect(invoice?.status).toBe("unpaid");
  });

  it("rejects invalid signatures and replays without persisting", async () => {
    const rawBody = JSON.stringify(sessionCompleted("paid"));
    expect((await postWebhook(rawBody, "t=123,v1=bad")).status).toBe(400);
    expect(
      (await postWebhook(rawBody, sign(rawBody, Math.floor(Date.now() / 1000) - 3600))).status,
    ).toBe(400);
    expect(await testDb.select().from(paymentEvents).where(eq(paymentEvents.businessId, ids.businessId))).toHaveLength(0);
    expect(inngest.send).not.toHaveBeenCalled();
  });

  it("treats redelivery as a harmless duplicate", async () => {
    const rawBody = JSON.stringify(sessionCompleted("paid"));
    expect((await postWebhook(rawBody, sign(rawBody, Math.floor(Date.now() / 1000)))).status).toBe(200);
    const second = await postWebhook(rawBody, sign(rawBody, Math.floor(Date.now() / 1000)));
    expect(second.status).toBe(200);
    expect(await second.json()).toMatchObject({ ok: true, duplicate: true });
    expect(await testDb.select().from(paymentEvents).where(eq(paymentEvents.businessId, ids.businessId))).toHaveLength(1);
    expect(inngest.send).toHaveBeenCalledOnce();
  });
});
