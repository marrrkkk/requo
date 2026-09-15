import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Coverage for the NULL-embedding backfill.
 *
 * Embedding generation is best-effort on the write path, so a rate limit or
 * provider outage leaves `embedding = null` behind and retrieval quietly
 * degrades to lexical matching for that content. Nothing else revisits those
 * rows — this job is the only repair path, so its selection filters and its
 * cache invalidation both matter.
 */

const selectMock = vi.fn();
const updateMock = vi.fn();
const generateEmbeddingsMock = vi.fn();
const revalidateTagMock = vi.fn();

/**
 * `isGeminiConfigured` is a boolean const in `lib/env.ts`, not a function, so
 * the mock exposes it as a getter — a plain value would be captured once at
 * module-mock time and could not be flipped per test.
 */
let geminiConfigured = true;

vi.mock("@/lib/db/client", () => ({
  db: {
    select: (...args: unknown[]) => selectMock(...args),
    update: (...args: unknown[]) => updateMock(...args),
  },
}));

vi.mock("@/lib/ai/embeddings", () => ({
  EMBEDDING_DIMENSIONS: 768,
  generateEmbeddings: (...args: unknown[]) => generateEmbeddingsMock(...args),
}));

vi.mock("next/cache", () => ({
  revalidateTag: (...args: unknown[]) => revalidateTagMock(...args),
}));

vi.mock("@/lib/env", () => ({
  get isGeminiConfigured() {
    return geminiConfigured;
  },
}));

import { EMBEDDING_DIMENSIONS } from "@/lib/ai/embeddings";
import { backfillMissingEmbeddings } from "@/features/memory/jobs/embedding-backfill";

function vector(): number[] {
  return Array.from({ length: EMBEDDING_DIMENSIONS }, () => 0.01);
}

/**
 * Fluent stand-in for a Drizzle select chain. Records which builder methods
 * ran (so the ready-file join and the ordering/limit can be asserted without
 * parsing SQL) and resolves to the supplied rows when awaited.
 */
function selectBuilder(rows: unknown[]) {
  const calls: string[] = [];
  const builder: Record<string, unknown> = { calls };

  const chain = (name: string) => () => {
    calls.push(name);
    return builder;
  };

  builder.from = chain("from");
  builder.innerJoin = chain("innerJoin");
  builder.where = chain("where");
  builder.orderBy = chain("orderBy");
  builder.limit = chain("limit");
  builder.then = (resolve: (value: unknown) => unknown) =>
    Promise.resolve(rows).then(resolve);

  return builder;
}

function updateBuilder(onSet: (values: Record<string, unknown>) => void) {
  const builder: Record<string, unknown> = {};
  builder.set = (values: Record<string, unknown>) => {
    onSet(values);
    return builder;
  };
  builder.where = () => Promise.resolve(undefined);
  return builder;
}

beforeEach(() => {
  // `resetAllMocks` rather than `clearAllMocks`: the latter leaves the
  // `mockReturnValueOnce` queue intact, so queued query builders from an
  // earlier test leak into the next one.
  vi.resetAllMocks();
  geminiConfigured = true;
});

describe("embedding backfill", () => {
  it("backfills null-embedding chunks and memories", async () => {
    const chunkQuery = selectBuilder([
      { id: "knc_1", businessId: "biz_1", content: "chunk one" },
      { id: "knc_2", businessId: "biz_2", content: "chunk two" },
    ]);
    const memoryQuery = selectBuilder([
      { id: "mem_1", businessId: "biz_1", title: "Rules", content: "Net 30" },
    ]);

    selectMock
      .mockReturnValueOnce(chunkQuery)
      .mockReturnValueOnce(memoryQuery);

    const updates: Array<Record<string, unknown>> = [];
    updateMock.mockImplementation(() =>
      updateBuilder((values) => updates.push(values)),
    );

    generateEmbeddingsMock.mockImplementation(
      async (texts: string[]) => texts.map(() => vector()),
    );

    const summary = await backfillMissingEmbeddings();

    expect(summary).toEqual({
      chunksScanned: 2,
      chunksBackfilled: 2,
      memoriesScanned: 1,
      memoriesBackfilled: 1,
      stillNull: 0,
      businessesTouched: 2,
    });
    expect(updates).toHaveLength(3);
    expect(updates[0].embedding).toHaveLength(EMBEDDING_DIMENSIONS);
  });

  it("joins knowledge files so only ready files are backfilled", async () => {
    const chunkQuery = selectBuilder([]);
    const memoryQuery = selectBuilder([]);

    selectMock
      .mockReturnValueOnce(chunkQuery)
      .mockReturnValueOnce(memoryQuery);
    updateMock.mockImplementation(() => updateBuilder(() => {}));
    generateEmbeddingsMock.mockResolvedValue([]);

    await backfillMissingEmbeddings();

    expect(chunkQuery.calls).toEqual([
      "from",
      "innerJoin",
      "where",
      "orderBy",
      "limit",
    ]);
    expect(memoryQuery.calls).toEqual(["from", "where", "orderBy", "limit"]);
  });

  it("embeds memories from the shared title-plus-content text", async () => {
    selectMock
      .mockReturnValueOnce(selectBuilder([]))
      .mockReturnValueOnce(
        selectBuilder([
          { id: "mem_1", businessId: "biz_1", title: "Rules", content: "Net 30" },
        ]),
      );
    updateMock.mockImplementation(() => updateBuilder(() => {}));
    generateEmbeddingsMock.mockResolvedValue([vector()]);

    await backfillMissingEmbeddings();

    expect(generateEmbeddingsMock).toHaveBeenCalledWith(["Rules\nNet 30"]);
  });

  it("invalidates the knowledge cache once per distinct business", async () => {
    selectMock
      .mockReturnValueOnce(
        selectBuilder([
          { id: "knc_1", businessId: "biz_1", content: "a" },
          { id: "knc_2", businessId: "biz_1", content: "b" },
        ]),
      )
      .mockReturnValueOnce(selectBuilder([]));
    updateMock.mockImplementation(() => updateBuilder(() => {}));
    generateEmbeddingsMock.mockResolvedValue([vector(), vector()]);

    await backfillMissingEmbeddings();

    // Three tags per business, and only one distinct business here.
    expect(revalidateTagMock).toHaveBeenCalledTimes(3);
    expect(revalidateTagMock).toHaveBeenCalledWith("business:biz_1", "max");
  });

  it("counts rows the provider could not embed as still null", async () => {
    selectMock
      .mockReturnValueOnce(
        selectBuilder([
          { id: "knc_1", businessId: "biz_1", content: "a" },
          { id: "knc_2", businessId: "biz_1", content: "b" },
        ]),
      )
      .mockReturnValueOnce(selectBuilder([]));

    const updates: Array<Record<string, unknown>> = [];
    updateMock.mockImplementation(() =>
      updateBuilder((values) => updates.push(values)),
    );

    generateEmbeddingsMock.mockResolvedValue([vector(), null]);

    const summary = await backfillMissingEmbeddings();

    expect(summary.chunksBackfilled).toBe(1);
    expect(summary.stillNull).toBe(1);
    expect(updates).toHaveLength(1);
  });

  it("skips entirely when Gemini is not configured", async () => {
    geminiConfigured = false;

    const summary = await backfillMissingEmbeddings();

    expect(summary).toEqual({
      chunksScanned: 0,
      chunksBackfilled: 0,
      memoriesScanned: 0,
      memoriesBackfilled: 0,
      stillNull: 0,
      businessesTouched: 0,
      skipped: "gemini-not-configured",
    });
    expect(selectMock).not.toHaveBeenCalled();
    expect(generateEmbeddingsMock).not.toHaveBeenCalled();
  });

  it("does no work and touches no cache when nothing is missing", async () => {
    selectMock
      .mockReturnValueOnce(selectBuilder([]))
      .mockReturnValueOnce(selectBuilder([]));

    const summary = await backfillMissingEmbeddings();

    expect(summary.stillNull).toBe(0);
    expect(summary.businessesTouched).toBe(0);
    expect(updateMock).not.toHaveBeenCalled();
    expect(generateEmbeddingsMock).not.toHaveBeenCalled();
    expect(revalidateTagMock).not.toHaveBeenCalled();
  });
});
