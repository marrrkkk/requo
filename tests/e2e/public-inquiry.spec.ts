import { expect, test } from "@playwright/test";

import { demoWorkspaceSlug } from "./fixtures";

test("public inquiry page accepts a new submission", async ({ page }) => {
  await page.goto(`/inquire/${demoWorkspaceSlug}`);
  await page.waitForLoadState("networkidle");

  await page.getByLabel("Your name").fill("Taylor Nguyen");
  await page
    .getByLabel("Email address")
    .fill(`taylor+${Date.now()}@example.com`);
  await page.getByLabel("Phone number").fill("+1 415 555 0199");
  await page.getByLabel("Service or category").fill("Window graphics");
  await page.getByLabel("Budget").fill("Around $1,500");
  await page
    .getByLabel("Message and details")
    .fill(
      "Need two front-window vinyl panels and a smaller door decal for a spring refresh.",
    );

  await page.getByRole("button", { name: "Send inquiry" }).click();

  await expect(page.getByText("Inquiry received.")).toBeVisible();
  await expect(page.getByText(/^Reference inq_/)).toBeVisible();
});
