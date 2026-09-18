import { expect, test, type Page } from "@playwright/test";

import {
  seededAdminEmail,
  seededAdminPassword,
  seededNonAdminEmail,
  seededNonAdminPassword,
} from "./fixtures";

/**
 * `/admin` authorization boundary.
 *
 * The behaviour under test is that a non-admin never receives the admin console
 * — not merely that they are eventually redirected. Before the proxy gate, an
 * anonymous `GET /admin` answered `200` with a 162 KB body containing the admin
 * shell, then redirected client-side. These specs pin the status code *and* the
 * absence of the chrome.
 *
 * Credentials come from `seeded*` in `fixtures.ts` (hard-coded in
 * `scripts/seed.ts`), not the `demo*` exports, which point at accounts this
 * seed does not create.
 */

const ADMIN_SHELL_SEEN_KEY = "__adminShellSeen";

/**
 * Records whether the admin shell was ever painted, in `sessionStorage` so the
 * flag survives the MPA navigation the 403 triggers.
 *
 * A plain `window` flag is not enough: it resets on every new document, so a
 * flash-then-redirect regression would look identical to a clean 403. Only
 * `sessionStorage` proves *no document in this tab ever painted the shell*.
 */
const NO_FLASH_PROBE = `
(() => {
  const key = ${JSON.stringify(ADMIN_SHELL_SEEN_KEY)};
  const mark = () => {
    try {
      if (!document.querySelector("[data-admin-shell]")) return;
      sessionStorage.setItem(key, "1");
    } catch {}
  };
  mark();
  new MutationObserver(mark).observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
})();
`;

async function signIn(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.waitForLoadState("networkidle");

  await page.getByLabel("Email address").fill(email);
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();

  await page.waitForURL((url) => !url.pathname.startsWith("/login"), {
    timeout: 30_000,
  });
}

/** Asserts the admin chrome was never painted in this tab. */
async function expectAdminShellNeverPainted(page: Page) {
  const seen = await page.evaluate(
    (key) => sessionStorage.getItem(key),
    ADMIN_SHELL_SEEN_KEY,
  );

  expect(
    seen,
    "the admin shell was painted at some point in this tab",
  ).toBeNull();
}

/**
 * The `403` renders the same UI as the `404` — `app/forbidden.tsx` is a copy of
 * `app/not-found.tsx` with the numeral swapped — so the copy is shared and the
 * numeral is the only thing that identifies this page. Assert on that.
 */
const forbiddenStatus = "403";

test.describe("/admin authorization", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(NO_FLASH_PROBE);
  });

  test("an unauthenticated visitor is sent to sign in, not shown the console", async ({
    page,
  }) => {
    test.setTimeout(120_000);

    await page.goto("/admin");

    await expect(page).toHaveURL(/\/login$/, { timeout: 30_000 });
    await expect(page.locator("[data-admin-shell]")).toHaveCount(0);
    await expectAdminShellNeverPainted(page);
  });

  test("a non-admin gets a real 403 with no admin chrome", async ({ page }) => {
    test.setTimeout(120_000);

    await signIn(page, seededNonAdminEmail, seededNonAdminPassword);

    const response = await page.goto("/admin");

    expect(response?.status()).toBe(403);
    await expect(page.getByText(forbiddenStatus, { exact: true })).toBeVisible();
    await expect(page.locator("[data-admin-shell]")).toHaveCount(0);
    await expectAdminShellNeverPainted(page);
  });

  test("a nested admin route is refused the same way", async ({ page }) => {
    test.setTimeout(120_000);

    await signIn(page, seededNonAdminEmail, seededNonAdminPassword);

    const response = await page.goto("/admin/users");

    expect(response?.status()).toBe(403);
    await expect(page.getByText(forbiddenStatus, { exact: true })).toBeVisible();
    await expectAdminShellNeverPainted(page);
  });

  test("a stale in-app link to /admin lands on the 403 page", async ({
    page,
  }) => {
    test.setTimeout(120_000);

    await signIn(page, seededNonAdminEmail, seededNonAdminPassword);

    // A non-admin is never shown an admin link, so this simulates a client that
    // still holds one — e.g. an admin who was demoted while their tab was open.
    await page.evaluate(() => {
      const link = document.createElement("a");
      link.id = "stale-admin-link";
      link.href = "/admin";
      link.textContent = "Admin";
      document.body.appendChild(link);
    });

    await page.click("#stale-admin-link");

    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByText(forbiddenStatus, { exact: true })).toBeVisible();
    await expect(page.locator("[data-admin-shell]")).toHaveCount(0);
    await expectAdminShellNeverPainted(page);
  });

  test("the router's RSC request for /admin is refused as well", async ({
    page,
  }) => {
    test.setTimeout(120_000);

    await signIn(page, seededNonAdminEmail, seededNonAdminPassword);

    const response = await page.request.get("/admin", {
      headers: { RSC: "1" },
    });

    expect(response.status()).toBe(403);
    expect(await response.text()).not.toContain("data-admin-shell");
  });

  test("a cold session cache is still refused", async ({ page }) => {
    test.setTimeout(120_000);

    await signIn(page, seededNonAdminEmail, seededNonAdminPassword);

    // Drop only the cookie cache, keeping the session token. This is the state
    // after ~5 minutes idle (the cache cookie's `maxAge` is 300s and Better Auth
    // does not refresh it on read), and it forces the proxy's database-backed
    // fallback instead of its cookie fast path.
    await page.context().clearCookies({ name: "better-auth.session_data" });

    const response = await page.goto("/admin");

    expect(response?.status()).toBe(403);
    await expect(page.getByText(forbiddenStatus, { exact: true })).toBeVisible();
    await expectAdminShellNeverPainted(page);
  });

  test("an admin still gets the console", async ({ page }) => {
    test.setTimeout(120_000);

    await signIn(page, seededAdminEmail, seededAdminPassword);

    const response = await page.goto("/admin");

    expect(response?.status()).toBe(200);
    await expect(page.locator("[data-admin-shell]")).toBeVisible({
      timeout: 30_000,
    });
  });
});
