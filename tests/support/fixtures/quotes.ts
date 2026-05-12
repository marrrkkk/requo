import { inArray } from "drizzle-orm";

import { quoteItems, quotes } from "@/lib/db/schema";

import { testDb } from "../db";
import type { WorkflowFixtureIds } from "./workflow";

export type QuoteFixtureState =
  | "draft"
  | "sent"
  | "viewed"
  | "accepted"
  | "rejected"
  | "expired"
  | "voided";

export type QuoteFixtureIds = {
  quoteIdsByState: Record<QuoteFixtureState, string>;
  publicTokensByState: Record<QuoteFixtureState, string>;
};

/**
 * Every `QuoteFixtureState` we know about. Used both for construction and for
 * deterministic cleanup — we always delete the full set of possible ids, even
 * when a caller only requested a subset, so residue does not leak between
 * test runs.
 */
const ALL_QUOTE_FIXTURE_STATES: readonly QuoteFixtureState[] = [
  "draft",
  "sent",
  "viewed",
  "accepted",
  "rejected",
  "expired",
  "voided",
] as const;

/**
 * Deterministic anchor date that mirrors the `Workflow_Fixture`'s `now`. Keeps
 * fixture timestamps stable across runs and relative to the workflow rows.
 */
const FIXTURE_NOW = new Date("2026-04-20T00:00:00.000Z");

/**
 * Sentinel dates used to exercise the `validUntil` column for expired vs.
 * non-expired fixtures. These are plain `YYYY-MM-DD` strings because the
 * column is a `date` in `mode: "string"`.
 */
const FUTURE_VALID_UNTIL = "2026-05-31";
const PAST_VALID_UNTIL = "2026-04-10";

/**
 * Each fixture quote has exactly one line item at position 0. Total stays
 * consistent with the `quotes_totals_valid` check: total = subtotal - discount.
 */
const LINE_ITEM_UNIT_PRICE_IN_CENTS = 10_000;

function quoteIdFor(prefix: string, state: QuoteFixtureState): string {
  return `${prefix}_quote_${state}`;
}

function publicTokenFor(prefix: string, state: QuoteFixtureState): string {
  return `${prefix}_token_${state}`;
}

function publicTokenHashFor(prefix: string, state: QuoteFixtureState): string {
  return `${prefix}_token_hash_${state}`;
}

function quoteItemIdFor(
  prefix: string,
  state: QuoteFixtureState,
  index: number,
): string {
  return `${prefix}_quote_item_${state}_${index}`;
}

function quoteNumberFor(prefix: string, state: QuoteFixtureState): string {
  return `Q-${prefix}-${state}`;
}

function buildQuoteRow(
  prefix: string,
  state: QuoteFixtureState,
  workflow: WorkflowFixtureIds,
): typeof quotes.$inferInsert {
  const base: typeof quotes.$inferInsert = {
    id: quoteIdFor(prefix, state),
    businessId: workflow.businessId,
    inquiryId: workflow.inquiryId,
    status: "draft",
    quoteNumber: quoteNumberFor(prefix, state),
    publicToken: publicTokenFor(prefix, state),
    publicTokenHash: publicTokenHashFor(prefix, state),
    title: `Fixture quote (${state})`,
    customerName: "Fixture Customer",
    customerEmail: "fixture@example.com",
    customerContactMethod: "email",
    customerContactHandle: "fixture@example.com",
    currency: "USD",
    subtotalInCents: LINE_ITEM_UNIT_PRICE_IN_CENTS,
    discountInCents: 0,
    totalInCents: LINE_ITEM_UNIT_PRICE_IN_CENTS,
    validUntil: FUTURE_VALID_UNTIL,
    createdAt: FIXTURE_NOW,
    updatedAt: FIXTURE_NOW,
  };

  switch (state) {
    case "draft":
      return base;
    case "sent":
      return {
        ...base,
        status: "sent",
        sentAt: FIXTURE_NOW,
      };
    case "viewed":
      // "viewed" is not a DB enum value; it represents a sent quote that the
      // customer has opened. Preserve status="sent" and stamp publicViewedAt.
      return {
        ...base,
        status: "sent",
        sentAt: FIXTURE_NOW,
        publicViewedAt: FIXTURE_NOW,
      };
    case "accepted":
      return {
        ...base,
        status: "accepted",
        sentAt: FIXTURE_NOW,
        publicViewedAt: FIXTURE_NOW,
        acceptedAt: FIXTURE_NOW,
        customerRespondedAt: FIXTURE_NOW,
      };
    case "rejected":
      return {
        ...base,
        status: "rejected",
        sentAt: FIXTURE_NOW,
        publicViewedAt: FIXTURE_NOW,
        customerRespondedAt: FIXTURE_NOW,
      };
    case "expired":
      return {
        ...base,
        status: "expired",
        sentAt: FIXTURE_NOW,
        validUntil: PAST_VALID_UNTIL,
      };
    case "voided":
      return {
        ...base,
        status: "voided",
        sentAt: FIXTURE_NOW,
        voidedAt: FIXTURE_NOW,
        voidedBy: workflow.ownerUserId,
      };
  }
}

function buildQuoteItemRow(
  prefix: string,
  state: QuoteFixtureState,
  workflow: WorkflowFixtureIds,
): typeof quoteItems.$inferInsert {
  return {
    id: quoteItemIdFor(prefix, state, 0),
    businessId: workflow.businessId,
    quoteId: quoteIdFor(prefix, state),
    description: `Fixture line item (${state})`,
    quantity: 1,
    unitPriceInCents: LINE_ITEM_UNIT_PRICE_IN_CENTS,
    lineTotalInCents: LINE_ITEM_UNIT_PRICE_IN_CENTS,
    position: 0,
    createdAt: FIXTURE_NOW,
    updatedAt: FIXTURE_NOW,
  };
}

/**
 * Delete every quote and quote item row this fixture could have produced for
 * `prefix`, regardless of which states a caller previously requested. Quote
 * items are removed first to satisfy the FK from `quote_items.quote_id` into
 * `quotes.id`.
 */
export async function cleanupQuoteFixture(prefix: string): Promise<void> {
  const allQuoteIds = ALL_QUOTE_FIXTURE_STATES.map((state) =>
    quoteIdFor(prefix, state),
  );
  const allQuoteItemIds = ALL_QUOTE_FIXTURE_STATES.map((state) =>
    quoteItemIdFor(prefix, state, 0),
  );

  await testDb
    .delete(quoteItems)
    .where(inArray(quoteItems.id, allQuoteItemIds));
  await testDb.delete(quotes).where(inArray(quotes.id, allQuoteIds));
}

/**
 * Insert one quote (and one line item) per requested `QuoteFixtureState`,
 * attached to the primary business and primary inquiry from the supplied
 * `Workflow_Fixture`. Callers always get back the full lookup maps for every
 * state so tests can share a stable `QuoteFixtureIds` shape regardless of the
 * subset requested.
 *
 * Idempotent: a prior `cleanupQuoteFixture(prefix)` always runs first so a
 * failed previous run cannot leak rows into the new one.
 */
export async function createQuoteFixture(
  prefix: string,
  states: QuoteFixtureState[],
  workflow: WorkflowFixtureIds,
): Promise<QuoteFixtureIds> {
  await cleanupQuoteFixture(prefix);

  // De-duplicate while preserving the caller's order so repeat states do not
  // cause primary-key collisions on insert.
  const uniqueStates = Array.from(new Set(states));

  if (uniqueStates.length > 0) {
    const quoteRows = uniqueStates.map((state) =>
      buildQuoteRow(prefix, state, workflow),
    );
    const quoteItemRows = uniqueStates.map((state) =>
      buildQuoteItemRow(prefix, state, workflow),
    );

    await testDb.insert(quotes).values(quoteRows);
    await testDb.insert(quoteItems).values(quoteItemRows);
  }

  const quoteIdsByState = Object.fromEntries(
    ALL_QUOTE_FIXTURE_STATES.map((state) => [state, quoteIdFor(prefix, state)]),
  ) as Record<QuoteFixtureState, string>;

  const publicTokensByState = Object.fromEntries(
    ALL_QUOTE_FIXTURE_STATES.map((state) => [
      state,
      publicTokenFor(prefix, state),
    ]),
  ) as Record<QuoteFixtureState, string>;

  return {
    quoteIdsByState,
    publicTokensByState,
  };
}
