import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import {
  AdminAiCapacityTable,
  AdminProvidersSection,
  AdminRoutingProfilesSection,
} from "@/features/admin/components/ai/admin-ai-providers";
import type {
  AdminAiCapacityEntry,
  AdminAiProviders as AdminAiProvidersPayload,
} from "@/features/admin/types";

function makeProviders(overrides: Partial<AdminAiProvidersPayload> = {}): AdminAiProvidersPayload {
  return {
    providers: [
      { id: "groq", label: "Groq", configured: true },
      { id: "cerebras", label: "Cerebras", configured: false },
      { id: "google", label: "Gemini", configured: true },
      { id: "openrouter", label: "OpenRouter", configured: false },
      { id: "mistral", label: "Mistral", configured: false },
      { id: "cloudflare", label: "Cloudflare", configured: false },
      { id: "nvidia", label: "NVIDIA NIM", configured: false },
    ],
    profiles: [
      {
        name: "quote_draft",
        needsTools: false,
        minQuality: 7,
        order: ["mistral:mistral-medium-latest", "cerebras:gpt-oss-120b"],
        excludedProviders: ["groq", "cloudflare", "nvidia"],
        reasoning: "4K draft plus grounding cannot fit Groq 8K TPM.",
      },
    ],
    ...overrides,
  };
}

describe("AdminProvidersSection", () => {
  it("marks configured providers and names missing keys", () => {
    render(<AdminProvidersSection data={makeProviders()} />);

    expect(screen.getAllByText("Configured")).toHaveLength(2);
    expect(screen.getAllByText("Missing keys")).toHaveLength(5);
    // The real registry set is shown — all seven, none invented.
    for (const label of [
      "Groq",
      "Cerebras",
      "Gemini",
      "OpenRouter",
      "Mistral",
      "Cloudflare",
      "NVIDIA NIM",
    ]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });
});

describe("AdminRoutingProfilesSection", () => {
  it("renders the fallback order with its reasoning", () => {
    render(<AdminRoutingProfilesSection data={makeProviders()} />);

    expect(screen.getByText("quote_draft")).toBeInTheDocument();
    expect(
      screen.getByText(/mistral:mistral-medium-latest → cerebras:gpt-oss-120b/),
    ).toBeInTheDocument();
    expect(screen.getByText(/cannot fit Groq 8K TPM/)).toBeInTheDocument();
  });
});

describe("AdminAiCapacityTable", () => {
  const entries: AdminAiCapacityEntry[] = [
    {
      modelId: "cerebras:gpt-oss-120b",
      loadRatio: 0.91,
      minuteUsage: 40,
      dayUsage: 900,
      available: false,
    },
    {
      modelId: "groq:openai/gpt-oss-20b",
      loadRatio: 0.12,
      minuteUsage: 3,
      dayUsage: 120,
      available: true,
    },
  ];

  it("renders load, usage, and availability per model", () => {
    render(<AdminAiCapacityTable entries={entries} />);

    expect(screen.getByText("cerebras:gpt-oss-120b")).toBeInTheDocument();
    expect(screen.getByText("91%")).toBeInTheDocument();
    expect(screen.getByText("Stressed")).toBeInTheDocument();
    expect(screen.getByText("Available")).toBeInTheDocument();
  });

  it("names the empty catalog instead of rendering an empty table", () => {
    render(<AdminAiCapacityTable entries={[]} />);

    expect(screen.getByText("No models in the catalog.")).toBeInTheDocument();
  });
});
