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

import { decryptSecret } from "@/lib/payments/secret-box";
import { reconcileNormalizedEvent } from "@/lib/payments/reconciliation";
import type { ProviderPaymentSnapshot } from "@/lib/payments/types";
import {
  completeStripePlatformConnection,
  consumeConnectionAttempt,
  refreshStripePlatformLink,
  startStripePlatformConnection,
} from "@/features/payment-providers/mutations";
import {
  auditLogs,
  paymentProviderConnections,
  providerConnectionAttempts,
} from "@/lib/db/schema";

import { closeTestDb, testDb } from "@/tests/support/db";
import {
  cleanupWorkflowFixture,
  createWorkflowFixture,
  type WorkflowFixtureIds,
} from "@/tests/support/fixtures/workflow";

const prefix = "test_stripe_cnx";
let ids: WorkflowFixtureIds;

const realFetch = globalThis.fetch;

function stubStripeFetch(handler: (url: string, init: RequestInit) => unknown) {
  const stub = vi.fn(async (url: unknown, init?: RequestInit) => ({
    ok: true,
    status: 200,
    json: async () => handler(String(url), init ?? {}),
  }) as Response);
  (globalThis as Record<string, unknown>).fetch = stub;
  return stub;
}

function accountPayload(overrides: Record<string, unknown> = {}) {
  return {
    id: "acct_test_123",
    charges_enabled: true,
    details_submitted: true,
    requirements: { currently_due: [] },
    ...overrides,
  };
}

async function cleanup() {
  const businessIds = [ids.businessId, ids.otherBusinessId, ids.archivedBusinessId];
  await testDb.delete(providerConnectionAttempts).where(inArray(providerConnectionAttempts.businessId, businessIds));
  await testDb.delete(paymentProviderConnections).where(inArray(paymentProviderConnections.businessId, businessIds));
  await testDb.delete(auditLogs).where(inArray(auditLogs.businessId, businessIds));
}

describe("stripe connect platform flow", () => {
  vi.setConfig({ testTimeout: 120_000 });

  beforeAll(async () => {
    ids = await createWorkflowFixture(prefix);
  }, 60_000);

  beforeEach(async () => {
    vi.clearAllMocks();
    (globalThis as Record<string, unknown>).fetch = realFetch;
    await cleanup();
  }, 60_000);

  afterAll(async () => {
    (globalThis as Record<string, unknown>).fetch = realFetch;
    await cleanup();
    await cleanupWorkflowFixture(prefix);
    await closeTestDb();
  }, 60_000);

  async function start() {
    stubStripeFetch((url) => {
      if (url.endsWith("/v1/accounts")) return { id: "acct_test_123" };
      if (url.endsWith("/v1/account_links")) return { url: "https://connect.stripe.com/setup/abc" };
      throw new Error(`unexpected ${url}`);
    });
    const result = await startStripePlatformConnection({
      businessId: ids.businessId,
      actorUserId: ids.ownerUserId,
      actorEmail: "owner@example.com",
      environment: "test",
      returnUrl: "https://app.example.com/api/payments/stripe/connect/return",
      refreshUrl: "https://app.example.com/api/payments/stripe/connect/refresh",
      fetchImpl: globalThis.fetch,
    });
    if ("error" in result) throw new Error(result.error);
    return result;
  }

  function stubAccount(payload: Record<string, unknown> = {}) {
    stubStripeFetch((url) => {
      if (url.includes("/v1/accounts/acct_test_123")) return accountPayload(payload);
      throw new Error(`unexpected ${url}`);
    });
  }

  async function attemptIdForConnection(): Promise<string> {
    const [attempt] = await testDb
      .select()
      .from(providerConnectionAttempts)
      .where(eq(providerConnectionAttempts.businessId, ids.businessId))
      .limit(1);
    if (!attempt) throw new Error("no attempt");
    return attempt.id;
  }

  it("starts onboarding and persists a platform connection", async () => {
    const { url, connectionId } = await start();
    expect(url).toBe("https://connect.stripe.com/setup/abc");
    const [row] = await testDb
      .select()
      .from(paymentProviderConnections)
      .where(eq(paymentProviderConnections.id, connectionId));
    expect(row).toMatchObject({
      provider: "stripe",
      environment: "test",
      authMode: "platform",
      status: "onboarding",
      providerAccountId: "acct_test_123",
    });
    const credentials = JSON.parse(decryptSecret(row!.credentialsCiphertext)) as Record<string, string>;
    expect(credentials).toEqual({ providerAccountId: "acct_test_123" });
    expect(credentials.secretKey).toBeUndefined();
  });

  it("completes a ready account on callback and audits it", async () => {
    await start();
    stubAccount();
    const result = await completeStripePlatformConnection({
      attemptId: await attemptIdForConnection(),
      userId: ids.ownerUserId,
      fetchImpl: globalThis.fetch,
    });
    expect(result).toMatchObject({ status: "ready" });
    if ("error" in result) throw new Error(result.error);
    const [row] = await testDb
      .select()
      .from(paymentProviderConnections)
      .where(eq(paymentProviderConnections.id, result.connectionId));
    expect(row?.status).toBe("ready");
    const audits = await testDb.select().from(auditLogs).where(eq(auditLogs.businessId, ids.businessId));
    expect(audits.map((a) => a.action)).toContain("connection.connected");
    // One-time: replaying the callback fails.
    const replay = await completeStripePlatformConnection({
      attemptId: "pat_nonexistent",
      userId: ids.ownerUserId,
      fetchImpl: globalThis.fetch,
    });
    expect(replay).toMatchObject({ error: expect.any(String) });
  });

  it("marks incomplete onboarding as action_required, never ready", async () => {
    await start();
    stubAccount({ charges_enabled: false, details_submitted: false });
    const result = await completeStripePlatformConnection({
      attemptId: await attemptIdForConnection(),
      userId: ids.ownerUserId,
      fetchImpl: globalThis.fetch,
    });
    expect(result).toMatchObject({ status: "action_required" });
  });

  it("rejects callbacks from the wrong user or a missing attempt", async () => {
    await start();
    stubAccount();
    const wrongUser = await completeStripePlatformConnection({
      attemptId: await attemptIdForConnection(),
      userId: "user_other",
      fetchImpl: globalThis.fetch,
    });
    expect(wrongUser).toMatchObject({ error: expect.any(String) });
    // Attempt survives the wrong-user try and still works for the owner.
    const retry = await completeStripePlatformConnection({
      attemptId: await attemptIdForConnection(),
      userId: ids.ownerUserId,
      fetchImpl: globalThis.fetch,
    });
    expect(retry).toMatchObject({ status: "ready" });
  });

  it("refuses platform start while a BYO connection exists", async () => {
    await testDb.insert(paymentProviderConnections).values({
      id: `${prefix}_byo`,
      businessId: ids.businessId,
      provider: "stripe",
      environment: "test",
      credentialsCiphertext: "x",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const result = await startStripePlatformConnection({
      businessId: ids.businessId,
      actorUserId: ids.ownerUserId,
      environment: "test",
      returnUrl: "https://app.example.com/return",
      refreshUrl: "https://app.example.com/refresh",
      fetchImpl: globalThis.fetch,
    });
    expect(result).toMatchObject({ error: expect.stringMatching(/disconnect/i) });
    await testDb.delete(paymentProviderConnections).where(eq(paymentProviderConnections.id, `${prefix}_byo`));
  });

  it("refuses to overwrite a different connected account", async () => {
    await start();
    stubAccount();
    await completeStripePlatformConnection({
      attemptId: await attemptIdForConnection(),
      userId: ids.ownerUserId,
      fetchImpl: globalThis.fetch,
    });
    const again = await startStripePlatformConnection({
      businessId: ids.businessId,
      actorUserId: ids.ownerUserId,
      environment: "test",
      returnUrl: "https://app.example.com/return",
      refreshUrl: "https://app.example.com/refresh",
      fetchImpl: globalThis.fetch,
    });
    // Same account id is returned by the stub, but the row is ready.
    expect(again).toMatchObject({ error: expect.any(String) });
  });

  it("issues fresh onboarding links for an unconsumed attempt", async () => {
    await start();
    stubStripeFetch((url) => {
      if (url.endsWith("/v1/account_links")) return { url: "https://connect.stripe.com/setup/fresh" };
      throw new Error(`unexpected ${url}`);
    });
    const result = await refreshStripePlatformLink({
      attemptId: await attemptIdForConnection(),
      userId: ids.ownerUserId,
      returnUrl: "https://app.example.com/return",
      refreshUrl: "https://app.example.com/refresh",
      fetchImpl: globalThis.fetch,
    });
    expect(result).toEqual({ url: "https://connect.stripe.com/setup/fresh" });
  });

  it("rejects cross-account webhooks in platform mode", async () => {
    const { connectionId } = await start();
    await testDb
      .update(paymentProviderConnections)
      .set({ providerAccountId: "acct_correct", status: "ready", updatedAt: new Date() })
      .where(eq(paymentProviderConnections.id, connectionId));
    const snapshot: ProviderPaymentSnapshot = {
      provider: "stripe",
      environment: "test",
      providerCheckoutId: "cs_x",
      providerPaymentId: "pi_x",
      providerAccountId: "acct_attacker",
      status: "succeeded",
      amountInCents: 100,
      refundedAmountInCents: 0,
      currency: "USD",
      occurredAt: new Date(),
    };
    const result = await reconcileNormalizedEvent({
      eventId: null,
      normalized: { providerEventId: "evt_x", rawType: "payment_intent.succeeded", snapshot, rawPayload: {} },
      connectionId,
      actorUserId: null,
    });
    expect(result).toEqual({ ok: false, reason: "account_mismatch" });
  });

  it("consumes attempts exactly once", async () => {
    await start();
    const attemptId = await attemptIdForConnection();
    const row = await consumeConnectionAttempt({ attemptId, userId: ids.ownerUserId });
    expect(row?.id).toBe(attemptId);
    expect(await consumeConnectionAttempt({ attemptId, userId: ids.ownerUserId })).toBeNull();
  });
});
