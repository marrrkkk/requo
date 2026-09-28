import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { eq, like } from "drizzle-orm";

vi.mock("@/lib/db/client", async () => {
  const { testDb: mockedDb } = await import("../support/db");

  return { db: mockedDb };
});

vi.mock("next/cache", () => ({
  revalidateTag: vi.fn(),
}));

import { createBusinessForUser } from "@/features/businesses/mutations";
import { createQuoteForBusiness, markQuoteSentForBusiness } from "@/features/quotes/mutations";
import {
  upsertScopeBlockForQuote,
  waiveScopeBlockForQuote,
} from "@/features/scope-blocks/mutations";
import { evaluateScopeSendGate } from "@/features/scope-blocks/queries";
import type { QuoteEditorInput } from "@/features/quotes/schemas";
import {
  auditLogs,
  businessMembers,
  businessPackAssignmentHistory,
  businessPackAssignments,
  businesses,
  packRecipes,
  profiles,
  quoteScopeBlocks,
  quoteVersions,
  user,
} from "@/lib/db/schema";

import { closeTestDb, testDb } from "@/tests/support/db";

const prefix = "test_scope_blocks";
const now = new Date("2026-05-07T00:00:00.000Z");

function slug(value: string) {
  return value.replace(/_/g, "-");
}

function quoteInput(): QuoteEditorInput {
  return {
    title: "Kitchen remodel",
    customerName: "Dana Lee",
    customerEmail: "dana@example.com",
    customerContactMethod: "email",
    customerContactHandle: "dana@example.com",
    validUntil: "2099-12-31",
    discountInCents: 0,
    taxInCents: 0,
    items: [{ id: "line-1", description: "Cabinets", quantity: 1, unitPriceInCents: 20000 }],
  };
}

async function cleanup() {
  await testDb.delete(quoteVersions).where(like(quoteVersions.businessId, `${prefix}%`));
  await testDb.delete(quoteScopeBlocks).where(like(quoteScopeBlocks.businessId, `${prefix}%`));
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
    name: "Scope Owner",
    email: `${userId}@example.com`,
    emailVerified: true,
    createdAt: now,
    updatedAt: now,
  });

  await createBusinessForUser({
    user: { id: userId, name: "Scope Owner", email: `${userId}@example.com` },
    businessId: slug(name),
    defaultCurrency: "USD",
    name,
    businessType: "contractor_home_improvement",
    plan: "free",
  });

  const created = await createQuoteForBusiness({
    businessId: slug(name),
    actorUserId: userId,
    currency: "USD",
    quote: quoteInput(),
  });

  return { userId, businessId: slug(name), quoteId: created!.id };
}

describe("scope blocks", () => {
  beforeEach(async () => {
    await cleanup();
  }, 30_000);

  afterAll(async () => {
    await cleanup();
    await closeTestDb();
  }, 30_000);

  it("upserts typed blocks and gates sending on incomplete required ones", async () => {
    const { businessId, quoteId } = await setupBusiness("g1");

    // Exclusions are required by the contractors recipe; deliverables are optional.
    const exclusions = await upsertScopeBlockForQuote({
      businessId,
      quoteId,
      kind: "exclusions",
      content: { items: [] },
      actorUserId: `${prefix}_owner_g1`,
    });

    expect(exclusions.required).toBe(true);
    expect(exclusions.state).toBe("incomplete");

    // Invalid content rejected.
    await expect(
      upsertScopeBlockForQuote({
        businessId,
        quoteId,
        kind: "allowances",
        content: { items: [{ label: "Tile" }] },
        actorUserId: `${prefix}_owner_g1`,
      }),
    ).rejects.toThrow();

    const gate = await evaluateScopeSendGate({ businessId, quoteId });
    expect(gate.ok).toBe(false);
    expect(gate.blocking.some((entry) => entry.kind === "exclusions")).toBe(true);

    const sent = await markQuoteSentForBusiness({
      businessId,
      quoteId,
      actorUserId: `${prefix}_owner_g1`,
      sendMethod: "manual",
    });

    expect(sent).toMatchObject({ changed: false, blocked: true });

    // Complete all recipe-required kinds; send proceeds.
    await upsertScopeBlockForQuote({
      businessId,
      quoteId,
      kind: "exclusions",
      content: { items: [{ label: "Permits" }] },
      actorUserId: `${prefix}_owner_g1`,
    });
    await upsertScopeBlockForQuote({
      businessId,
      quoteId,
      kind: "allowances",
      content: { items: [{ label: "Tile", amountCents: 10000 }] },
      actorUserId: `${prefix}_owner_g1`,
    });
    await upsertScopeBlockForQuote({
      businessId,
      quoteId,
      kind: "assumptions",
      content: { items: [{ label: "Access provided" }] },
      actorUserId: `${prefix}_owner_g1`,
    });

    const sentAfter = await markQuoteSentForBusiness({
      businessId,
      quoteId,
      actorUserId: `${prefix}_owner_g1`,
      sendMethod: "manual",
    });

    expect(sentAfter?.changed).toBe(true);
  }, 30_000);

  it("waives with manager+ audit trail and hides from the gate", async () => {
    const { userId, businessId, quoteId } = await setupBusiness("g2");

    const block = await upsertScopeBlockForQuote({
      businessId,
      quoteId,
      kind: "allowances",
      content: { items: [] },
      actorUserId: userId,
    });

    expect(block.required).toBe(true);

    await expect(
      waiveScopeBlockForQuote({
        businessId,
        blockId: block.id,
        reason: "Not applicable",
        actorUserId: userId,
        actorRole: "staff",
      }),
    ).rejects.toThrow("owner or manager");

    const waived = await waiveScopeBlockForQuote({
      businessId,
      blockId: block.id,
      reason: "Fixed-price job",
      actorUserId: userId,
      actorRole: "manager",
    });

    expect(waived.state).toBe("waived");
    expect(waived.waiverReason).toBe("Fixed-price job");

    const gate = await evaluateScopeSendGate({ businessId, quoteId });
    expect(gate.blocking.find((entry) => entry.blockId === block.id)).toBeUndefined();

    const audits = await testDb
      .select({ action: auditLogs.action })
      .from(auditLogs)
      .where(eq(auditLogs.businessId, businessId));

    expect(audits.map((row) => row.action)).toContain("quote.scope_waived");
  }, 30_000);

  it("snapshots blocks into quote versions on revise", async () => {
    const { userId, businessId, quoteId } = await setupBusiness("g3");

    await upsertScopeBlockForQuote({
      businessId,
      quoteId,
      kind: "deliverables",
      content: { items: [{ label: "Cabinets installed" }] },
      actorUserId: userId,
    });

    for (const [kind, content] of [
      ["exclusions", { items: [{ label: "Permits" }] }],
      ["allowances", { items: [{ label: "Tile", amountCents: 10000 }] }],
      ["assumptions", { items: [{ label: "Access provided" }] }],
    ] as const) {
      await upsertScopeBlockForQuote({
        businessId,
        quoteId,
        kind,
        content,
        actorUserId: userId,
      });
    }

    const sent = await markQuoteSentForBusiness({
      businessId,
      quoteId,
      actorUserId: userId,
      sendMethod: "manual",
    });

    expect(sent?.changed).toBe(true);

    const { archiveQuoteVersionAndRevise } = await import("@/features/quotes/mutations");
    await archiveQuoteVersionAndRevise({ businessId, quoteId, actorUserId: userId });

    const [version] = await testDb
      .select({ scopeBlocks: quoteVersions.scopeBlocks })
      .from(quoteVersions)
      .where(eq(quoteVersions.quoteId, quoteId));

    expect(version?.scopeBlocks).toHaveLength(4);
    expect(version?.scopeBlocks?.find((block) => block.kind === "deliverables")).toMatchObject({ state: "complete" });
  }, 30_000);
});
