import { describe, expect, it } from "vitest";

import {
  getBaseCatalog,
  getDerivedCostTable,
  KNOWN_CATALOG_PROVIDERS,
} from "@/lib/ai/catalog";
import { ROUTING_PROFILES, type AiRoutingProfile } from "@/lib/ai/routing-profiles";
import {
  diffCatalogAgainstLive,
  groupCatalogByProvider,
} from "@/lib/ai/catalog-drift";
import {
  classifyExhaustionScope,
  isModelNotFoundError,
  isOversizedError,
  isRetryableError,
} from "@/lib/ai/errors";

describe("catalog invariants", () => {
  it("uses unique identifiers under a known registry prefix", () => {
    const catalog = getBaseCatalog();
    const ids = catalog.map((e) => e.modelId);
    expect(new Set(ids).size).toBe(ids.length);
    for (const entry of catalog) {
      const prefix = entry.modelId.split(":")[0]!;
      expect(KNOWN_CATALOG_PROVIDERS as readonly string[]).toContain(prefix);
    }
  });

  it("declares neuron rates only on Cloudflare entries", () => {
    for (const entry of getBaseCatalog()) {
      if (entry.limits.neuronsPerMillion) {
        expect(entry.modelId.startsWith("cloudflare:")).toBe(true);
      }
    }
  });

  it("keeps output limits inside context windows", () => {
    for (const entry of getBaseCatalog()) {
      expect(entry.maxOutputTokens).toBeLessThanOrEqual(entry.contextWindow);
    }
  });

  it("covers every catalog entry in the derived cost table", () => {
    const table = getDerivedCostTable();
    for (const entry of getBaseCatalog()) {
      expect(table[entry.modelId]).toBeDefined();
    }
  });

  it("prices Gemini under the registry prefix the runtime uses", () => {
    const table = getDerivedCostTable();
    expect(table["google:gemini-2.5-flash"]).toBeDefined();
    expect(table["gemini:gemini-2.5-flash"]).toBeUndefined();
  });
});

describe("profile invariants", () => {
  const profiles = Object.keys(ROUTING_PROFILES) as AiRoutingProfile[];
  const catalogIds = new Set(getBaseCatalog().map((e) => e.modelId));
  const byId = new Map(getBaseCatalog().map((e) => [e.modelId, e]));

  it("names only catalog identifiers", () => {
    for (const profile of profiles) {
      for (const id of ROUTING_PROFILES[profile].order) {
        expect(catalogIds.has(id)).toBe(true);
      }
    }
  });

  it("lists only tool-capable entries where tools are needed", () => {
    for (const profile of profiles) {
      const def = ROUTING_PROFILES[profile];
      if (!def.needsTools) continue;
      for (const id of def.order) {
        expect(byId.get(id)?.toolCapable).toBe(true);
      }
    }
  });

  it("excludes the excluded providers entirely", () => {
    for (const profile of profiles) {
      const def = ROUTING_PROFILES[profile];
      for (const excluded of def.excludedProviders) {
        expect(
          def.order.some((id) => id.startsWith(`${excluded}:`)),
        ).toBe(false);
      }
    }
  });

  it("ranks reserve entries last", () => {
    for (const profile of profiles) {
      const order = ROUTING_PROFILES[profile].order;
      const reserveIdx = order.map((id) => byId.get(id)?.reserve ?? false);
      const firstReserve = reserveIdx.indexOf(true);
      if (firstReserve === -1) continue;
      expect(reserveIdx.slice(firstReserve).every(Boolean)).toBe(true);
    }
  });

  it("keeps quote chains off providers that cannot hold a full draft", () => {
    for (const profile of ["quote_draft", "quote_improvement"] as const) {
      for (const id of ROUTING_PROFILES[profile].order) {
        const entry = byId.get(id)!;
        // 4K output + grounding must fit the per-minute token allowance.
        expect(entry.limits.tpm).toBeGreaterThanOrEqual(8000);
      }
    }
  });
});

describe("error classification", () => {
  it("treats context-length as oversized, not transient", () => {
    const err = new Error("This model's maximum context length is 32768 tokens");
    expect(isOversizedError(err)).toBe(true);
    expect(isRetryableError(err)).toBe(true); // advances, but via escalate path
  });

  it("treats request-too-large as oversized", () => {
    expect(isOversizedError(new Error("Request too large for model"))).toBe(true);
  });

  it("does not classify unsupported reasoning fields as capacity exhaustion", () => {
    const error = Object.assign(
      new Error(
        "messages.4.assistant.reasoning_content: property 'messages.4.assistant.reasoning_content' is unsupported",
      ),
      { status: 400 },
    );

    expect(isRetryableError(error)).toBe(false);
  });

  it("classifies 404 and model-not-found as their own class", () => {
    expect(isModelNotFoundError({ status: 404, message: "not found" })).toBe(true);
    expect(
      isModelNotFoundError(new Error("model_not_found: openai/gpt-oss-120b")),
    ).toBe(true);
  });

  it("scopes day-named refusals to the day boundary", () => {
    expect(
      classifyExhaustionScope(new Error("429 daily quota exceeded")),
    ).toBe("day");
    expect(
      classifyExhaustionScope(new Error("Rate limit exceeded, retry in 30s")),
    ).toBe("minute");
  });
});

describe("drift diff", () => {
  it("fails on catalog IDs the provider no longer serves", () => {
    const { missing } = diffCatalogAgainstLive(
      ["google:gemini-2.5-flash", "groq:openai/gpt-oss-120b"],
      ["gemini-2.5-flash"],
    );
    expect(missing).toEqual(["groq:openai/gpt-oss-120b"]);
  });

  it("matches bare and prefixed live IDs", () => {
    const { missing } = diffCatalogAgainstLive(
      ["google:gemini-2.5-flash"],
      ["google:gemini-2.5-flash"],
    );
    expect(missing).toEqual([]);
  });

  it("groups catalog IDs by provider", () => {
    const grouped = groupCatalogByProvider([
      "groq:openai/gpt-oss-120b",
      "google:gemini-2.5-flash",
    ]);
    expect(grouped.get("groq")).toEqual(["openai/gpt-oss-120b"]);
    expect(grouped.get("gemini")).toEqual(["gemini-2.5-flash"]);
  });
});
