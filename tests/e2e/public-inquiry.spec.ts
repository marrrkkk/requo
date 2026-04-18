import { expect, test } from "@playwright/test";

import { demoBusinessSlug } from "./fixtures";

test("invalid public inquiry links show the public not-found state", async ({
  page,
}) => {
  await page.goto("/inquire/not-a-real-business");

  await expect(
    page.getByText("This public page is unavailable."),
  ).toBeVisible();
});

test("public inquiry page rejects unsupported attachments", async ({ page }) => {
  await page.goto(`/inquire/${demoBusinessSlug}`);
  await page.waitForLoadState("networkidle");

  await page.getByLabel("Your name").fill("Taylor Nguyen");
  await page
    .getByLabel("Email address")
    .fill(`taylor+invalid-file-${Date.now()}@example.com`);
  await page.getByLabel("Service or category").fill("Window graphics");
  await page
    .getByLabel("Message and details")
    .fill("Need storefront graphics and want to send a sample file.");
  await page.getByLabel("Attachment").setInputFiles({
    name: "malware.exe",
    mimeType: "application/x-msdownload",
    buffer: Buffer.from("pretend-binary"),
  });

  await page.getByRole("button", { name: "Send inquiry" }).click();

  await expect(
    page.getByText("Upload a PDF, common document file, or image."),
  ).toBeVisible();
});

test("public inquiry page accepts a new submission @smoke", async ({ page }) => {
  await page.goto(`/inquire/${demoBusinessSlug}`);
  await page.waitForLoadState("networkidle");

  await page.locator("#inquiry-customerName:visible").fill("Taylor Nguyen");
  await page
    .locator("#inquiry-customerEmail:visible")
    .fill(`taylor+${Date.now()}@example.com`);
  await page
    .locator("#inquiry-customerPhone:visible")
    .fill("+1 415 555 0199");
  await page
    .locator("#inquiry-serviceCategory:visible")
    .fill("Window graphics");
  await page.locator("#inquiry-budgetText:visible").fill("Around $1,500");
  await page
    .locator("#inquiry-details:visible")
    .fill(
      "Need two front-window vinyl panels and a smaller door decal for a spring refresh.",
    );

  await page.getByRole("button", { name: "Send inquiry" }).click();

  await expect(page.getByText("Inquiry received.")).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByText(/^Reference inq_/)).toBeVisible({
    timeout: 20_000,
  });
});
