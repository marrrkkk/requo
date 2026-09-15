import { describe, expect, it } from "vitest";

import {
  formatCompactCount,
  formatLatencyMs,
  formatLoadPercent,
} from "@/features/admin/components/ai/admin-ai-format";
import {
  ADMIN_AI_PROVIDERS,
  ADMIN_AI_PROVIDER_LABELS,
  type AdminAiProviderId,
} from "@/features/admin/constants";
import {
  adminAiErrorsFiltersSchema,
  adminAiRequestsFiltersSchema,
} from "@/features/admin/schemas";

describe("formatCompactCount", () => {
  it("compacts thousands and millions", () => {
    expect(formatCompactCount(0)).toBe("0");
    expect(formatCompactCount(999)).toBe("999");
    expect(formatCompactCount(1000)).toBe("1K");
    expect(formatCompactCount(1500)).toBe("1.5K");
    expect(formatCompactCount(2_500_000)).toBe("2.5M");
  });

  it("guards non-finite input", () => {
    expect(formatCompactCount(Number.NaN)).toBe("—");
  });
});

describe("formatLoadPercent", () => {
  it("renders load ratios as whole percents", () => {
    expect(formatLoadPercent(0)).toBe("0%");
    expect(formatLoadPercent(0.424)).toBe("42%");
    expect(formatLoadPercent(1)).toBe("100%");
  });

  it("guards non-finite input", () => {
    expect(formatLoadPercent(Number.NaN)).toBe("—");
  });
});

describe("formatLatencyMs", () => {
  it("rounds and separates thousands", () => {
    expect(formatLatencyMs(812.4)).toBe("812 ms");
    expect(formatLatencyMs(12345.6)).toBe("12,346 ms");
  });

  it("names empty windows", () => {
    expect(formatLatencyMs(null)).toBe("—");
  });
});

describe("admin AI provider registry", () => {
  it("covers exactly the seven registry providers with labels", () => {
    const ids: AdminAiProviderId[] = [
      "groq",
      "cerebras",
      "google",
      "openrouter",
      "mistral",
      "cloudflare",
      "nvidia",
    ];

    expect([...ADMIN_AI_PROVIDERS]).toEqual(ids);

    for (const id of ids) {
      expect(ADMIN_AI_PROVIDER_LABELS[id]).toMatch(/\S/);
    }
  });
});

describe("adminAiRequestsFiltersSchema", () => {
  it("parses the full filter set with the q alias and dates", () => {
    expect(
      adminAiRequestsFiltersSchema.parse({
        q: "req_123",
        provider: "groq",
        model: "llama",
        taskType: "quote_draft",
        status: "error",
        businessId: "biz_1",
        from: "2026-09-01",
        to: "2026-09-13",
      }),
    ).toMatchObject({
      search: "req_123",
      provider: "groq",
      model: "llama",
      taskType: "quote_draft",
      status: "error",
      businessId: "biz_1",
      page: 1,
    });
  });

  it("drops unknown providers, statuses, and garbage dates", () => {
    const parsed = adminAiRequestsFiltersSchema.parse({
      provider: "bogus",
      status: "bogus",
      from: "not-a-date",
    });

    expect(parsed.provider).toBeUndefined();
    expect(parsed.status).toBeUndefined();
    expect(parsed.from).toBeUndefined();
  });
});

describe("adminAiErrorsFiltersSchema", () => {
  it("parses provider, model, and task-type filters", () => {
    expect(
      adminAiErrorsFiltersSchema.parse({
        provider: "cerebras",
        model: "gpt-oss",
        taskType: "assistant_chat",
      }),
    ).toMatchObject({
      provider: "cerebras",
      model: "gpt-oss",
      taskType: "assistant_chat",
      page: 1,
    });
  });

  it("drops unknown providers instead of rejecting", () => {
    expect(adminAiErrorsFiltersSchema.parse({ provider: "bogus" })).toMatchObject(
      { page: 1 },
    );
  });
});
