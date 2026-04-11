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
  await page.locator("#password").fill(demoOwnerPassword);
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

function getPreviewOverlay(page: Page) {
  return page.getByTestId("inquiry-form-preview-overlay");
}

async function openPreview(page: Page) {
  await page.getByRole("button", { name: "Preview" }).click();
  await expect(getPreviewOverlay(page)).toBeVisible();
}

async function closePreview(page: Page) {
  const overlay = getPreviewOverlay(page);
  await overlay.getByRole("button", { name: "Back to editor" }).click();
  await expect(overlay).toBeHidden();
}

async function dragLocatorToLocator(
  page: Page,
  source: Locator,
  target: Locator,
) {
  await source.scrollIntoViewIfNeeded();
  await target.scrollIntoViewIfNeeded();

  const sourceBox = await source.boundingBox();
  const targetBox = await target.boundingBox();

  if (!sourceBox || !targetBox) {
    throw new Error("Drag source or target is not visible.");
  }

  await page.mouse.move(
    sourceBox.x + sourceBox.width / 2,
    sourceBox.y + sourceBox.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    sourceBox.x + sourceBox.width / 2,
    sourceBox.y + sourceBox.height / 2 + 16,
    {
      steps: 6,
    },
  );
  await page.mouse.move(
    targetBox.x + targetBox.width / 2,
    targetBox.y + targetBox.height / 2,
    {
      steps: 16,
    },
  );
  await page.mouse.up();
}

async function expectDocumentOrder(page: Page, locators: Locator[]) {
  const handles = await Promise.all(
    locators.map(async (locator) => {
      await expect(locator).toBeVisible();
      return locator.elementHandle();
    }),
  );

  for (const handle of handles) {
    expect(handle).not.toBeNull();
  }

  const isOrdered = await page.evaluate((elements) => {
    return elements.every((element, index) => {
      if (index === 0) {
        return true;
      }

      return Boolean(
        elements[index - 1].compareDocumentPosition(element) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      );
    });
  }, handles as NonNullable<(typeof handles)[number]>[]);

  expect(isOrdered).toBeTruthy();
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

  await openBusinessesPage(page, "/settings/replies");

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

  await openBusinessesPage(page, "/settings/replies");

  const deletableSnippetCard = getSnippetCard(page, updatedTitle);
  await deletableSnippetCard.getByRole("button", { name: "Delete" }).click();

  await expect(getSnippetCard(page, updatedTitle)).toHaveCount(0, {
    timeout: 60_000,
  });
});

test("inquiry form preview reflects unsaved field and page edits in realtime", async ({
  page,
}) => {
  test.setTimeout(90_000);

  const updatedNameLabel = `Your full name ${Date.now()}`;
  const updatedHeadline = `Custom request preview ${Date.now()}`;

  await signIn(page);
  await openBusinessesPage(page, "/forms/project-request");
  await page.getByRole("button", { name: "Fields" }).click();

  const contactNameLabelInput = page.locator("#contact-customerName-label");
  const originalNameLabel = await contactNameLabelInput.inputValue();

  await contactNameLabelInput.fill(updatedNameLabel);

  await openPreview(page);
  const previewOverlay = getPreviewOverlay(page);

  await expect(previewOverlay.getByLabel(updatedNameLabel)).toBeVisible({
    timeout: 20_000,
  });

  await closePreview(page);
  await page.getByRole("button", { name: "Page" }).click();

  const headlineInput = page.locator("#inquiry-page-headline");
  const originalHeadline = await headlineInput.inputValue();

  await headlineInput.fill(updatedHeadline);
  await openPreview(page);

  await expect(
    previewOverlay.getByRole("heading", { name: updatedHeadline, exact: true }),
  ).toBeVisible({ timeout: 20_000 });

  await closePreview(page);
  await page.getByRole("button", { name: "Cancel" }).click();
  await openPreview(page);

  await expect(
    previewOverlay.getByRole("heading", { name: originalHeadline, exact: true }),
  ).toBeVisible({ timeout: 20_000 });

  await closePreview(page);
  await page.getByRole("button", { name: "Fields" }).click();
  await page.getByRole("button", { name: "Cancel" }).click();
  await openPreview(page);

  await expect(previewOverlay.getByLabel(originalNameLabel)).toBeVisible({
    timeout: 20_000,
  });
});

test("project fields can be dragged and the preview order persists after save", async ({
  page,
}) => {
  test.setTimeout(90_000);

  await signIn(page);
  await openBusinessesPage(page, "/forms/project-request");
  await page.getByRole("button", { name: "Fields" }).click();

  const budgetHandle = page.getByRole("button", { name: "Reorder Budget" });
  const quantityHandle = page.getByRole("button", { name: "Reorder Quantity" });

  await dragLocatorToLocator(page, budgetHandle, quantityHandle);
  await expect(
    page.getByRole("button", { name: "Reorder Budget" }),
  ).toBeVisible();

  await openPreview(page);
  const previewOverlay = getPreviewOverlay(page);

  await expectDocumentOrder(page, [
    previewOverlay.getByLabel("Project type"),
    previewOverlay.getByLabel("Budget"),
    previewOverlay.getByLabel("Quantity"),
  ]);

  await closePreview(page);
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Inquiry form saved.")).toBeVisible({
    timeout: 20_000,
  });

  const savedPreviewPage = await page.context().newPage();
  await savedPreviewPage.goto(
    `/businesses/${demoBusinessSlug}/preview/inquiry/project-request`,
  );
  await savedPreviewPage.waitForLoadState("networkidle");

  await expectDocumentOrder(savedPreviewPage, [
    savedPreviewPage.getByLabel("Project type"),
    savedPreviewPage.getByLabel("Budget"),
    savedPreviewPage.getByLabel("Quantity"),
  ]);

  await savedPreviewPage.close();
  await dragLocatorToLocator(
    page,
    page.getByRole("button", { name: "Reorder Quantity" }),
    page.getByRole("button", { name: "Reorder Budget" }),
  );
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Inquiry form saved.")).toBeVisible({
    timeout: 20_000,
  });
});

test("supporting card fields can be edited and previewed before save", async ({
  page,
}) => {
  test.setTimeout(90_000);

  const updatedCardTitle = `Specs first ${Date.now()}`;
  const updatedCardDescription =
    "Share the size, quantity, and any install constraints before we review the request.";

  await signIn(page);
  await openBusinessesPage(page, "/forms/project-request");
  await page.getByRole("button", { name: "Page" }).click();

  const titleInput = page.locator("#inquiry-card-title-specs");
  const descriptionInput = page.locator("#inquiry-card-description-specs");

  await titleInput.fill(updatedCardTitle);
  await descriptionInput.fill(updatedCardDescription);

  await expect(titleInput).toHaveValue(updatedCardTitle);
  await expect(descriptionInput).toHaveValue(updatedCardDescription);

  await openPreview(page);
  const previewOverlay = getPreviewOverlay(page);

  await expect(
    previewOverlay.getByRole("heading", {
      name: updatedCardTitle,
      exact: true,
    }),
  ).toBeVisible({ timeout: 20_000 });
  await expect(
    previewOverlay.getByText(updatedCardDescription, { exact: true }),
  ).toBeVisible();

  await closePreview(page);
  await page.getByRole("button", { name: "Cancel" }).click();
});

test("supporting cards can be dragged and the preview order persists after save", async ({
  page,
}) => {
  test.setTimeout(90_000);

  await signIn(page);
  await openBusinessesPage(page, "/forms/project-request");
  await page.getByRole("button", { name: "Page" }).click();

  const scheduleHandle = page.getByRole("button", { name: "Reorder Call out timing" });
  const specsHandle = page.getByRole("button", { name: "Reorder Specs first" });

  await dragLocatorToLocator(page, scheduleHandle, specsHandle);

  await openPreview(page);
  const previewOverlay = getPreviewOverlay(page);

  await expectDocumentOrder(page, [
    previewOverlay.getByRole("heading", { name: "Call out timing", exact: true }),
    previewOverlay.getByRole("heading", { name: "Specs first", exact: true }),
    previewOverlay.getByRole("heading", { name: "Send artwork", exact: true }),
  ]);

  await closePreview(page);
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Inquiry page saved.")).toBeVisible({
    timeout: 20_000,
  });

  const savedPreviewPage = await page.context().newPage();
  await savedPreviewPage.goto(
    `/businesses/${demoBusinessSlug}/preview/inquiry/project-request`,
  );
  await savedPreviewPage.waitForLoadState("networkidle");

  await expectDocumentOrder(savedPreviewPage, [
    savedPreviewPage.getByRole("heading", { name: "Call out timing", exact: true }),
    savedPreviewPage.getByRole("heading", { name: "Specs first", exact: true }),
    savedPreviewPage.getByRole("heading", { name: "Send artwork", exact: true }),
  ]);

  await savedPreviewPage.close();
  await dragLocatorToLocator(
    page,
    page.getByRole("button", { name: "Reorder Specs first" }),
    page.getByRole("button", { name: "Reorder Call out timing" }),
  );
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Inquiry page saved.")).toBeVisible({
    timeout: 20_000,
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

test("quotes and requests list exports honor filters and show export actions", async ({
  page,
}) => {
  await signIn(page);

  await openBusinessesPage(page, "/quotes?status=sent&sort=newest");
  const quotesExport = page.getByRole("link", { name: "Export CSV" });
  await expect(quotesExport).toBeVisible();
  await expect(page.getByRole("link", { name: "Create quote" })).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Create quote" }).locator(
      "svg[data-lucide='receipt-text']",
    ),
  ).toBeVisible();

  const quoteExportHref = await quotesExport.getAttribute("href");
  expect(quoteExportHref).toContain(
    `/api/business/${demoBusinessSlug}/quotes/export`,
  );
  expect(quoteExportHref).toContain("status=sent");
  expect(quoteExportHref).toContain("sort=newest");
  expect(quoteExportHref).not.toContain("page=");

  const quoteCsvResponse = await page.request.get(
    `/api/business/${demoBusinessSlug}/quotes/export?status=sent&sort=newest&page=2`,
  );
  expect(quoteCsvResponse.ok()).toBeTruthy();
  expect(quoteCsvResponse.headers()["content-type"]).toContain("text/csv");
  const quoteCsvText = await quoteCsvResponse.text();
  expect(quoteCsvText.startsWith("\uFEFF")).toBeTruthy();
  expect(quoteCsvText).toContain(
    "quote_number,title,customer_name,customer_email,status,post_acceptance_status,linked_inquiry_id,valid_until,total_amount,currency,created_at,sent_at,customer_responded_at",
  );
  expect(quoteCsvText).toContain(",sent,");

  await openBusinessesPage(page, "/inquiries?status=new&form=all&sort=newest");
  const inquiryExport = page.getByRole("link", { name: "Export CSV" });
  await expect(inquiryExport).toBeVisible();

  const inquiryExportHref = await inquiryExport.getAttribute("href");
  expect(inquiryExportHref).toContain(
    `/api/business/${demoBusinessSlug}/inquiries/export`,
  );
  expect(inquiryExportHref).toContain("status=new");
  expect(inquiryExportHref).toContain("sort=newest");
  expect(inquiryExportHref).not.toContain("page=");

  const inquiryCsvResponse = await page.request.get(
    `/api/business/${demoBusinessSlug}/inquiries/export?status=new&form=all&sort=newest&page=2`,
  );
  expect(inquiryCsvResponse.ok()).toBeTruthy();
  expect(inquiryCsvResponse.headers()["content-type"]).toContain("text/csv");
  const inquiryCsvText = await inquiryCsvResponse.text();
  expect(inquiryCsvText.startsWith("\uFEFF")).toBeTruthy();
  expect(inquiryCsvText).toContain(
    "inquiry_id,submitted_at,form_name,customer_name,customer_email,customer_phone,company_name,service_category,subject,status,budget_text,requested_deadline,details",
  );
  expect(inquiryCsvText).toContain(",new,");
});

test("inquiry detail exposes PDF export and print-safe document", async ({
  page,
}) => {
  await signIn(page);
  await openBusinessesPage(page, "/inquiries/demo_inquiry_quoted_booth_kit");

  await expect(page.getByRole("link", { name: "Export PDF" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Print" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Generate quote" })).toBeVisible();

  const pdfResponse = await page.request.get(
    `/api/business/${demoBusinessSlug}/inquiries/demo_inquiry_quoted_booth_kit/export`,
  );
  expect(pdfResponse.ok()).toBeTruthy();
  expect(pdfResponse.headers()["content-type"]).toContain("application/pdf");
  const pdfBuffer = await pdfResponse.body();
  expect(pdfBuffer.toString("utf-8", 0, 4)).toBe("%PDF");

  await page.goto(
    `/businesses/${demoBusinessSlug}/print/inquiries/demo_inquiry_quoted_booth_kit`,
  );
  await page.waitForLoadState("networkidle");

  await expect(page.getByRole("heading", { name: "Request summary" })).toBeVisible();
  await expect(page.getByText("Submitted fields")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Internal notes" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Activity log" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Status" })).toHaveCount(0);
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
