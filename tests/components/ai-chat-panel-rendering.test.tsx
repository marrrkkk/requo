import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  ChatMessageList,
} from "@/features/ai/components/ai-chat-panel";
import type {
  AiChatSource,
  ChatMessage,
} from "@/features/ai/components/ai-chat-helpers";

const assistantMessage: ChatMessage = {
  id: "assistant-1",
  role: "assistant",
  label: "Requo AI",
  content: [
    "## Summary",
    "",
    "- Review the latest quote before sending.",
    "- Open [Requo](https://requo.test) for the workspace.",
  ].join("\n"),
  model: "groq/qwen-test",
  status: "completed",
};

const sources: AiChatSource[] = [
  {
    label: "Current quote",
    href: "/businesses/demo/quotes/quote-1",
  },
];

function renderMessages(options?: { showModelMetadata?: boolean }) {
  return render(
    <ChatMessageList
      copyState={null}
      hasMore={false}
      hydrateError={null}
      isHydrating={false}
      isLoadingOlder={false}
      messages={[assistantMessage]}
      onCopy={vi.fn()}
      onReload={vi.fn()}
      paginationError={null}
      showModelMetadata={options?.showModelMetadata}
      sources={sources}
    />,
  );
}

describe("AI chat message rendering", () => {
  it("renders assistant content as Markdown with clickable source links", () => {
    renderMessages();

    expect(screen.getByRole("heading", { name: "Summary" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Requo" })).toHaveAttribute(
      "href",
      "https://requo.test",
    );
    expect(screen.queryByText("groq/qwen-test")).not.toBeInTheDocument();
  });

  it("shows model metadata when dev rendering is enabled", () => {
    renderMessages({ showModelMetadata: true });

    expect(screen.getByText("groq/qwen-test")).toBeVisible();
  });
});
