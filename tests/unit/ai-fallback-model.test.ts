import { describe, expect, it, vi, beforeEach } from "vitest";

const mockLanguageModel = vi.fn();
const mockMarkDead = vi.fn(async (..._args: unknown[]) => {});
const mockMarkExhausted = vi.fn(async (..._args: unknown[]) => {});
const mockRecordUsage = vi.fn(async (..._args: unknown[]) => {});
const mockRecordTokens = vi.fn(async (..._args: unknown[]) => {});
const mockIsDead = vi.fn(async (..._args: unknown[]) => false);

vi.mock("@/lib/ai/registry", () => ({
  registry: { languageModel: (...args: unknown[]) => mockLanguageModel(...args) },
}));

vi.mock("@/lib/ai/capacity-selector", () => ({
  markModelDead: (...args: unknown[]) => mockMarkDead(...args),
  markModelExhausted: (...args: unknown[]) => mockMarkExhausted(...args),
  recordModelUsage: (...args: unknown[]) => mockRecordUsage(...args),
  recordModelTokenUsage: (...args: unknown[]) => mockRecordTokens(...args),
  isModelDead: (...args: unknown[]) => mockIsDead(...args),
}));

vi.mock("@/lib/ai/catalog", () => ({
  getCatalogEntry: vi.fn((id: string) => ({
    contextWindow: id.includes("pro") ? 1_048_576 : 32_768,
  })),
}));

import { createFallbackLanguageModel } from "@/lib/ai/fallback-model";

function generateResult(text = "ok") {
  return {
    content: [{ type: "text", text }],
    finishReason: "stop",
    usage: { inputTokens: 5, outputTokens: 5 },
    warnings: [],
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockIsDead.mockResolvedValue(false);
});

describe("fallback wrapper", () => {
  it("serves from the first healthy candidate and attributes success", async () => {
    const selected: string[] = [];
    mockLanguageModel.mockImplementation(() => ({
      doGenerate: async () => generateResult("hello"),
      doStream: async () => {
        throw new Error("not used");
      },
    }));
    const model = createFallbackLanguageModel({
      modelIds: ["groq:a", "cerebras:b"],
      maxAttempts: 5,
      onModelSelected: (s) => selected.push(s.modelId),
    });
    const result = await model.doGenerate({} as never);
    expect(result.content?.[0]).toMatchObject({ text: "hello" });
    expect(mockRecordUsage).toHaveBeenCalledWith("groq:a");
    expect(selected).toEqual(["groq:a"]);
  });

  it("strips replayed reasoning parts before the provider call", async () => {
    let receivedPrompt: unknown;
    mockLanguageModel.mockImplementation(() => ({
      doGenerate: async (options: { prompt: unknown[] }) => {
        receivedPrompt = options.prompt;
        return generateResult("portable");
      },
      doStream: async () => {
        throw new Error("not used");
      },
    }));

    const model = createFallbackLanguageModel({ modelIds: ["cerebras:portable"] });
    await model.doGenerate({
      prompt: [
        { role: "system", content: "system" },
        {
          role: "assistant",
          content: [
            { type: "reasoning", text: "private chain of thought" },
            { type: "text", text: "visible answer" },
          ],
        },
        {
          role: "assistant",
          content: [{ type: "reasoning", text: "reasoning-only step" }],
        },
      ],
    } as never);

    expect(receivedPrompt).toEqual([
      { role: "system", content: "system" },
      {
        role: "assistant",
        content: [{ type: "text", text: "visible answer" }],
      },
    ]);
  });

  it("applies the same reasoning strip on streaming calls", async () => {
    let receivedPrompt: unknown;
    mockLanguageModel.mockImplementation(() => ({
      doGenerate: async () => generateResult("not used"),
      doStream: async (options: { prompt: unknown[] }) => {
        receivedPrompt = options.prompt;
        return {
          stream: new ReadableStream({
            start(controller) {
              controller.enqueue({ type: "stream-start", warnings: [] });
              controller.close();
            },
          }),
        };
      },
    }));

    const model = createFallbackLanguageModel({ modelIds: ["cerebras:stream"] });
    await model.doStream({
      prompt: [
        {
          role: "assistant",
          content: [{ type: "reasoning", text: "do not forward" }],
        },
      ],
    } as never);

    expect(receivedPrompt).toEqual([]);
  });

  it("skips dead identifiers without consuming the attempt budget", async () => {
    // Three dead heads + two live: budget of 2 must still serve (dead cost 0).
    mockIsDead.mockImplementation(async (...args: unknown[]) =>
      (args[0] as string) !== "google:alive",
    );
    mockLanguageModel.mockImplementation(() => ({
      doGenerate: async () => generateResult("alive"),
      doStream: async () => {
        throw new Error("not used");
      },
    }));
    const failed: string[] = [];
    const model = createFallbackLanguageModel({
      modelIds: ["groq:dead-1", "groq:dead-2", "cerebras:dead-3", "google:alive"],
      maxAttempts: 2,
      onAttemptFailed: (s) => failed.push(s.modelId),
    });
    const result = await model.doGenerate({} as never);
    expect(result.content?.[0]).toMatchObject({ text: "alive" });
    expect(failed).toContain("groq:dead-1");
    expect(mockMarkDead).not.toHaveBeenCalled(); // already cached dead
  });

  it("evicts 404 identifiers for hours outside the budget", async () => {
    mockLanguageModel
      .mockImplementationOnce(() => ({
        doGenerate: async () => {
          throw Object.assign(new Error("model_not_found"), { status: 404 });
        },
        doStream: async () => {
          throw new Error("not used");
        },
      }))
      .mockImplementation(() => ({
        doGenerate: async () => generateResult("recovered"),
        doStream: async () => {
          throw new Error("not used");
        },
      }));
    const model = createFallbackLanguageModel({
      modelIds: ["groq:dead", "cerebras:alive"],
      maxAttempts: 1, // dead costs nothing, so budget of 1 still serves
    });
    const result = await model.doGenerate({} as never);
    expect(result.content?.[0]).toMatchObject({ text: "recovered" });
    expect(mockMarkDead).toHaveBeenCalledWith("groq:dead");
    expect(mockMarkExhausted).not.toHaveBeenCalledWith(
      "groq:dead",
      expect.anything(),
    );
  });

  it("advances on non-retryable errors", async () => {
    mockLanguageModel
      .mockImplementationOnce(() => ({
        doGenerate: async () => {
          throw Object.assign(new Error("Unauthorized"), { status: 401 });
        },
        doStream: async () => {
          throw new Error("not used");
        },
      }))
      .mockImplementation(() => ({
        doGenerate: async () => generateResult("next"),
        doStream: async () => {
          throw new Error("not used");
        },
      }));
    const model = createFallbackLanguageModel({
      modelIds: ["groq:a", "cerebras:b"],
      maxAttempts: 2,
    });
    const result = await model.doGenerate({} as never);
    expect(result.content?.[0]).toMatchObject({ text: "next" });
  });

  it("bounds latency by maxAttempts", async () => {
    mockLanguageModel.mockImplementation(() => ({
      doGenerate: async () => {
        throw Object.assign(new Error("busy"), { status: 429 });
      },
      doStream: async () => {
        throw new Error("not used");
      },
    }));
    const model = createFallbackLanguageModel({
      modelIds: ["groq:a", "cerebras:b", "google:c"],
      maxAttempts: 2,
    });
    await expect(model.doGenerate({} as never)).rejects.toThrow("busy");
    expect(mockLanguageModel).toHaveBeenCalledTimes(2);
  });

  it("prefers the candidate that served the previous tool step", async () => {
    const calls: string[] = [];
    mockLanguageModel.mockImplementation((modelId: string) => ({
      doGenerate: async () => generateResult("not used"),
      doStream: async () => {
        calls.push(modelId);
        if (modelId === "groq:busy") {
          throw Object.assign(new Error("busy"), { status: 429 });
        }
        return {
          stream: new ReadableStream({
            start(controller) {
              controller.enqueue({ type: "stream-start", warnings: [] });
              controller.enqueue({
                type: "text-delta",
                id: "text-1",
                delta: "available services",
              });
              controller.close();
            },
          }),
        };
      },
    }));

    const model = createFallbackLanguageModel({
      modelIds: ["groq:busy", "openrouter:healthy"],
      maxAttempts: 2,
    });

    await model.doStream({} as never);
    await model.doStream({} as never);

    expect(calls).toEqual([
      "groq:busy",
      "openrouter:healthy",
      "openrouter:healthy",
    ]);
  });

  it("keeps the full candidate list for later steps (no draining)", async () => {
    const served: string[] = [];
    mockLanguageModel.mockImplementation((modelId: string) => ({
      doGenerate: async () => generateResult("not used"),
      doStream: async () => {
        served.push(modelId);
        return {
          stream: new ReadableStream({
            start(controller) {
              controller.enqueue({ type: "stream-start", warnings: [] });
              controller.enqueue({
                type: "text-delta",
                id: "text-1",
                delta: "hi",
              });
              controller.close();
            },
          }),
        };
      },
    }));

    const model = createFallbackLanguageModel({
      modelIds: ["groq:a", "cerebras:b"],
      maxAttempts: 1,
    });

    await model.doStream({} as never);
    await model.doStream({} as never);
    await model.doStream({} as never);

    // The loop drains its working list with `shift()`: that list must be a
    // per-call copy, otherwise the first step eats the turn's candidates and
    // later steps fail with "All fallback models failed."
    expect(served).toEqual(["groq:a", "groq:a", "groq:a"]);
  });
});
