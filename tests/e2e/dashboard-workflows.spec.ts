import { expect, test, type Locator, type Page } from "@playwright/test";

import {
  demoOwnerEmail,
  demoOwnerPassword,
  demoBusinessSlug,
} from "./fixtures";

test.describe.configure({ mode: "serial" });

async function signIn(page: Page) {
  await page.goto("/login");
  await page.waitForLoadState("networkidle");

  await page.getByLabel("Email address").fill(demoOwnerEmail);
  await page.getByLabel("Password").fill(demoOwnerPassword);
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page).toHaveURL(/\/businesses$/, { timeout: 20_000 });
}

async function openBusinessesPage(page: Page, path: string) {
  await page.goto(`/businesses/${demoBusinessSlug}/dashboard${path}`);
  await page.waitForLoadState("networkidle");
}

function getSection(page: Page, title: string) {
  return page.locator("section").filter({
    has: page.getByRole("heading", { name: title, exact: true }),
  });
}

function getSnippetCard(page: Page, title: string): Locator {
  return page
    .locator('[data-slot="card"]')
    .filter({
      has: page.locator('[data-slot="card-title"]').filter({ hasText: title }),
    })
    .last();
}

function getToggleCard(page: Page, label: string): Locator {
  return page.locator("label").filter({
    has: page.getByText(label, { exact: true }),
  });
}

test("dashboard and detail pages surface follow-up, expiring-soon, and customer history context", async ({
  page,
}) => {
  await signIn(page);

  await openBusinessesPage(page, "");

  const followUpSection = getSection(page, "Follow up due");
  await expect(followUpSection.getByText("Foundry Labs booth kit")).toBeVisible();
  await expect(followUpSection.getByText("Expiring soon")).toBeVisible();

  const expiringSoonSection = getSection(page, "Quotes expiring soon");
  await expect(
    expiringSoonSection.getByText("Foundry Labs booth kit"),
  ).toBeVisible();
  await expect(
    expiringSoonSection.getByText("Expires", { exact: false }),
  ).toBeVisible();

  await openBusinessesPage(page, "/quotes/demo_quote_sent_1002");

  await expect(
    page.getByRole("alert").filter({
      has: page.getByText("Follow up due", { exact: true }),
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("alert").filter({
      has: page.getByText("Quote expiring soon", { exact: true }),
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Post-acceptance" }),
  ).toHaveCount(0);

  await expect(page.getByRole("link", { name: "Office signage" })).toBeVisible();
  await expect(
    page.getByRole("link", {
      name: "Q-0998 | Foundry Labs rebrand signage package",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Q-1002 | Foundry Labs booth kit" }),
  ).toHaveCount(0);

  await openBusinessesPage(page, "/inquiries/demo_inquiry_quoted_booth_kit");

  await expect(page.getByRole("link", { name: "Office signage" })).toBeVisible();
  await expect(
    page.getByRole("link", {
      name: "Q-0998 | Foundry Labs rebrand signage package",
    }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Event signage" })).toHaveCount(0);
});

test("owner can create, edit, insert, and delete a saved reply snippet", async ({
  page,
}) => {
  test.setTimeout(90_000);

  const initialTitle = `Delivery window ${Date.now()}`;
  const updatedTitle = `${initialTitle} updated`;
  const initialBody =
    "Could you confirm whether this job needs delivery or local pickup?";
  const updatedBody =
    "Could you confirm the final delivery address, target date, and whether local pickup is still an option?";
  const existingSnippetBody =
    "Thanks for sending this over. To price it accurately, could you confirm the final dimensions, quantity, and whether installation should be included?";

  await signIn(page);

  await openBusinessesPage(page, "/settings/inquiry");

  await page.locator("#reply-snippet-create-title").fill(initialTitle);
  await page.locator("#reply-snippet-create-body").fill(initialBody);
  await page.getByRole("button", { name: "Save reply snippet" }).click();

  const snippetCard = getSnippetCard(page, initialTitle);
  await expect(snippetCard).toBeVisible({ timeout: 20_000 });

  await snippetCard.getByRole("button", { name: "Edit snippet" }).click();
  await snippetCard.getByLabel("Title").fill(updatedTitle);
  await snippetCard.getByLabel("Snippet").fill(updatedBody);
  await snippetCard.getByRole("button", { name: "Save snippet" }).click();

  const updatedSnippetCard = getSnippetCard(page, updatedTitle);
  await expect(updatedSnippetCard).toBeVisible({ timeout: 20_000 });
  await expect(updatedSnippetCard.getByText(updatedBody)).toBeVisible();

  await openBusinessesPage(page, "/inquiries/demo_inquiry_new_storefront");

  const updatedSnippetOption = page
    .getByTestId("inquiry-reply-snippet-option")
    .filter({ has: page.getByText(updatedTitle, { exact: true }) });
  await expect(updatedSnippetOption).toBeVisible();

  await updatedSnippetOption
    .getByRole("button", { name: "Insert snippet" })
    .click();

  const replyDraft = page.getByPlaceholder(
    "Reply-style outputs can be inserted here, then edited before you send them.",
  );
  await expect(replyDraft).toHaveValue(updatedBody);

  await page
    .getByTestId("inquiry-reply-snippet-option")
    .filter({
      has: page.getByText("Ask for missing dimensions", { exact: true }),
    })
    .getByRole("button", { name: "Insert snippet" })
    .click();

  await expect(replyDraft).toHaveValue(
    `${updatedBody}\n\n${existingSnippetBody}`,
  );

  await openBusinessesPage(page, "/settings/inquiry");

  const deletableSnippetCard = getSnippetCard(page, updatedTitle);
  await deletableSnippetCard.getByRole("button", { name: "Delete" }).click();

  await expect(getSnippetCard(page, updatedTitle)).toHaveCount(0, {
    timeout: 60_000,
  });
});

test("accepted quotes can move from booked to scheduled", async ({ page }) => {
  test.setTimeout(60_000);

  await signIn(page);

  await openBusinessesPage(page, "/quotes/demo_quote_accepted_1003");

  const postAcceptanceSelect = page.getByRole("combobox", {
    name: "Move accepted work forward",
  });

  await postAcceptanceSelect.click();
  await page.getByRole("option", { name: "Booked" }).click();
  await page.getByRole("button", { name: "Save post-acceptance status" }).click();

  await expect(page.getByText("Quote Q-1003 marked booked.")).toBeVisible({
    timeout: 20_000,
  });
  await expect(postAcceptanceSelect).toContainText("Booked");

  await postAcceptanceSelect.click();
  await page.getByRole("option", { name: "Scheduled" }).click();
  await page.getByRole("button", { name: "Save post-acceptance status" }).click();

  await expect(page.getByText("Quote Q-1003 marked scheduled.")).toBeVisible({
    timeout: 20_000,
  });
  await expect(postAcceptanceSelect).toContainText("Scheduled");
});

test("notification settings live under general settings and persist", async ({
  page,
}) => {
  test.setTimeout(90_000);

  await signIn(page);

  await openBusinessesPage(page, "/settings/general");

  await expect(
    page.getByRole("heading", { name: "Notification preferences" }),
  ).toBeVisible();
  await expect(page.getByText("In-app on new inquiry")).toBeVisible();
  await expect(page.getByText("In-app on quote response")).toBeVisible();
  await expect(page.getByText("Email on new inquiry")).toBeVisible();
  await expect(page.getByText("Email on quote sent")).toBeVisible();
  await expect(page.getByText("Email on quote response")).toBeVisible();

  await openBusinessesPage(page, "/settings/quote");

  await expect(
    page.getByRole("heading", { name: "Notifications" }),
  ).toHaveCount(0);
  await expect(page.getByText("Email on quote sent")).toHaveCount(0);

  await openBusinessesPage(page, "/settings/general");

  const inAppInquiryCard = getToggleCard(page, "In-app on new inquiry");
  const emailQuoteResponseCard = getToggleCard(page, "Email on quote response");
  const inAppInquirySwitch = inAppInquiryCard.locator('[data-slot="switch"]');
  const emailQuoteResponseSwitch = emailQuoteResponseCard.locator(
    '[data-slot="switch"]',
  );

  await expect(inAppInquirySwitch).toHaveAttribute("data-state", "checked");
  await expect(emailQuoteResponseSwitch).toHaveAttribute("data-state", "checked");

  await inAppInquiryCard.click();
  await emailQuoteResponseCard.click();
  await page.getByRole("button", { name: "Save settings" }).click();

  await expect(page.getByText("Business settings saved.")).toBeVisible({
    timeout: 20_000,
  });
  await expect(inAppInquirySwitch).toHaveAttribute("data-state", "unchecked");
  await expect(emailQuoteResponseSwitch).toHaveAttribute(
    "data-state",
    "unchecked",
  );

  await page.reload({ waitUntil: "networkidle" });

  const reloadedInAppInquirySwitch = getToggleCard(
    page,
    "In-app on new inquiry",
  ).locator('[data-slot="switch"]');
  const reloadedEmailQuoteResponseSwitch = getToggleCard(
    page,
    "Email on quote response",
  ).locator('[data-slot="switch"]');

  await expect(reloadedInAppInquirySwitch).toHaveAttribute(
    "data-state",
    "unchecked",
  );
  await expect(reloadedEmailQuoteResponseSwitch).toHaveAttribute(
    "data-state",
    "unchecked",
  );

  await getToggleCard(page, "In-app on new inquiry").click();
  await getToggleCard(page, "Email on quote response").click();
  await page.getByRole("button", { name: "Save settings" }).click();

  await expect(page.getByText("Business settings saved.")).toBeVisible({
    timeout: 20_000,
  });
  await expect(reloadedInAppInquirySwitch).toHaveAttribute("data-state", "checked");
  await expect(reloadedEmailQuoteResponseSwitch).toHaveAttribute(
    "data-state",
    "checked",
  );
});
