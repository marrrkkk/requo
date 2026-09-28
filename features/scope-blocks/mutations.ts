import "server-only";

import { and, eq } from "drizzle-orm";

import { writeAuditLog } from "@/features/audit/mutations";
import { getActiveRecipeForBusiness } from "@/features/businesses/pack-recipes";
import {
  isScopeBlockContentComplete,
  isScopeBlockKind,
  validateScopeBlockContent,
} from "@/features/scope-blocks/schemas";
import type { BusinessMemberRole } from "@/lib/business-members";
import { canManageOperationalBusinessSettings } from "@/lib/business-members";
import { db } from "@/lib/db/client";
import {
  quoteScopeBlocks,
  quotes,
  type ScopeBlockKind,
  type ScopeBlockState,
} from "@/lib/db/schema";
import { newEntityId } from "@/lib/ids";

type DatabaseTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

function requiredKindsFromRecipe(config: Record<string, unknown>) {
  const raw = config["requiredKinds"];
  if (!Array.isArray(raw)) return new Set<ScopeBlockKind>();
  return new Set(raw.filter(isScopeBlockKind));
}

/**
 * Upsert a scope block on a draft quote. Requiredness is stamped from the
 * active scope recipe at write time so later recipe changes cannot
 * retroactively alter the record. Only draft quotes carry editable blocks.
 */
export async function upsertScopeBlockForQuote(input: {
  businessId: string;
  quoteId: string;
  kind: ScopeBlockKind;
  content: unknown;
  actorUserId: string;
  now?: Date;
}) {
  if (!isScopeBlockKind(input.kind)) {
    throw new Error("Unknown scope block kind.");
  }

  const content = validateScopeBlockContent(input.kind, input.content);
  const now = input.now ?? new Date();

  return db.transaction(async (tx) => {
    const [quote] = await tx
      .select({ id: quotes.id, status: quotes.status, businessId: quotes.businessId })
      .from(quotes)
      .where(and(eq(quotes.id, input.quoteId), eq(quotes.businessId, input.businessId)))
      .limit(1);

    if (!quote) {
      throw new Error("Quote not found.");
    }

    if (quote.status !== "draft") {
      throw new Error("Scope blocks can only change on draft quotes.");
    }

    const [existing] = await tx
      .select()
      .from(quoteScopeBlocks)
      .where(
        and(
          eq(quoteScopeBlocks.businessId, input.businessId),
          eq(quoteScopeBlocks.quoteId, input.quoteId),
          eq(quoteScopeBlocks.kind, input.kind),
        ),
      )
      .limit(1);

    // Requiredness pinned from the active recipe at write time.
    const { getPackAssignmentForBusiness } = await import(
      "@/features/businesses/pack-assignments"
    );
    const assignment = await getPackAssignmentForBusiness(input.businessId);
    const recipe = await getActiveRecipeForBusiness(input.businessId, "scope", assignment?.pack ?? null);
    const required = requiredKindsFromRecipe(recipe.config).has(input.kind);
    const complete = isScopeBlockContentComplete(input.kind, content);
    const state: ScopeBlockState = complete ? "complete" : "incomplete";

    if (existing) {
      if (existing.state === "waived") {
        throw new Error("A waived block cannot be edited; un-waiving is not supported.");
      }

      const [updated] = await tx
        .update(quoteScopeBlocks)
        .set({ content, required, state, updatedAt: now })
        .where(eq(quoteScopeBlocks.id, existing.id))
        .returning();

      await writeAuditLog(tx, {
        businessId: input.businessId,
        actorUserId: input.actorUserId,
        entityType: "quote",
        entityId: input.quoteId,
        action: "quote.updated",
        metadata: { scopeBlockKind: input.kind, scopeBlockState: state },
        createdAt: now,
      });

      return updated;
    }

    const siblings = await tx
      .select({ position: quoteScopeBlocks.position })
      .from(quoteScopeBlocks)
      .where(
        and(
          eq(quoteScopeBlocks.businessId, input.businessId),
          eq(quoteScopeBlocks.quoteId, input.quoteId),
        ),
      );

    const position = siblings.length === 0 ? 0 : Math.max(...siblings.map((row) => row.position)) + 1;

    const [inserted] = await tx
      .insert(quoteScopeBlocks)
      .values({
        id: newEntityId(),
        businessId: input.businessId,
        quoteId: input.quoteId,
        kind: input.kind,
        position,
        content,
        required,
        state,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    await writeAuditLog(tx, {
      businessId: input.businessId,
      actorUserId: input.actorUserId,
      entityType: "quote",
      entityId: input.quoteId,
      action: "quote.updated",
      metadata: { scopeBlockKind: input.kind, scopeBlockState: state },
      createdAt: now,
    });

    return inserted;
  });
}

/**
 * Waive a required block: manager-or-above, audit-logged with actor/reason,
 * pinned at acceptance via the block row. Supersession, never un-waiving.
 */
export async function waiveScopeBlockForQuote(input: {
  businessId: string;
  blockId: string;
  reason: string;
  actorUserId: string;
  actorRole: BusinessMemberRole;
  actorName?: string | null;
  actorEmail?: string | null;
  now?: Date;
}) {
  if (!canManageOperationalBusinessSettings(input.actorRole)) {
    throw new Error("Only an owner or manager can waive a required scope section.");
  }

  if (!input.reason.trim()) {
    throw new Error("A waiver reason is required.");
  }

  const now = input.now ?? new Date();

  return db.transaction(async (tx) => {
    const [block] = await tx
      .select()
      .from(quoteScopeBlocks)
      .where(
        and(
          eq(quoteScopeBlocks.id, input.blockId),
          eq(quoteScopeBlocks.businessId, input.businessId),
        ),
      )
      .limit(1);

    if (!block) {
      throw new Error("Scope block not found.");
    }

    if (block.state === "waived") {
      return block;
    }

    // Waivers pin at acceptance: no waiving once the commercial record is
    // decided or dead.
    const [parentQuote] = await tx
      .select({ status: quotes.status })
      .from(quotes)
      .where(and(eq(quotes.id, block.quoteId), eq(quotes.businessId, input.businessId)))
      .limit(1);

    if (!parentQuote || ["accepted", "rejected", "expired", "voided"].includes(parentQuote.status)) {
      throw new Error("Scope sections cannot be waived after the quote is decided.");
    }

    const [updated] = await tx
      .update(quoteScopeBlocks)
      .set({
        state: "waived",
        waiverActorUserId: input.actorUserId,
        waivedAt: now,
        waiverReason: input.reason.trim().slice(0, 500),
        updatedAt: now,
      })
      .where(eq(quoteScopeBlocks.id, block.id))
      .returning();

    await writeAuditLog(tx, {
      businessId: input.businessId,
      actorUserId: input.actorUserId,
      actorName: input.actorName,
      actorEmail: input.actorEmail,
      entityType: "quote",
      entityId: block.quoteId,
      action: "quote.scope_waived",
      metadata: {
        scopeBlockKind: block.kind,
        waiverReason: input.reason.trim().slice(0, 500),
      },
      createdAt: now,
    });

    return updated;
  });
}

export type { DatabaseTransaction };
