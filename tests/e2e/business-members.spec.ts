import { expect, test, type Page } from "@playwright/test";

import {
  demoBusinessSlug,
  demoManagerEmail,
  demoManagerPassword,
  demoOutsiderEmail,
  demoOutsiderPassword,
  demoOwnerEmail,
  demoOwnerPassword,
  demoPendingInviteEmail,
  demoPendingInvitePassword,
  demoPendingInviteToken,
  demoStaffEmail,
  demoStaffPassword,
} from "./fixtures";

test.describe.configure({ mode: "serial" });

async function signIn(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.waitForLoadState("networkidle");

  await page.getByLabel("Email address").fill(email);
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page).toHaveURL(/\/workspaces$/, { timeout: 20_000 });
}

test("owner can invite a new member from business settings", async ({ page }) => {
  const inviteEmail = `invite-${Date.now()}@example.com`;

  await signIn(page, demoOwnerEmail, demoOwnerPassword);
  await page.goto(`/businesses/${demoBusinessSlug}/settings/members`);
  await page.waitForLoadState("networkidle");

  await page.getByLabel("Email address").fill(inviteEmail);
  await page.getByRole("button", { name: "Send invite" }).click();

  const inviteRow = page
    .locator("div.rounded-3xl")
    .filter({ has: page.getByText(inviteEmail, { exact: true }) })
    .first();

  await expect(inviteRow).toBeVisible({
    timeout: 20_000,
  });
  await expect(
    inviteRow.getByRole("button", { name: "Copy invite link" }),
  ).toBeVisible();
});

test("invited user can sign in from the invite and accept access", async ({
  page,
}) => {
  await page.goto(`/invite/${demoPendingInviteToken}`);
  await page.waitForLoadState("networkidle");

  await expect(
    page.getByText("Join BrightSide Print Studio", { exact: true }),
  ).toBeVisible();

  await page.getByRole("link", { name: "Sign in" }).click();
  await page.getByLabel("Email address").fill(demoPendingInviteEmail);
  await page.locator("#password").fill(demoPendingInvitePassword);
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page).toHaveURL(new RegExp(`/invite/${demoPendingInviteToken}$`), {
    timeout: 20_000,
  });

  await page.getByRole("button", { name: "Accept invite" }).click();

  await expect(page).toHaveURL(
    new RegExp(`/businesses/${demoBusinessSlug}/dashboard$`),
    { timeout: 20_000 },
  );
  await expect(
    page.getByRole("heading", { name: "BrightSide Print Studio" }),
  ).toBeVisible();
});

test("manager can access operational settings but not members", async ({
  page,
}) => {
  await signIn(page, demoManagerEmail, demoManagerPassword);

  await page.goto(`/businesses/${demoBusinessSlug}/settings/replies`);
  await expect(page).toHaveURL(
    new RegExp(`/businesses/${demoBusinessSlug}/settings/replies$`),
    { timeout: 20_000 },
  );
  await expect(
    page.getByRole("heading", {
      name: "Saved follow-up replies",
      level: 1,
    }),
  ).toBeVisible();

  await page.goto(`/businesses/${demoBusinessSlug}/settings/members`);
  await expect(page).toHaveURL(
    new RegExp(`/businesses/${demoBusinessSlug}/dashboard$`),
    { timeout: 20_000 },
  );
});

test("staff can access inquiry work but not forms or operational settings", async ({
  page,
}) => {
  await signIn(page, demoStaffEmail, demoStaffPassword);

  await page.goto(`/businesses/${demoBusinessSlug}/inquiries`);
  await expect(page).toHaveURL(
    new RegExp(`/businesses/${demoBusinessSlug}/inquiries$`),
    { timeout: 20_000 },
  );
  await expect(page.getByRole("heading", { name: "Inquiries" })).toBeVisible();

  await page.goto(`/businesses/${demoBusinessSlug}/forms`);
  await expect(page).toHaveURL(
    new RegExp(`/businesses/${demoBusinessSlug}/dashboard$`),
    { timeout: 20_000 },
  );

  await page.goto(`/businesses/${demoBusinessSlug}/settings/replies`);
  await expect(page).toHaveURL(
    new RegExp(`/businesses/${demoBusinessSlug}/dashboard$`),
    { timeout: 20_000 },
  );

  await page.goto(`/businesses/${demoBusinessSlug}/settings/profile`);
  await expect(page).toHaveURL(
    new RegExp(`/businesses/${demoBusinessSlug}/settings/profile$`),
    { timeout: 20_000 },
  );
});

test("non-members cannot open another business dashboard @smoke", async ({ page }) => {
  await signIn(page, demoOutsiderEmail, demoOutsiderPassword);
  await expect(
    page.getByRole("heading", { name: "Your workspaces" }),
  ).toBeVisible();

  await page.goto(`/businesses/${demoBusinessSlug}/dashboard`);
  await expect(page).toHaveURL(/\/workspaces$/, { timeout: 20_000 });
  await expect(
    page.getByRole("heading", { name: "Your workspaces" }),
  ).toBeVisible();
});

test("owner can change a member role and remove them safely", async ({ page }) => {
  await signIn(page, demoOwnerEmail, demoOwnerPassword);
  await page.goto(`/businesses/${demoBusinessSlug}/settings/members`);
  await page.waitForLoadState("networkidle");

  const ownerRow = page
    .locator("div.rounded-3xl")
    .filter({ has: page.getByText(demoOwnerEmail, { exact: true }) })
    .first();
  await expect(
    ownerRow.getByText("Owner access stays unchanged here."),
  ).toBeVisible();

  const staffRow = page
    .locator("div.rounded-3xl")
    .filter({ has: page.getByText(demoStaffEmail, { exact: true }) })
    .first();

  await expect(staffRow).toBeVisible();

  await staffRow
    .locator('input[name="role"]')
    .evaluate((element) => {
      const input = element as HTMLInputElement;
      input.value = "manager";
    });
  await staffRow
    .locator("form")
    .first()
    .evaluate((form) => {
      (form as HTMLFormElement).requestSubmit();
    });

  await expect(staffRow).toContainText("Manager", {
    timeout: 20_000,
  });

  await staffRow.getByRole("button", { name: "Remove" }).click({ force: true });
  await expect(page.getByText(demoStaffEmail, { exact: true })).toHaveCount(0, {
    timeout: 20_000,
  });
});
