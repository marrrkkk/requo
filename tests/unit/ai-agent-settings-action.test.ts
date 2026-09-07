import { beforeEach, describe, expect, it, vi } from "vitest";

const getOperationalBusinessActionContextMock = vi.fn();
const updateBusinessAiAgentSettingsMock = vi.fn();

vi.mock("next/cache", () => ({
  revalidatePath: () => {},
  updateTag: () => {},
}));

vi.mock("@/lib/db/business-access", () => ({
  getOperationalBusinessActionContext: () =>
    getOperationalBusinessActionContextMock(),
}));

vi.mock("@/features/settings/mutations", () => ({
  updateBusinessAiAgentSettings: (...args: unknown[]) =>
    updateBusinessAiAgentSettingsMock(...args),
}));

vi.mock("@/lib/cache/business-tags", () => ({
  getBusinessSettingsCacheTags: () => ["settings-tag"],
  uniqueCacheTags: (tags: string[]) => tags,
}));

// Import after mocking
import { updateBusinessAiAgentSettingsAction } from "@/features/settings/actions";

const ownerContext = {
  ok: true,
  user: { id: "user_1" },
  businessContext: { business: { id: "biz_1", slug: "acme", plan: "free" as const } },
};

describe("updateBusinessAiAgentSettingsAction — plan enforcement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getOperationalBusinessActionContextMock.mockResolvedValue(ownerContext);
  });

  it("rejects the server action for a free plan without reaching the mutation", async () => {
    const result = await updateBusinessAiAgentSettingsAction(
      {},
      objectToFormData({ aiAgentEnabled: "on", tone: "professional" }),
    );

    expect(result.error).toContain("Upgrade");
    expect(updateBusinessAiAgentSettingsMock).not.toHaveBeenCalled();
  });

  it("persists settings for a pro plan", async () => {
    getOperationalBusinessActionContextMock.mockResolvedValue({
      ok: true,
      user: { id: "user_1" },
      businessContext: { business: { id: "biz_1", slug: "acme", plan: "pro" as const } },
    });
    updateBusinessAiAgentSettingsMock.mockResolvedValue({ ok: true });

    const result = await updateBusinessAiAgentSettingsAction(
      {},
      objectToFormData({ aiAgentEnabled: "on", tone: "casual" }),
    );

    expect(result.success).toBe("AI agent settings saved.");
    expect(updateBusinessAiAgentSettingsMock).toHaveBeenCalledWith({
      businessId: "biz_1",
      actorUserId: "user_1",
      values: { aiAgentEnabled: true, tone: "casual" },
    });
  });

  it("returns the unauthorized message for non-operational roles", async () => {
    getOperationalBusinessActionContextMock.mockResolvedValue({
      ok: false,
      error: "Only an owner or manager can do that.",
    });

    const result = await updateBusinessAiAgentSettingsAction(
      {},
      objectToFormData({ aiAgentEnabled: "on", tone: "friendly" }),
    );

    expect(result.error).toBe("Only an owner or manager can do that.");
    expect(updateBusinessAiAgentSettingsMock).not.toHaveBeenCalled();
  });
});

function objectToFormData(values: Record<string, string>) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(values)) {
    formData.set(key, value);
  }
  return formData;
}