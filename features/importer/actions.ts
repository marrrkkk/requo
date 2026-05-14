"use server";

import { updateTag } from "next/cache";

import {
  getBusinessMemoryCacheTags,
  getBusinessPricingCacheTags,
  uniqueCacheTags,
} from "@/lib/cache/business-tags";
import { getOperationalBusinessActionContext } from "@/lib/db/business-access";
import { getUsageLimit, hasFeatureAccess } from "@/lib/plans";
import { assertPublicActionRateLimit } from "@/lib/public-action-rate-limit";
import { aiExtractFromFile } from "@/features/importer/ai-extractor";
import { extractFile } from "@/features/importer/extractors";
import {
  importerCommitKnowledgeSchema,
  importerCommitPricingSchema,
} from "@/features/importer/schemas";
import type {
  ImporterAnalyzeResult,
  ImporterCommitResult,
  ImporterPlanContext,
} from "@/features/importer/types";
import {
  importerAcceptedExtensions,
  importerAcceptedMimeTypes,
  importerMaxFileBytes,
} from "@/features/importer/types";
import { createMemoryForBusiness, getMemoryCountForBusiness } from "@/features/memory/mutations";
import { getQuoteLibrarySummaryForBusiness } from "@/features/quotes/quote-library-queries";
import { createQuoteLibraryEntryForBusiness } from "@/features/quotes/quote-library-mutations";

const RATE_LIMIT = { action: "ai-file-import" as const, limit: 5, windowMs: 60_000 };

function updateCacheTags(tags: string[]) {
  for (const tag of uniqueCacheTags(tags)) {
    updateTag(tag);
  }
}

function buildPlanContext({
  existingCount,
  limit,
}: {
  existingCount: number;
  limit: number | null;
}): ImporterPlanContext {
  const remainingSlots =
    limit === null ? null : Math.max(0, limit - existingCount);

  return { existingCount, limit, remainingSlots };
}

function isAcceptedFile(file: File): boolean {
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();

  return (
    (importerAcceptedMimeTypes as readonly string[]).includes(type) ||
    (importerAcceptedExtensions as readonly string[]).some((ext) =>
      name.endsWith(ext),
    )
  );
}

/**
 * Accepts a file and a destination, runs the AI extractor, and returns
 * structured candidates for the client to review. Nothing is saved here.
 */
export async function analyzeImportAction(
  destination: "knowledge" | "pricing",
  formData: FormData,
): Promise<ImporterAnalyzeResult> {
  const ownerAccess = await getOperationalBusinessActionContext();

  if (!ownerAccess.ok) {
    return { ok: false, error: ownerAccess.error };
  }

  const { user, businessContext } = ownerAccess;
  const plan = businessContext.business.plan;

  if (!hasFeatureAccess(plan, "aiAssistant")) {
    return {
      ok: false,
      error: "Upgrade to Pro to analyze files with AI.",
    };
  }

  const gateFeature = destination === "knowledge" ? "knowledgeBase" : "quoteLibrary";

  if (!hasFeatureAccess(plan, gateFeature)) {
    return {
      ok: false,
      error:
        destination === "knowledge"
          ? "Upgrade to Pro to import knowledge from files."
          : "Upgrade to Pro to import pricing from files.",
    };
  }

  const allowed = await assertPublicActionRateLimit({
    action: RATE_LIMIT.action,
    scope: `${businessContext.business.id}:${user.id}`,
    limit: RATE_LIMIT.limit,
    windowMs: RATE_LIMIT.windowMs,
  });

  if (!allowed) {
    return {
      ok: false,
      error: "Too many imports in the last minute. Please wait before trying again.",
    };
  }

  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Choose a file to import." };
  }

  if (file.size > importerMaxFileBytes) {
    return {
      ok: false,
      error: `Files must be under ${Math.round(importerMaxFileBytes / (1024 * 1024))} MB.`,
    };
  }

  if (!isAcceptedFile(file)) {
    return {
      ok: false,
      error: "Unsupported file type. Upload a PDF, CSV, TXT, or Markdown file.",
    };
  }

  let payload: Awaited<ReturnType<typeof extractFile>>;

  try {
    const bytes = Buffer.from(await file.arrayBuffer());

    payload = await extractFile({
      fileName: file.name,
      mimeType: file.type,
      bytes,
    });
  } catch (error) {
    console.warn("[importer] extractFile failed", error);
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "We couldn't read that file. Try a different format.",
    };
  }

  const aiResult = await aiExtractFromFile({ destination, payload });

  if (!aiResult.ok) {
    return { ok: false, error: aiResult.error };
  }

  // Tell the user when the document was too big and we had to crop it.
  if (payload.kind === "text" && payload.truncated) {
    aiResult.warnings.unshift(
      "The file was larger than we can analyze at once. Only the beginning and end were processed — some middle sections may be missing. Split the file into smaller sections for best results.",
    );
  }

  // Fetch existing count + plan limit so the review UI can show what fits.
  const limitKey =
    destination === "knowledge" ? "memoriesPerBusiness" : "pricingEntriesPerBusiness";
  const limit = getUsageLimit(plan, limitKey);
  const existingCount =
    destination === "knowledge"
      ? await getMemoryCountForBusiness(businessContext.business.id)
      : (await getQuoteLibrarySummaryForBusiness(businessContext.business.id)).entryCount;
  const planContext = buildPlanContext({ existingCount, limit });

  if (aiResult.destination === "knowledge") {
    return {
      ok: true,
      destination: "knowledge",
      sourceName: file.name,
      items: aiResult.items,
      warnings: aiResult.warnings,
      planContext,
    };
  }

  return {
    ok: true,
    destination: "pricing",
    sourceName: file.name,
    entries: aiResult.entries,
    warnings: aiResult.warnings,
    planContext,
  };
}

/**
 * Commits selected knowledge items from a reviewed import. The input is the
 * user's edited/confirmed list, not the raw AI output. Each item is created
 * through the same mutation as manual knowledge creation so plan limits,
 * activity logging, and caching stay consistent.
 */
export async function commitKnowledgeImportAction(
  payload: unknown,
): Promise<ImporterCommitResult> {
  const ownerAccess = await getOperationalBusinessActionContext();

  if (!ownerAccess.ok) {
    return { created: 0, skipped: 0, error: ownerAccess.error };
  }

  const { user, businessContext } = ownerAccess;
  const plan = businessContext.business.plan;

  if (!hasFeatureAccess(plan, "knowledgeBase")) {
    return {
      created: 0,
      skipped: 0,
      error: "Upgrade to Pro to save imported knowledge.",
    };
  }

  const parsed = importerCommitKnowledgeSchema.safeParse(payload);

  if (!parsed.success) {
    const firstMessage = parsed.error.issues[0]?.message;

    return {
      created: 0,
      skipped: 0,
      error: firstMessage ?? "Some items were invalid. Please review and try again.",
    };
  }

  const limit = getUsageLimit(plan, "memoriesPerBusiness");
  const existingCount = await getMemoryCountForBusiness(businessContext.business.id);
  const totalAfterImport = existingCount + parsed.data.items.length;

  if (limit !== null && totalAfterImport > limit) {
    const overBy = totalAfterImport - limit;

    return {
      created: 0,
      skipped: parsed.data.items.length,
      error: `This import would put you ${overBy} over your plan limit of ${limit} knowledge items (you currently have ${existingCount}). Remove ${overBy} item${overBy === 1 ? "" : "s"} from the review and try again, or upgrade your plan.`,
    };
  }

  let created = 0;

  for (const item of parsed.data.items) {
    try {
      await createMemoryForBusiness({
        businessId: businessContext.business.id,
        actorUserId: user.id,
        memory: { title: item.title, content: item.content },
      });
      created += 1;
    } catch (error) {
      console.warn("[importer] createMemory failed", error);
    }
  }

  updateCacheTags(getBusinessMemoryCacheTags(businessContext.business.id));

  if (created === 0) {
    return {
      created,
      skipped: 0,
      error: "We couldn't save any items. Please try again.",
    };
  }

  return { created, skipped: 0 };
}

/**
 * Commits selected pricing entries from a reviewed import. Same mutation as
 * manual library creation so currency, cache tags, and activity logging are
 * handled consistently.
 */
export async function commitPricingImportAction(
  payload: unknown,
): Promise<ImporterCommitResult> {
  const ownerAccess = await getOperationalBusinessActionContext();

  if (!ownerAccess.ok) {
    return { created: 0, skipped: 0, error: ownerAccess.error };
  }

  const { user, businessContext } = ownerAccess;
  const plan = businessContext.business.plan;

  if (!hasFeatureAccess(plan, "quoteLibrary")) {
    return {
      created: 0,
      skipped: 0,
      error: "Upgrade to Pro to save imported pricing entries.",
    };
  }

  const parsed = importerCommitPricingSchema.safeParse(payload);

  if (!parsed.success) {
    const firstMessage = parsed.error.issues[0]?.message;

    return {
      created: 0,
      skipped: 0,
      error:
        firstMessage ??
        "Some entries were invalid. Please review and try again.",
    };
  }

  const limit = getUsageLimit(plan, "pricingEntriesPerBusiness");
  const existingCount = (
    await getQuoteLibrarySummaryForBusiness(businessContext.business.id)
  ).entryCount;
  const totalAfterImport = existingCount + parsed.data.entries.length;

  if (limit !== null && totalAfterImport > limit) {
    const overBy = totalAfterImport - limit;

    return {
      created: 0,
      skipped: parsed.data.entries.length,
      error: `This import would put you ${overBy} over your plan limit of ${limit} pricing entries (you currently have ${existingCount}). Remove ${overBy} entr${overBy === 1 ? "y" : "ies"} from the review and try again, or upgrade your plan.`,
    };
  }

  let created = 0;

  for (const entry of parsed.data.entries) {
    try {
      await createQuoteLibraryEntryForBusiness({
        businessId: businessContext.business.id,
        actorUserId: user.id,
        currency: businessContext.business.defaultCurrency,
        entry: {
          kind: entry.kind,
          name: entry.name,
          description: entry.description,
          items: entry.items.map((item) => ({
            id: crypto.randomUUID(),
            description: item.description,
            quantity: item.quantity,
            unitPriceInCents: item.unitPriceInCents,
          })),
        },
      });
      created += 1;
    } catch (error) {
      console.warn("[importer] createPricingEntry failed", error);
    }
  }

  updateCacheTags(getBusinessPricingCacheTags(businessContext.business.id));

  if (created === 0) {
    return {
      created,
      skipped: 0,
      error: "We couldn't save any entries. Please try again.",
    };
  }

  return { created, skipped: 0 };
}
