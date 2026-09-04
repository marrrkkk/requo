import { expect, test, type Page } from "@playwright/test";

import { demoBusinessSlug } from "./fixtures";
import { registerSmokeGuard } from "./smoke-registry";

registerSmokeGuard();

const MOCK_REPLY =
  "Thanks for reaching out! We handle storefront signage and event graphics — could you share a few details about the project?";

function uiStreamBody(text: string) {
  return [
    `data: {"type":"start","messageId":"msg-1"}`,
    ``,
    `data: {"type":"text-start","id":"text-1"}`,
    ``,
    `data: {"type":"text-delta","id":"text-1","delta":${JSON.stringify(text)}}`,
    ``,
    `data: {"type":"text-end","id":"text-1"}`,
    ``,
    `data: {"type":"finish"}`,
    ``,
    `data: [DONE]`,
    ``,
  ].join("\n");
}

/**
 * Mocks POST /api/ai/agent/chat with a deterministic UI message stream reply
 * so the smoke test never depends on a live LLM provider (AI keys are
 * disabled in the Playwright web server environment). Also asserts the
 * client sends a session token and UI messages.
 */
function mockAgentChatEndpoint(page: Page) {
  return page.route("**/api/ai/agent/chat", async (route) => {
    const request = route.request();

    expect(request.method()).toBe("POST");

    const body = request.postDataJSON() as {
      sessionToken?: unknown;
      messages?: Array<{ role?: string }>;
    };
    expect(body.sessionToken).toBeTruthy();
    expect(Array.isArray(body.messages)).toBe(true);

    await route.fulfill({
      status: 200,
      headers: { "Content-Type": "text/event-stream" },
      body: uiStreamBody(MOCK_REPLY),
    });
  });
}

test("public chat flow streams a reply on the enabled demo business @smoke", async ({
  page,
}) => {
  await mockAgentChatEndpoint(page);

  await page.goto(`/b/${demoBusinessSlug}/chat`);
  await page.waitForLoadState("networkidle");

  await expect(page.getByText("Chat with BrightSide Print Studio")).toBeVisible();

  const input = page.getByLabel("Message");
  // The chat input stays disabled until the session server action resolves.
  await expect(input).toBeEnabled({ timeout: 15_000 });

  await input.fill("Hi, I need storefront signage.");
  await page.getByRole("button", { name: "Send message" }).click();

  await expect(page.getByText("Hi, I need storefront signage.")).toBeVisible();
  await expect(page.getByText(MOCK_REPLY)).toBeVisible({ timeout: 10_000 });

  // A session token is persisted so a reload resumes the conversation.
  const storedToken = await page.evaluate(
    () => sessionStorage.getItem("requo-agent-session:brightside-print-studio"),
  );
  expect(storedToken).toMatch(/^[0-9a-f]{64}$/);
});

test("chat page shows the public not-found state for agent-disabled businesses", async ({
  page,
}) => {
  // "demo-business" (Santos Print Shop) is not seeded with the AI agent.
  await page.goto("/b/demo-business/chat");

  await expect(page.getByText("This public page is unavailable.")).toBeVisible();
});

test("chat API rejects payloads without a session token", async ({ request }) => {
  const response = await request.post("/api/ai/agent/chat", {
    data: { content: "no token here" },
  });

  expect(response.status()).toBe(400);
  await expect(response.json()).resolves.toEqual({
    error: "Invalid request. Session token and message content are required.",
  });
});
