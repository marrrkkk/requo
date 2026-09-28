import "server-only";

import { and, asc, eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import {
  quoteScopeBlocks,
  type QuoteScopeBlock,
  type ScopeBlockKind,
} from "@/lib/db/schema";

export async function listScopeBlocksForQuote(input: {
  businessId: string;
  quoteId: string;
}): Promise<QuoteScopeBlock[]> {
  return db
    .select()
    .from(quoteScopeBlocks)
    .where(
      and(
        eq(quoteScopeBlocks.businessId, input.businessId),
        eq(quoteScopeBlocks.quoteId, input.quoteId),
      ),
    )
    .orderBy(asc(quoteScopeBlocks.position));
}

export type ScopeSendBlocker = {
  blockId: string;
  kind: ScopeBlockKind;
  reason: string;
};

export type ScopeSendGate = {
  ok: boolean;
  blocking: ScopeSendBlocker[];
};

/**
 * P3 send gate: incomplete required blocks hard-block sending with a
 * specific message — including required kinds with no block row at all (a
 * missing required section is incomplete). Optional and waived blocks never
 * block. Legacy/unpacked quotes without required kinds pass (NULL-tolerant).
 */
export async function evaluateScopeSendGate(input: {
  businessId: string;
  quoteId: string;
}): Promise<ScopeSendGate> {
  const blocks = await listScopeBlocksForQuote(input);
  const blocking: ScopeSendBlocker[] = [];

  for (const block of blocks) {
    if (!block.required) continue;
    if (block.state !== "incomplete") continue;

    blocking.push({
      blockId: block.id,
      kind: block.kind,
      reason: `Required scope section "${block.kind}" is incomplete. Complete it or waive it with manager approval before sending.`,
    });
  }

  // Required kinds declared by the active scope recipe but never added.
  const { getPackAssignmentForBusiness } = await import(
    "@/features/businesses/pack-assignments"
  );
  const { getActiveRecipeForBusiness } = await import(
    "@/features/businesses/pack-recipes"
  );
  const { isScopeBlockKind } = await import("@/features/scope-blocks/schemas");

  const assignment = await getPackAssignmentForBusiness(input.businessId);
  const recipe = await getActiveRecipeForBusiness(input.businessId, "scope", assignment?.pack ?? null);
  const requiredKinds = Array.isArray((recipe.config as Record<string, unknown>)["requiredKinds"])
    ? ((recipe.config as Record<string, unknown>)["requiredKinds"] as unknown[]).filter(isScopeBlockKind)
    : [];

  const presentKinds = new Set(blocks.map((block) => block.kind));

  for (const kind of requiredKinds) {
    if (presentKinds.has(kind)) continue;

    blocking.push({
      blockId: "",
      kind,
      reason: `Required scope section "${kind}" is missing. Add it or waive it with manager approval before sending.`,
    });
  }

  return { ok: blocking.length === 0, blocking };
}
