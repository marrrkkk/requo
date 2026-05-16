import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { eq, like, or } from "drizzle-orm";

/**
 * DB-backed integration tests for the Polar webhook route.
 *
 * Posts signed Standard-Webhooks payloads through the actual
 * `app/api/billing/polar/webhook/route.ts` POST handler, exercising
 * signature verification, identity resolution, idempotency, and the
 * per-event handler chain end-to-end.
 *
 * The route handler reads the webhook secret from `env.POLAR_WEBHOOK_SECRET`
 * at module load via `Webhooks({ webhookSecret: env.POLAR_WEBHOOK_SECRET ?? "" })`,
 * and the subscription handlers read `env.POLAR_PRO_PRODUCT_ID` to recover
 * `(plan, interval)` via `reversePolarProductId`. Both must be stubbed
 * BEFORE the route module is imported, so we mock `@/lib/env` at the top
 * of the file (Vitest hoists `vi.mock` calls above the first import).
 *
 * `@/lib/db/client` is mocked to redirect every Drizzle query at the
 * shared `testDb` connection (matching the pattern used by every other
 * integration test in this folder), so the route's writes land in the
 * actual integration Postgres.
 */

vi.mock("react", () => ({
  cache: <T extends (...args: never[]) => unknown>(fn: T) => fn,
}));

vi.mock("@/lib/db/client", async () => {
  const { testDb: mockedDb } = await import("../support/db");
  return { db: mockedDb };
});

vi.mock("next/cache", () => ({
  cacheLife: vi.fn(),
  cacheTag: vi.fn(),
  revalidateTag: vi.fn(),
}));

vi.mock("@/lib/env", async () => {
  const actual = await vi.importActual<typeof import("@/lib/env")>(
    "@/lib/env",
  );
  return {
    ...actual,
    env: {
      ...actual.env,
      POLAR_ACCESS_TOKEN: "polar-test-access-token",
      POLAR_WEBHOOK_SECRET: "polar-test-secret",
      POLAR_SERVER: "sandbox" as const,
      // Match the fixture's default `data.product_id` so the
      // subscription handler can reverse-lookup `(plan, interval)`.
      POLAR_PRO_PRODUCT_ID: "prod_polar_fixture_pro_monthly",
    },
    isPolarConfigured: true,
  };
});

import { POST } from "@/app/api/billing/polar/webhook/route";
import { validateEvent } from "@polar-sh/sdk/webhooks";

import {
  activateSubscription,
  getAccountSubscription,
} from "@/lib/billing/subscription-service";
import {
  accountSubscriptions,
  billingEvents,
  paymentAttempts,
  refunds,
  user,
} from "@/lib/db/schema";
import { businesses } from "@/lib/db/schema/businesses";

import { closeTestDb, testDb } from "@/tests/support/db";
import {
  polarDuplicateDeliveryPayload,
  polarOrderPaidPayload,
  polarSubscriptionCanceledFuturePayload,
  polarSubscriptionCreatedPayload,
  polarSubscriptionRevokedPayload,
  polarUnresolvableUserSubscriptionPayload,
} from "@/tests/support/fixtures/polar";
import { signPolarPayload } from "@/tests/support/polar-webhook-signing";

/* ── Constants ────────────────────────────────────────────────────────────── */

const PREFIX = "test_polar_webhook";
const SECRET = "polar-test-secret";
const NOW = new Date("2026-04-20T00:00:00.000Z");
const PERIOD_START = new Date("2026-04-01T00:00:00.000Z");
const PERIOD_END_FUTURE = new Date("2026-05-20T00:00:00.000Z");

/* ── Test helpers ─────────────────────────────────────────────────────────── */

/**
 * Inserts a test user and two owned businesses for one test, scoped under
 * the file-wide `PREFIX` so cleanup can target them via `LIKE`.
 *
 * Two businesses are created so subscription tests can assert that the
 * denormalized `businesses.plan` column propagates across every owned
 * business (Requirement 7.6).
 */
async function seedUserAndBusinesses(suffix: string): Promise<{
  userId: string;
  businessIds: [string, string];
}> {
  const userId = `${PREFIX}_${suffix}_user`;
  const bizA = `${PREFIX}_${suffix}_biz_a`;
  const bizB = `${PREFIX}_${suffix}_biz_b`;

  await testDb.insert(user).values({
    id: userId,
    name: "Polar Webhook Test",
    email: `${userId}@example.com`,
    emailVerified: true,
    createdAt: NOW,
    updatedAt: NOW,
  });

  await testDb.insert(businesses).values([
    {
      id: bizA,
      ownerUserId: userId,
      name: "Polar Webhook Test Biz A",
      slug: bizA.replace(/_/g, "-"),
      plan: "free",
      businessType: "general_project_services",
      defaultCurrency: "USD",
      createdAt: NOW,
      updatedAt: NOW,
    },
    {
      id: bizB,
      ownerUserId: userId,
      name: "Polar Webhook Test Biz B",
      slug: bizB.replace(/_/g, "-"),
      plan: "free",
      businessType: "general_project_services",
      defaultCurrency: "USD",
      createdAt: NOW,
      updatedAt: NOW,
    },
  ]);

  return { userId, businessIds: [bizA, bizB] };
}

/**
 * Drives an active subscription onto the fixture user via the canonical
 * `subscription-service` writer so `account_subscriptions` and the
 * denormalized `businesses.plan` cache are seeded consistently. Used by
 * tests that need a pre-existing subscription to exercise update / revoke /
 * order-isolation behaviour.
 */
async function seedActiveSubscription(userId: string): Promise<void> {
  await activateSubscription({
    userId,
    plan: "pro",
    provider: "polar",
    currency: "USD",
    status: "active",
    providerSubscriptionId: "sub_polar_fixture",
    providerCustomerId: "cus_polar_fixture",
    currentPeriodStart: PERIOD_START,
    currentPeriodEnd: PERIOD_END_FUTURE,
  });
}

/**
 * Posts a signed Polar webhook payload through the actual route handler.
 *
 * Returns the HTTP status plus the parsed-and-jsonb-roundtripped form of
 * the payload so tests can deep-equal it against `billing_events.payload`
 * (the route stores the typed camelCase payload after `validateEvent`
 * parses the snake_case wire shape, and jsonb storage transforms `Date`
 * fields to ISO strings).
 */
async function postSignedWebhook(payload: object): Promise<{
  status: number;
  storedPayload: unknown;
}> {
  const body = JSON.stringify(payload);
  const signed = signPolarPayload(SECRET, body);

  const request = new Request(
    "http://localhost/api/billing/polar/webhook",
    {
      method: "POST",
      body: signed.body,
      headers: { "content-type": "application/json", ...signed.headers },
    },
  );

  // The Polar `Webhooks` adapter only reads `request.text()` and
  // `request.headers.get(...)` — both present on the standard Request.
  // The `NextRequest` declared signature is structurally compatible at
  // runtime, so we cast to satisfy TypeScript without pulling in
  // next/server in tests.
  const response = await POST(
    request as unknown as Parameters<typeof POST>[0],
  );

  // Mirror the storage transform: validateEvent parses the snake_case
  // wire payload into the typed camelCase form, and `jsonb` columns
  // serialise Date instances as ISO strings on insert. Performing the
  // same JSON.parse(JSON.stringify(...)) here yields a value we can
  // deep-equal against `billing_events.payload`.
  const parsed = validateEvent(body, signed.headers, SECRET);
  const storedPayload = JSON.parse(JSON.stringify(parsed));

  return { status: response.status, storedPayload };
}

/**
 * Removes every row this file could have created. Scoped by the
 * file-wide `PREFIX` for owner-keyed rows, plus `LIKE` patterns on the
 * fixture's deterministic `data.id` values so unresolvable-user events
 * (which don't carry a `userId`) and dashboard-issued refunds (which
 * predate any seeded user) are also cleaned up.
 *
 * Order matters: refunds → payment_attempts → account_subscriptions →
 * billing_events → businesses → user. `businesses.owner_user_id` uses
 * `onDelete: "restrict"`, so businesses must be deleted before the user
 * row that owns them.
 */
async function cleanupAll(): Promise<void> {
  await testDb
    .delete(refunds)
    .where(
      or(
        like(refunds.userId, `${PREFIX}%`),
        like(refunds.providerRefundId, "rfd_polar%fixture%"),
      ),
    );

  await testDb
    .delete(paymentAttempts)
    .where(
      or(
        like(paymentAttempts.userId, `${PREFIX}%`),
        like(paymentAttempts.providerPaymentId, "order_polar%fixture%"),
      ),
    );

  await testDb
    .delete(accountSubscriptions)
    .where(like(accountSubscriptions.userId, `${PREFIX}%`));

  await testDb
    .delete(billingEvents)
    .where(
      or(
        like(billingEvents.userId, `${PREFIX}%`),
        like(billingEvents.providerEventId, "%polar_fixture%"),
        like(billingEvents.providerEventId, "%polar_dup_fixture%"),
        like(billingEvents.providerEventId, "%polar_unresolvable_fixture%"),
      ),
    );

  await testDb
    .delete(businesses)
    .where(like(businesses.ownerUserId, `${PREFIX}%`));

  await testDb.delete(user).where(like(user.id, `${PREFIX}%`));
}

/* ── Suite ────────────────────────────────────────────────────────────────── */

describe("polar webhook integration", () => {
  beforeAll(async () => {
    await cleanupAll();
  }, 30_000);

  afterEach(async () => {
    await cleanupAll();
  }, 30_000);

  afterAll(async () => {
    await closeTestDb();
  }, 30_000);

  /* ── Task 10.2 — `subscription.created` happy path ──────────────────────── */

  it("activates a subscription and syncs every owned business plan on subscription.created", async () => {
    const { userId, businessIds } = await seedUserAndBusinesses("created");

    const payload = polarSubscriptionCreatedPayload({ externalId: userId });
    const { status, storedPayload } = await postSignedWebhook(payload);

    expect(status).toBe(200);

    const [subscription] = await testDb
      .select()
      .from(accountSubscriptions)
      .where(eq(accountSubscriptions.userId, userId))
      .limit(1);

    expect(subscription).toBeDefined();
    expect(subscription?.status).toBe("active");
    expect(subscription?.plan).toBe("pro");
    expect(subscription?.billingProvider).toBe("polar");
    expect(subscription?.providerSubscriptionId).toBe("sub_polar_fixture");
    expect(subscription?.providerCustomerId).toBe("cus_polar_fixture");
    expect(subscription?.currentPeriodStart?.toISOString()).toBe(
      PERIOD_START.toISOString(),
    );
    expect(subscription?.currentPeriodEnd?.toISOString()).toBe(
      PERIOD_END_FUTURE.toISOString(),
    );

    const businessRows = await testDb
      .select({ id: businesses.id, plan: businesses.plan })
      .from(businesses)
      .where(eq(businesses.ownerUserId, userId));

    expect(businessRows).toHaveLength(2);
    const plansById = new Map(businessRows.map((row) => [row.id, row.plan]));
    expect(plansById.get(businessIds[0])).toBe("pro");
    expect(plansById.get(businessIds[1])).toBe("pro");

    const [event] = await testDb
      .select()
      .from(billingEvents)
      .where(
        eq(
          billingEvents.providerEventId,
          "subscription.created:sub_polar_fixture",
        ),
      )
      .limit(1);

    expect(event).toBeDefined();
    expect(event?.userId).toBe(userId);
    expect(event?.provider).toBe("polar");
    expect(event?.eventType).toBe("subscription.created");
    expect(event?.status).toBe("processed");
    expect(event?.processedAt).toBeInstanceOf(Date);
    expect(event?.payload).toEqual(storedPayload);
  }, 30_000);

  /* ── Task 10.3 — `subscription.updated` canceled-with-future-period-end ── */

  it("flips the subscription to canceled with a future period end and keeps owned business plans on subscription.updated", async () => {
    const { userId } = await seedUserAndBusinesses("canceled");
    await seedActiveSubscription(userId);

    const payload = polarSubscriptionCanceledFuturePayload({
      externalId: userId,
    });
    const { status } = await postSignedWebhook(payload);

    expect(status).toBe(200);

    const [subscription] = await testDb
      .select()
      .from(accountSubscriptions)
      .where(eq(accountSubscriptions.userId, userId))
      .limit(1);

    expect(subscription?.status).toBe("canceled");
    expect(subscription?.canceledAt).toBeInstanceOf(Date);
    expect(subscription?.currentPeriodEnd?.toISOString()).toBe(
      PERIOD_END_FUTURE.toISOString(),
    );
    // Plan column on the subscription row stays on the paid plan — the
    // user keeps access until `currentPeriodEnd`.
    expect(subscription?.plan).toBe("pro");

    // Denormalised `businesses.plan` cache is unchanged because the
    // service's effective-plan resolver returns "pro" while the canceled
    // subscription's `currentPeriodEnd` is still in the future.
    const businessRows = await testDb
      .select({ plan: businesses.plan })
      .from(businesses)
      .where(eq(businesses.ownerUserId, userId));

    expect(businessRows).toHaveLength(2);
    for (const row of businessRows) {
      expect(row.plan).toBe("pro");
    }
  }, 30_000);

  /* ── Task 10.4 — `subscription.revoked` ─────────────────────────────────── */

  it("expires the subscription and downgrades every owned business to free on subscription.revoked", async () => {
    const { userId } = await seedUserAndBusinesses("revoked");
    await seedActiveSubscription(userId);

    const payload = polarSubscriptionRevokedPayload({ externalId: userId });
    const { status } = await postSignedWebhook(payload);

    expect(status).toBe(200);

    const [subscription] = await testDb
      .select()
      .from(accountSubscriptions)
      .where(eq(accountSubscriptions.userId, userId))
      .limit(1);

    expect(subscription?.status).toBe("expired");

    const businessRows = await testDb
      .select({ plan: businesses.plan })
      .from(businesses)
      .where(eq(businesses.ownerUserId, userId));

    expect(businessRows).toHaveLength(2);
    for (const row of businessRows) {
      expect(row.plan).toBe("free");
    }
  }, 30_000);

  /* ── Task 10.5 — `order.paid` and subscription-state isolation ──────────── */

  /**
   * Property 10: For any account_subscriptions row in any state and any
   * order event, after the handler runs the subscription columns are
   * unchanged.
   *
   * Validates: Requirements 8.5
   */
  it("records a succeeded payment_attempts row on order.paid without mutating the subscription", async () => {
    const { userId } = await seedUserAndBusinesses("order");
    await seedActiveSubscription(userId);

    const before = await getAccountSubscription(userId);
    expect(before).toBeDefined();

    const payload = polarOrderPaidPayload({ externalId: userId });
    const { status } = await postSignedWebhook(payload);

    expect(status).toBe(200);

    const [paymentRow] = await testDb
      .select()
      .from(paymentAttempts)
      .where(
        eq(paymentAttempts.providerPaymentId, "order_polar_fixture"),
      )
      .limit(1);

    expect(paymentRow).toBeDefined();
    expect(paymentRow?.userId).toBe(userId);
    expect(paymentRow?.status).toBe("succeeded");
    expect(paymentRow?.amount).toBe(1900);
    expect(paymentRow?.currency).toBe("USD");
    expect(paymentRow?.provider).toBe("polar");

    const after = await getAccountSubscription(userId);
    expect(after).toBeDefined();
    // Subscription columns must be byte-for-byte unchanged
    expect(after?.status).toBe(before?.status);
    expect(after?.plan).toBe(before?.plan);
    expect(after?.providerSubscriptionId).toBe(before?.providerSubscriptionId);
    expect(after?.providerCustomerId).toBe(before?.providerCustomerId);
    expect(after?.canceledAt?.toISOString() ?? null).toBe(
      before?.canceledAt?.toISOString() ?? null,
    );
    expect(after?.currentPeriodStart?.toISOString() ?? null).toBe(
      before?.currentPeriodStart?.toISOString() ?? null,
    );
    expect(after?.currentPeriodEnd?.toISOString() ?? null).toBe(
      before?.currentPeriodEnd?.toISOString() ?? null,
    );
  }, 30_000);

  /* ── Task 10.6 — `refund.updated` (succeeded) ───────────────────────────── */

  // Removed: refunds are issued exclusively through the Polar customer
  // portal post-refactor. Subscription state changes after a refund are
  // reflected via `subscription.canceled` / `subscription.revoked`
  // events, which are covered by the tests above.

  /* ── Task 10.7 — Duplicate webhook delivery ─────────────────────────────── */

  /**
   * Property 4: For any sequence of N >= 1 deliveries of the same verified
   * Polar webhook event, the final DB state of account_subscriptions,
   * billing_events, payment_attempts, and refunds equals the
   * single-delivery state; the billing_events row is processed with
   * non-null processedAt; payload deep-equals the raw event.
   *
   * Validates: Requirements 5.3, 6.1, 6.2, 6.3, 6.4, 6.5
   */
  it("dedupes duplicate webhook deliveries to a single billing_events row", async () => {
    const { userId } = await seedUserAndBusinesses("dup");

    const payload = polarDuplicateDeliveryPayload({ externalId: userId });

    // Two deliveries of the exact same logical event. The signing
    // helper picks fresh webhook-id/timestamp/signature each call so
    // both pass signature verification independently — but the route's
    // `withIdempotency` derives `providerEventId` from the event type
    // and `data.id`, both of which are stable across deliveries.
    const first = await postSignedWebhook(payload);
    const second = await postSignedWebhook(payload);

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);

    const events = await testDb
      .select()
      .from(billingEvents)
      .where(
        eq(
          billingEvents.providerEventId,
          "subscription.created:sub_polar_dup_fixture",
        ),
      );

    expect(events).toHaveLength(1);
    expect(events[0]?.status).toBe("processed");
    expect(events[0]?.processedAt).toBeInstanceOf(Date);
    expect(events[0]?.payload).toEqual(first.storedPayload);

    // Single account_subscriptions row, not duplicated by the second delivery.
    const subscriptions = await testDb
      .select()
      .from(accountSubscriptions)
      .where(eq(accountSubscriptions.userId, userId));
    expect(subscriptions).toHaveLength(1);
    expect(subscriptions[0]?.status).toBe("active");

    // The duplicate fixture is a `subscription.created` envelope, so
    // there should be no payment_attempts / refunds rows.
    const payments = await testDb
      .select()
      .from(paymentAttempts)
      .where(eq(paymentAttempts.userId, userId));
    expect(payments).toHaveLength(0);

    const refundRows = await testDb
      .select()
      .from(refunds)
      .where(eq(refunds.userId, userId));
    expect(refundRows).toHaveLength(0);
  }, 30_000);

  /* ── Task 10.8 — Unresolvable-user event ────────────────────────────────── */

  /**
   * Property 6: For any verified payload where every identity source is
   * absent or unresolvable, exactly one billing_events row is recorded
   * with userId = null and status = "failed"; no account_subscriptions
   * row is inserted; no refunds row is inserted; payment_attempts may
   * exist with userId = null for order events.
   *
   * Validates: Requirements 8.4, 9.4, 11.4
   */
  it("records an unresolvable subscription event with userId=null and status=failed", async () => {
    const payload = polarUnresolvableUserSubscriptionPayload();
    const { status } = await postSignedWebhook(payload);

    expect(status).toBe(200);

    const [event] = await testDb
      .select()
      .from(billingEvents)
      .where(
        eq(
          billingEvents.providerEventId,
          "subscription.created:sub_polar_unresolvable_fixture",
        ),
      )
      .limit(1);

    expect(event).toBeDefined();
    expect(event?.userId).toBeNull();
    expect(event?.status).toBe("failed");
    expect(event?.errorMessage).toBe("User not found");

    // No account_subscriptions row should have been created.
    const subscriptions = await testDb
      .select()
      .from(accountSubscriptions)
      .where(
        eq(
          accountSubscriptions.providerSubscriptionId,
          "sub_polar_unresolvable_fixture",
        ),
      );
    expect(subscriptions).toHaveLength(0);
  }, 30_000);
});
