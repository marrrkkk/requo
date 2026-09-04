import { expect, test, type Page } from "@playwright/test";

import {
  demoBusinessSlug,
  demoOwnerEmail,
  demoOwnerPassword,
} from "./fixtures";
import { registerSmokeGuard } from "./smoke-registry";

registerSmokeGuard();

const MOCK_REPLY =
  "You have 3 open inquiries, all waiting on a first response.";

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
 * Mocks POST /api/ai/owner-assistant/chat with a deterministic UI message
 * stream reply so the smoke test never depends on a live LLM provider.
 */
function mockAssistantChatEndpoint(page: Page) {
  return page.route("**/api/ai/owner-assistant/chat", async (route) => {
    const request = route.request();

    expect(request.method()).toBe("POST");

    const body = request.postDataJSON() as {
      businessSlug?: unknown;
      sessionId?: unknown;
      messages?: unknown;
    };
    expect(body.businessSlug).toBe(demoBusinessSlug);
    expect(body.sessionId).toMatch(/^oas_/);
    expect(Array.isArray(body.messages)).toBe(true);

    await route.fulfill({
      status: 200,
      headers: { "Content-Type": "text/event-stream" },
      body: uiStreamBody(MOCK_REPLY),
    });
  });
}

async function signIn(page: Page) {
  await page.goto("/login");
  await page.waitForLoadState("networkidle");

  await page.getByLabel("Email address").fill(demoOwnerEmail);
  await page.locator("#password").fill(demoOwnerPassword);
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page).toHaveURL(/\/home$/, { timeout: 20_000 });
}

test("dashboard home chat box redirects to a session and streams a reply @smoke", async ({
  page,
}) => {
  test.setTimeout(120_000);

  await signIn(page);
  await mockAssistantChatEndpoint(page);

  await page.goto(`/${demoBusinessSlug}/home`);
  await page.waitForLoadState("networkidle");

  const input = page.getByPlaceholder("Ask me anything about your business...");
  await expect(input).toBeVisible({ timeout: 20_000 });
  await input.fill("How many open inquiries do I have?");
  await page.getByRole("button", { name: "Ask the assistant" }).click();

  // Straight to a real session URL with the first message already sent.
  await expect(page).toHaveURL(
    new RegExp(`/${demoBusinessSlug}/assistant/chat/oas_`),
    { timeout: 20_000 },
  );

  await expect(
    page.getByText("How many open inquiries do I have?"),
  ).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText(MOCK_REPLY)).toBeVisible({ timeout: 10_000 });
});

test("assistant section root offers a fresh composer without creating history @smoke", async ({
  page,
}) => {
  test.setTimeout(120_000);

  await signIn(page);

  await page.goto(`/${demoBusinessSlug}/assistant`);
  await page.waitForLoadState("networkidle");

  await expect(
    page.getByPlaceholder("Ask about inquiries, quotes, or create records..."),
  ).toBeVisible({ timeout: 20_000 });
});
