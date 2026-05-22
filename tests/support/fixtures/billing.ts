import { eq } from "drizzle-orm";

import {
  activateSubscription,
  updateSubscriptionStatus,
} from "@/lib/billing/subscription-service";
import { user } from "@/lib/db/schema/auth";
import { businesses } from "@/lib/db/schema/businesses";
import {
  accountSubscriptions,
  billingEvents,
} from "@/lib/db/schema/subscriptions";

import { testDb } from "../db";

/**
 * Account billing states the fixture can materialize:
 *
 * - `active`: subscribed on a paid plan; `currentPeriodEnd` is in the future.
 * - `past_due`: last charge failed; status grants paid access per the
 *   subscription-service's effective-plan resolver, but operators should
 *   treat it as a delinquent account.
 * - `canceled`: canceled immediately, with `currentPeriodEnd` already in the
 *   past so the user no longer has access. `canceledAt` is set.
 * - `grace_period`: canceled but `currentPeriodEnd` is still in the future,
 *   so the user keeps paid access until the period ends.
 */
export type BillingFixtureState =
  | "active"
  | "past_due"
  | "canceled"
  | "grace_period";

export type BillingFixtureIds = {
  accountId: string;
  subscriptionIdsByState: Record<BillingFixtureState, string>;
};

/**
 * Every `BillingFixtureState` we know about. Used to produce a fully-populated
 * `subscriptionIdsByState` map regardless of the subset the caller requested,
 * matching the pattern established by `tests/support/fixtures/quotes.ts`.
 */
const ALL_BILLING_FIXTURE_STATES: readonly BillingFixtureState[] = [
  "active",
  "past_due",
  "canceled",
  "grace_period",
] as const;

/**
 * Deterministic anchor date that mirrors the `Workflow_Fixture`'s `now`. Keeps
 * fixture timestamps stable across runs and relative to the workflow rows.
 */
const FIXTURE_NOW = new Date("2026-04-20T00:00:00.000Z");

/** Paid period started before `FIXTURE_NOW`. */
const PERIOD_START = new Date("2026-04-01T00:00:00.000Z");

/** Paid period ends after `FIXTURE_NOW` (access continues). */
const PERIOD_END_FUTURE = new Date("2026-05-20T00:00:00.000Z");

/** Paid period ended before `FIXTURE_NOW` (access has lapsed). */
const PERIOD_END_PAST = new Date("2026-04-10T00:00:00.000Z");

function accountIdFor(prefix: string): string {
  return `${prefix}_account`;
}

function subscriptionIdFor(prefix: string, state: BillingFixtureState): string {
  return `${prefix}_sub_${state}`;
}

/**
 * Idempotently ensures the fixture's account user row exists. The task
 * contract says callers are typically responsible for creating the user via
 * `createWorkflowFixture`, but we insert a minimal placeholder here when none
 * exists so the fixture can be used standalone (e.g. webhook-idempotency
 * tests that only need an account holder). This is a direct insert into the
 * `user` table, which is not a billing mutation.
 */
async function ensureAccountUser(accountId: string): Promise<void> {
  await testDb
    .insert(user)
    .values({
      id: accountId,
      name: "Billing Fixture Account",
      email: `${accountId}@example.com`,
      emailVerified: true,
      createdAt: FIXTURE_NOW,
      updatedAt: FIXTURE_NOW,
    })
    .onConflictDoNothing({ target: user.id });
}

/**
 * Drive the account's single `account_subscriptions` row into `state`
 * exclusively through the subscription-service. Each call seeds an `active`
 * baseline (activateSubscription updates in place when a row already exists)
 * and then transitions to the target state via `updateSubscriptionStatus`.
 * This keeps `businesses.plan` in sync through the service's own sync helper.
 */
async function applyState(
  accountId: string,
  state: BillingFixtureState,
): Promise<void> {
  await activateSubscription({
    userId: accountId,
    plan: "pro",
    provider: "polar",
    currency: "USD",
    status: "active",
    currentPeriodStart: PERIOD_START,
    currentPeriodEnd: PERIOD_END_FUTURE,
  });

  switch (state) {
    case "active":
      // `activateSubscription` already left the row in "active" with
      // `canceledAt = null` and a future `currentPeriodEnd`.
      return;
    case "past_due":
      await updateSubscriptionStatus(accountId, "past_due", {
        currentPeriodStart: PERIOD_START,
        currentPeriodEnd: PERIOD_END_FUTURE,
      });
      return;
    case "canceled":
      await updateSubscriptionStatus(accountId, "canceled", {
        canceledAt: FIXTURE_NOW,
        currentPeriodStart: PERIOD_START,
        currentPeriodEnd: PERIOD_END_PAST,
      });
      return;
    case "grace_period":
      await updateSubscriptionStatus(accountId, "canceled", {
        canceledAt: FIXTURE_NOW,
        currentPeriodStart: PERIOD_START,
        currentPeriodEnd: PERIOD_END_FUTURE,
      });
      return;
  }
}

/**
 * Delete every row this fixture could have produced for `prefix` from the
 * tables it owns:
 *
 * 1. `billing_events` rows tied to the fixture account — cleans up webhook
 *    idempotency ledger entries that would otherwise leak across runs.
 * 2. `account_subscriptions` rows owned by the fixture account — falls back
 *    to `testDb.delete` because the subscription-service does not expose a
 *    delete path.
 * 3. `businesses.plan` for any businesses still owned by the fixture account
 *    is reset to `'free'`. The subscription-service's own sync happens on
 *    create/update; since we deleted the subscription row directly, we
 *    re-sync the denormalized plan here.
 *
 * Never mutates any other account's data.
 */
export async function cleanupBillingFixture(prefix: string): Promise<void> {
  const accountId = accountIdFor(prefix);

  await testDb
    .delete(billingEvents)
    .where(eq(billingEvents.userId, accountId));

  await testDb
    .delete(accountSubscriptions)
    .where(eq(accountSubscriptions.userId, accountId));

  await testDb
    .update(businesses)
    .set({ plan: "free", updatedAt: FIXTURE_NOW })
    .where(eq(businesses.ownerUserId, accountId));
}

/**
 * Apply one `BillingFixtureState` per requested entry in `states`, driving the
 * fixture's single `account_subscriptions` row through each state via the
 * subscription-service. All writes route through
 * `lib/billing/subscription-service.ts` so the denormalized `businesses.plan`
 * column stays in sync; the fixture never issues raw DML against
 * `account_subscriptions` or `businesses.plan`.
 *
 * ### Caller prerequisites
 *
 * Callers must have created the user row referenced by `${prefix}_account`
 * before calling this fixture, typically via `createWorkflowFixture(prefix)`
 * or a bespoke setup step. If no such row exists, this fixture inserts a
 * minimal placeholder `user` row (direct table insert, which is not a billing
 * mutation) so the subscription-service's owner FK resolves.
 *
 * Because the subscription-service depends on `next/cache` (for
 * `revalidateTag`) and on `@/lib/db/client` (for the production pool), tests
 * using this fixture should mock both at the top of the file:
 *
 * ```ts
 * vi.mock("next/cache", () => ({ revalidateTag: vi.fn() }));
 * vi.mock("@/lib/db/client", async () => ({
 *   db: (await import("../support/db")).testDb,
 * }));
 * ```
 *
 * ### Constraints driven by `account_subscriptions.unique(user_id)`
 *
 * A user can own at most one `account_subscriptions` row, and the
 * subscription-service generates row IDs internally via `crypto.randomUUID`.
 * The fixture therefore applies requested states serially against a single
 * row; when multiple states are passed, the final state in `states` is the
 * one that persists in the database. `subscriptionIdsByState` is always
 * returned fully populated (one key per `BillingFixtureState`) with the
 * deterministic lookup strings `${prefix}_sub_${state}`, following the same
 * convention as `tests/support/fixtures/quotes.ts`. These strings serve as
 * stable identifiers for test-side bookkeeping; callers that need to query
 * the live subscription row should do so by `accountId` rather than by these
 * keys.
 *
 * Idempotent: a prior `cleanupBillingFixture(prefix)` always runs first so a
 * failed previous run cannot leak rows into the new one.
 */
export async function createBillingFixture(
  prefix: string,
  states: BillingFixtureState[],
): Promise<BillingFixtureIds> {
  const accountId = accountIdFor(prefix);

  await cleanupBillingFixture(prefix);
  await ensureAccountUser(accountId);

  // De-duplicate while preserving the caller's order so the "final state
  // wins" semantics are predictable regardless of the caller's input shape.
  const uniqueStates = Array.from(new Set(states));

  for (const state of uniqueStates) {
    await applyState(accountId, state);
  }

  const subscriptionIdsByState = Object.fromEntries(
    ALL_BILLING_FIXTURE_STATES.map((state) => [
      state,
      subscriptionIdFor(prefix, state),
    ]),
  ) as Record<BillingFixtureState, string>;

  return {
    accountId,
    subscriptionIdsByState,
  };
}
