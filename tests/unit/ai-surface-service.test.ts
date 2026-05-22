import { describe, expect, it } from "vitest";

import { buildAiSurfaceCompletionRequest } from "@/features/ai/surface-service";

describe("AI surface completion request", () => {
  it("keeps recent chat history and prompts the model to resolve follow-up questions", () => {
    const request = buildAiSurfaceCompletionRequest({
      surface: "dashboard",
      context: [
        "Surface: dashboard",
        "",
        "Business profile",
        "- Name: Brightside Studio",
        "- Created: 2026-04-01T00:00:00.000Z",
      ].join("\n"),
      history: [
        {
          role: "user",
          content: "What is the name of the business?",
        },
        {
          role: "assistant",
          content: "The business name is Brightside Studio.",
        },
      ],
      message: "When was it created?",
    });

    expect(request.messages[0]).toMatchObject({
      role: "system",
    });
    expect(request.messages[0]?.content).toContain(
      "Use ONLY the provided context, tool results, and chat history",
    );
    expect(request.messages[0]?.content).toContain(
      "Format as GitHub-flavored Markdown",
    );
    expect(request.messages.slice(1, 3)).toEqual([
      {
        role: "user",
        content: "What is the name of the business?",
      },
      {
        role: "assistant",
        content: "The business name is Brightside Studio.",
      },
    ]);
    expect(request.messages.at(-1)).toMatchObject({
      role: "user",
    });
    expect(request.messages.at(-1)?.content).toContain(
      "- Created: 2026-04-01T00:00:00.000Z",
    );
    expect(request.messages.at(-1)?.content).toContain("When was it created?");
  });

  it("passes a selected development model through to the router request", () => {
    const request = buildAiSurfaceCompletionRequest({
      surface: "dashboard",
      context: "Surface: dashboard",
      message: "Summarize this.",
      modelSelection: {
        provider: "gemini",
        model: "gemini-2.5-pro",
      },
    });

    expect(request.provider).toBe("gemini");
    expect(request.model).toBe("gemini-2.5-pro");
  });
});
