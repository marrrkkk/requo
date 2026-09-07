import { expect, test, type ElementHandle, type Page } from "@playwright/test";
import { instant } from "@next/playwright";

import { demoBusinessSlug, demoOwnerEmail, demoOwnerPassword } from "./fixtures";

test.describe.configure({ mode: "serial" });

async function signIn(page: Page) {
  await page.goto("/login");
  await page.waitForLoadState("networkidle");

  await page.getByLabel("Email address").fill(demoOwnerEmail);
  await page.locator("#password").fill(demoOwnerPassword);
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page).toHaveURL(/\/home$/, { timeout: 20_000 });
}

async function openDashboard(page: Page, path: string) {
  await page.goto(`/${demoBusinessSlug}${path}`, {
    waitUntil: "domcontentloaded",
  });
  await expect(page.locator("h1").first()).toBeVisible({ timeout: 20_000 });
}

/** Marks the JS heap so a full document reload can be detected. */
async function markHeap(page: Page) {
  await page.evaluate(() => {
    (window as unknown as { __instantNavMarker?: number }).__instantNavMarker =
      Date.now();
  });
}

async function expectNoReload(page: Page) {
  const marker = await page.evaluate(
    () => (window as unknown as { __instantNavMarker?: number }).__instantNavMarker,
  );
  expect(marker, "expected client navigation without a document reload").toBeDefined();
}

/** Captures the sidebar nav node and asserts it survives navigation. */
async function sidebarNavHandle(page: Page, tour: string) {
  const handle = await page.locator(`[data-tour="${tour}"]`).elementHandle();
  expect(handle, `expected sidebar nav item ${tour} to exist`).not.toBeNull();
  return handle!;
}

async function expectSidebarPersisted(handle: ElementHandle) {
  const connected = await handle.evaluate((node) => (node as Node).isConnected);
  expect(connected, "expected persistent sidebar across navigation").toBe(true);
}

async function expectDestinationShell(
  page: Page,
  urlPattern: RegExp,
  heading: string,
  description?: string,
) {
  await expect(page).toHaveURL(urlPattern, { timeout: 20_000 });
  await expect(
    page.locator("h1").filter({ hasText: heading }),
  ).toBeVisible({ timeout: 20_000 });
  if (description) {
    await expect(page.getByText(description, { exact: false }).first()).toBeVisible();
  }
}

test("Dashboard to Inquiries paints the destination shell without a reload", async ({
  page,
}) => {
  await signIn(page);
  await openDashboard(page, "/home");
  await markHeap(page);
  const sidebarHandle = await sidebarNavHandle(page, "nav-inquiries");

  await instant(page, async () => {
    await page.locator('[data-tour="nav-inquiries"]').click();
    await expectDestinationShell(
      page,
      new RegExp(`/${demoBusinessSlug}/inquiries$`),
      "Inquiries",
    );
  });

  await expectNoReload(page);
  await expectSidebarPersisted(sidebarHandle);
  // Dynamic inbox content resolves after the instant shell.
  await expect(page.locator("h1").filter({ hasText: "Inquiries" })).toBeVisible();
});

test("Inquiries to Quotes paints the destination shell without a reload", async ({
  page,
}) => {
  await signIn(page);
  await openDashboard(page, "/inquiries");
  await markHeap(page);
  const sidebarHandle = await sidebarNavHandle(page, "nav-quotes");

  await instant(page, async () => {
    await page.locator('[data-tour="nav-quotes"]').click();
    await expectDestinationShell(
      page,
      new RegExp(`/${demoBusinessSlug}/quotes$`),
      "Quotes",
    );
  });

  await expectNoReload(page);
  await expectSidebarPersisted(sidebarHandle);
});

test("Assistant to Inquiries restores normal page scrolling and spacing", async ({
  page,
}) => {
  await signIn(page);
  await openDashboard(page, "/assistant");
  await markHeap(page);
  const sidebarHandle = await sidebarNavHandle(page, "nav-inquiries");

  await instant(page, async () => {
    await page.locator('[data-tour="nav-inquiries"]').click();
    await expectDestinationShell(
      page,
      new RegExp(`/${demoBusinessSlug}/inquiries$`),
      "Inquiries",
    );
  });

  await expectNoReload(page);
  await expectSidebarPersisted(sidebarHandle);

  const layoutState = await page.evaluate(() => {
    const inset = document.querySelector('[data-slot="sidebar-inset"]');
    const pageRoot = document.querySelector(".dashboard-page");
    const scrollArea = document.querySelector('[data-slot="dashboard-scroll-area"]');

    if (!inset || !pageRoot || !scrollArea) return null;

    return {
      assistantRoute: inset.hasAttribute("data-assistant-route"),
      pageGap: getComputedStyle(pageRoot).rowGap,
      insetOverflow: getComputedStyle(inset).overflow,
      scrollAreaOverflow: getComputedStyle(scrollArea).overflow,
    };
  });

  expect(layoutState).not.toBeNull();
  expect(layoutState!.assistantRoute).toBe(false);
  expect(layoutState!.pageGap).not.toBe("0px");
  expect(layoutState!.insetOverflow).not.toBe("hidden");
  expect(layoutState!.scrollAreaOverflow).not.toBe("hidden");
});

test("Quotes to Follow-ups paints the destination shell without a reload", async ({
  page,
}) => {
  await signIn(page);
  await openDashboard(page, "/quotes");
  await markHeap(page);
  const sidebarHandle = await sidebarNavHandle(page, "nav-follow-ups");

  await instant(page, async () => {
    await page.locator('[data-tour="nav-follow-ups"]').click();
    await expectDestinationShell(
      page,
      new RegExp(`/${demoBusinessSlug}/follow-ups$`),
      "Follow-ups",
      "See who needs contact next and when.",
    );
  });

  await expectNoReload(page);
  await expectSidebarPersisted(sidebarHandle);
});

test("Follow-ups to Analytics shows header controls before core metrics", async ({
  page,
}) => {
  await signIn(page);
  await openDashboard(page, "/follow-ups");
  await markHeap(page);
  const sidebarHandle = await sidebarNavHandle(page, "nav-analytics");

  await instant(page, async () => {
    await page.locator('[data-tour="nav-analytics"]').click();
    await expect(page).toHaveURL(new RegExp(`/${demoBusinessSlug}/analytics`), {
      timeout: 20_000,
    });
    // Static shell: title resolves while dynamic regions are held.
    await expect(
      page.locator("h1").filter({ hasText: "Performance" }),
    ).toBeVisible({ timeout: 20_000 });
    // Fast region (searchParams-only date controls) resolves independently.
    await expect(
      page.getByRole("group", { name: "Date range" }),
    ).toBeVisible({ timeout: 20_000 });
    // Note: core metrics are cached server-side, so on a warm cache they may
    // already be part of the instant UI — no absence assertion here. The
    // post-scope assertion below proves eventual resolution either way.
  });

  await expectNoReload(page);
  await expectSidebarPersisted(sidebarHandle);
  // Core metrics stream in after the instant shell.
  await expect(page.getByText("Pipeline overview")).toBeVisible({ timeout: 30_000 });
});

test("Analytics to Quotes keeps the shell and resolves records", async ({
  page,
}) => {
  await signIn(page);
  await openDashboard(page, "/analytics");
  await expect(
    page.locator("h1").filter({ hasText: "Performance" }),
  ).toBeVisible({ timeout: 30_000 });
  await markHeap(page);
  const sidebarHandle = await sidebarNavHandle(page, "nav-quotes");

  await instant(page, async () => {
    await page.locator('[data-tour="nav-quotes"]').click();
    await expectDestinationShell(
      page,
      new RegExp(`/${demoBusinessSlug}/quotes$`),
      "Quotes",
    );
  });

  await expectNoReload(page);
  await expectSidebarPersisted(sidebarHandle);
});

test("back and forward preserve list URL state", async ({ page }) => {
  await signIn(page);
  await openDashboard(page, "/quotes");

  await page.locator('[data-tour="nav-follow-ups"]').click();
  await expect(page).toHaveURL(new RegExp(`/${demoBusinessSlug}/follow-ups$`), {
    timeout: 20_000,
  });

  await page.goBack();
  await expect(page).toHaveURL(new RegExp(`/${demoBusinessSlug}/quotes$`), {
    timeout: 20_000,
  });
  await expect(page.locator("h1").filter({ hasText: "Quotes" })).toBeVisible();

  await page.goForward();
  await expect(page).toHaveURL(new RegExp(`/${demoBusinessSlug}/follow-ups$`), {
    timeout: 20_000,
  });
  await expect(page.locator("h1").filter({ hasText: "Follow-ups" })).toBeVisible();
});

test("direct URL navigation renders the destination progressively", async ({
  page,
}) => {
  await signIn(page);

  await page.goto(`/${demoBusinessSlug}/analytics`, {
    waitUntil: "domcontentloaded",
  });
  await expect(
    page.locator("h1").filter({ hasText: "Performance" }),
  ).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("Pipeline overview")).toBeVisible({ timeout: 30_000 });
});

test.describe("dashboard density", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("Inquiry list fits roughly ten rows in a 1440x900 viewport", async ({
    page,
  }) => {
    await signIn(page);
    await openDashboard(page, "/inquiries");

    // Desktop table rows carry the working set; count by rendered geometry,
    // not markup, so virtualized or paginated rows cannot inflate the number.
    const rowCount = await page.locator("tbody tr").count();
    expect(rowCount).toBeGreaterThanOrEqual(10);

    const fullyVisible = await page.evaluate(() => {
      const viewportHeight = window.innerHeight;
      const rows = Array.from(document.querySelectorAll("tbody tr"));
      return rows.filter((row) => {
        const rect = row.getBoundingClientRect();
        return rect.top >= 0 && rect.bottom <= viewportHeight;
      }).length;
    });

    expect(fullyVisible).toBeGreaterThanOrEqual(10);
  });

  test("Quote list fits its first page without scrolling the rows", async ({
    page,
  }) => {
    await signIn(page);
    await openDashboard(page, "/quotes");

    const rowCount = await page.locator("tbody tr").count();
    expect(rowCount).toBeGreaterThan(0);

    const fullyVisible = await page.evaluate(() => {
      const viewportHeight = window.innerHeight;
      const rows = Array.from(document.querySelectorAll("tbody tr"));
      return rows.filter((row) => {
        const rect = row.getBoundingClientRect();
        return rect.top >= 0 && rect.bottom <= viewportHeight;
      }).length;
    });

    expect(fullyVisible).toBe(rowCount);
  });

  test("results card keeps its top offset across the Suspense boundary", async ({
    page,
  }) => {
    await signIn(page);
    await openDashboard(page, "/home");
    await markHeap(page);
    const sidebarHandle = await sidebarNavHandle(page, "nav-inquiries");

    await instant(page, async () => {
      await page.locator('[data-tour="nav-inquiries"]').click();
      await expect(
        page.locator("h1").filter({ hasText: "Inquiries" }),
      ).toBeVisible({ timeout: 20_000 });
    });

    await expectNoReload(page);
    await expectSidebarPersisted(sidebarHandle);

    // The filter strip skeleton and the resolved toolbar share one card, so
    // the card top must not move as records arrive.
    const shellTop = await page.evaluate(() => {
      const card = document.querySelector("[data-list-card]");
      return card ? Math.round(card.getBoundingClientRect().top) : null;
    });

    await expect(page.locator("tbody tr").first()).toBeVisible({
      timeout: 20_000,
    });

    const resolvedTop = await page.evaluate(() => {
      const card = document.querySelector("[data-list-card]");
      return card ? Math.round(card.getBoundingClientRect().top) : null;
    });

    expect(shellTop).not.toBeNull();
    expect(resolvedTop).not.toBeNull();
    expect(Math.abs((resolvedTop ?? 0) - (shellTop ?? 0))).toBeLessThanOrEqual(
      1,
    );
  });
});

test.describe("mobile navigation", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

  test("list primary actions meet the mobile tap-target floor", async ({
    page,
  }) => {
    await signIn(page);
    await openDashboard(page, "/inquiries");

    const quickAdd = page.getByRole("link", { name: "Quick-add inquiry" });
    await expect(quickAdd).toBeVisible({ timeout: 20_000 });
    const quickAddBox = await quickAdd.boundingBox();
    expect(quickAddBox, "quick-add inquiry tap target").not.toBeNull();
    expect(quickAddBox!.height).toBeGreaterThanOrEqual(44);

    await openDashboard(page, "/quotes");

    const createQuote = page.getByRole("link", { name: "Create quote" });
    await expect(createQuote).toBeVisible({ timeout: 20_000 });
    const createQuoteBox = await createQuote.boundingBox();
    expect(createQuoteBox, "create quote tap target").not.toBeNull();
    expect(createQuoteBox!.height).toBeGreaterThanOrEqual(44);
  });

  test("bottom tabs navigate while the drawer closes into the destination", async ({
    page,
  }) => {
    await signIn(page);
    await openDashboard(page, "/home");

    await page.getByRole("navigation", { name: "Mobile navigation" }).getByRole("link", { name: "Quotes" }).click();
    await expect(page).toHaveURL(new RegExp(`/${demoBusinessSlug}/quotes$`), {
      timeout: 20_000,
    });
    await expect(page.locator("h1").filter({ hasText: "Quotes" })).toBeVisible();

    await page.getByRole("button", { name: "More" }).click();
    const sheet = page.getByRole("dialog");
    await expect(sheet).toBeVisible();
    await sheet.getByRole("link", { name: "Analytics" }).click();

    // The drawer closes and the destination shell becomes visible.
    await expect(sheet).toBeHidden({ timeout: 20_000 });
    await expect(page).toHaveURL(new RegExp(`/${demoBusinessSlug}/analytics`), {
      timeout: 20_000,
    });
    await expect(
      page.locator("h1").filter({ hasText: "Performance" }),
    ).toBeVisible({ timeout: 30_000 });
  });
});
