import { expect, test, type Page } from "@playwright/test";

async function expectBodyScrollUnlocked(page: Page) {
  await expect
    .poll(() => page.evaluate(() => document.body.hasAttribute("data-scroll-locked")))
    .toBe(false);
}

for (const colorScheme of ["light", "dark"] as const) {
  test(`marketing pixel background stays viewport-fixed in ${colorScheme} mode`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme, reducedMotion: "no-preference" });
    await page.goto("/");

    const background = page.getByTestId("marketing-background");
    await expect(background).toHaveAttribute("aria-hidden", "true");
    await expect(background).toHaveCSS("position", "fixed");
    await expect(background).toHaveCSS("pointer-events", "none");
    await expect(background).toHaveCSS("z-index", "-1");
    if (colorScheme === "dark") {
      await expect(page.locator("html")).toHaveClass(/\bdark\b/);
    } else {
      await expect(page.locator("html")).not.toHaveClass(/\bdark\b/);
    }

    const initialBox = await background.boundingBox();
    expect(initialBox).toEqual({
      x: 0,
      y: 0,
      ...page.viewportSize(),
    });

    const getPixelChecksum = () =>
      background.evaluate((canvas: HTMLCanvasElement) => {
        const ctx = canvas.getContext("2d");
        if (!ctx) return 0;
        const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        let sum = 0;
        for (let i = 3; i < data.length; i += 32) {
          sum = (sum + data[i]) % 1000000;
        }
        return sum;
      });

    // Wait for the initial frame to be drawn (non-zero content)
    await expect.poll(getPixelChecksum, { timeout: 10000 }).toBeGreaterThan(0);

    // Then verify animation: checksum should change between frames
    const initialChecksum = await getPixelChecksum();
    await expect.poll(getPixelChecksum, { timeout: 10000 }).not.toBe(initialChecksum);

    await page.evaluate(() => window.scrollTo({ top: 1000, behavior: "instant" }));
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
    expect(await background.boundingBox()).toEqual(initialBox);

    // Dots stay off on mobile: the canvas is hidden below sm
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(background).toBeHidden();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(391);
  });
}

test("marketing pixel background respects reduced motion and print", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");

  const background = page.getByTestId("marketing-background");
  await expect(background).toBeVisible();

  const getPixelChecksum = () =>
    background.evaluate((canvas: HTMLCanvasElement) => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return 0;
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      let sum = 0;
      for (let i = 3; i < data.length; i += 32) {
        sum = (sum + data[i]) % 1000000;
      }
      return sum;
    });

  // Wait for the static frame to be rendered
  await expect.poll(getPixelChecksum).toBeGreaterThan(0);

  const checksum1 = await getPixelChecksum();
  await page.waitForTimeout(300);
  const checksum2 = await getPixelChecksum();
  expect(checksum2).toBe(checksum1);

  await page.emulateMedia({ media: "print" });
  await expect(background).toBeHidden();
});

test("landing hard-load has zero hydration errors and demo dialog opens", async ({
  page,
}) => {
  const hydrationErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") {
      const text = message.text();
      if (/hydration|didn't match the client/i.test(text)) {
        hydrationErrors.push(text);
      }
    }
  });
  page.on("pageerror", (error) => {
    if (/hydration/i.test(error.message)) {
      hydrationErrors.push(error.message);
    }
  });

  await page.goto("/");
  await page.waitForLoadState("networkidle");

  // Hero trigger renders as a button (issue #72: server once emitted
  // <span class="contents"> while the client rendered <button>).
  const heroCta = page
    .getByRole("button", { name: "Book a demo" })
    .first();
  await expect(heroCta).toBeVisible();
  expect(await heroCta.evaluate((node) => node.tagName)).toBe("BUTTON");

  await heroCta.click();
  await expect(
    page.getByRole("dialog", { name: "Book a demo" }),
  ).toBeVisible();

  expect(hydrationErrors).toEqual([]);
});

test("marketing homepage highlights the signup-first workflow", async ({
  page,
}) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  await expect(
    page.getByRole("heading", {
      name: /Manage every inquiry\./,
    }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Start free" }).first()).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: /Every missed inquiry is an opportunity someone else can win\./,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: /Keep every opportunity moving\./,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: /One connected workflow from inquiry to (?:booked job|accepted quote)\./,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: /Questions you’re probably asking\./,
    }),
  ).toBeVisible();
  await expect(
    page.getByText("What exactly does Requo do?"),
  ).toBeVisible();
  await expect(
    page.getByRole("img", {
      name: "Requo quote management dashboard showing inquiry inbox, quote builder, and follow-up schedule for service businesses",
    }),
  ).toBeVisible();
});

test("marketing homepage stays readable on a narrow viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  const mobileMenu = page.getByRole("button", { name: "Open navigation" });
  const primaryCta = page.getByRole("link", { name: "Start free" }).first();
  const secondaryCta = page.getByRole("button", { name: "Book a demo" }).first();

  await expect(mobileMenu).toBeVisible();
  await expect(primaryCta).toBeVisible();
  await expect(secondaryCta).toBeVisible();

  const primaryBox = await primaryCta.boundingBox();
  const secondaryBox = await secondaryCta.boundingBox();

  expect(primaryBox).not.toBeNull();
  expect(secondaryBox).not.toBeNull();

  const hasHorizontalOverflow = await page.evaluate(() => {
    return document.documentElement.scrollWidth > window.innerWidth + 1;
  });

  expect(hasHorizontalOverflow).toBe(false);

  const faqHeading = page.getByRole("heading", {
    name: /Questions you’re probably asking\./,
  });

  await faqHeading.scrollIntoViewIfNeeded();
  await expect(faqHeading).toBeVisible();
});

test("marketing mobile nav opens fullscreen with grouped links", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  await page.getByRole("button", { name: "Open navigation" }).click();

  const overlay = page.locator('[data-slot="sheet-overlay"][data-state="open"]');
  const panel = page.locator('[data-slot="sheet-content"]');

  await expect(page.getByRole("heading", { name: "Navigation" })).toBeVisible();
  await expect(overlay).toBeVisible();
  await expectBodyScrollUnlocked(page);

  // Fullscreen takeover on mobile
  await expect
    .poll(() => panel.boundingBox(), { timeout: 10000 })
    .toEqual({ x: 0, y: 0, width: 390, height: 844 });

  // Desktop IA mirrored: grouped links plus Pricing
  for (const name of ["Product", "Solutions", "Resources"]) {
    await expect(panel.getByText(name, { exact: true })).toBeVisible();
  }
  await expect(
    panel.getByRole("link", { name: /Capture requests from forms/ }),
  ).toBeVisible();
  await expect(panel.getByRole("link", { name: "Pricing" })).toBeVisible();

  await page.keyboard.press("Escape");

  await expect(page.getByRole("heading", { name: "Navigation" })).toBeHidden();
});

test("marketing footer displays brand, navigation columns, socials, and copyright", async ({
  page,
}) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  const footer = page.locator("footer");
  await footer.scrollIntoViewIfNeeded();
  await expect(footer).toBeVisible();

  // Brand link
  await expect(footer.getByRole("link", { name: "Requo home" })).toBeVisible();

  // Column headings
  await expect(footer.getByText("PLATFORM")).toBeVisible();
  await expect(footer.getByText("RESOURCES")).toBeVisible();
  await expect(footer.getByText("LEGAL")).toBeVisible();
  await expect(footer.getByText("SOCIALS")).toBeVisible();

  // Links
  await expect(footer.getByRole("link", { name: "Inquiries" })).toBeVisible();
  await expect(footer.getByRole("link", { name: "Quotes" })).toBeVisible();
  await expect(footer.getByRole("link", { name: "Pricing" })).toBeVisible();
  await expect(footer.getByRole("link", { name: "Terms of use" })).toBeVisible();
  await expect(footer.getByRole("link", { name: "Privacy policy" })).toBeVisible();

  // Socials
  await expect(footer.getByRole("link", { name: "X (Twitter)" })).toHaveAttribute(
    "href",
    "https://x.com/requoapp",
  );
  await expect(footer.getByRole("link", { name: "LinkedIn" })).toHaveAttribute(
    "href",
    "https://www.linkedin.com/company/requo-app",
  );
  await expect(footer.getByRole("link", { name: "GitHub" })).toHaveAttribute(
    "href",
    "https://github.com/marrrkkk/requo",
  );

  // Copyright
  await expect(footer.getByText("© 2026 Requo, Inc. All rights reserved.").first()).toBeVisible();
});

