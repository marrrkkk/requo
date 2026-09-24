import { expect, test } from "@playwright/test";

import { demoBusinessSlug, demoOwnerEmail, demoOwnerPassword } from "./fixtures";

test.use({ viewport: { width: 1440, height: 900 } });

test("measure sidebar shift on /home", async ({ page }) => {
  await page.goto("/login");
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Email address").fill(demoOwnerEmail);
  await page.locator("#password").fill(demoOwnerPassword);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForTimeout(5000);
  const loginState = await page.evaluate(() => ({
    url: window.location.href,
    bodyText: document.body.innerText.slice(0, 2000),
  }));
  console.log(JSON.stringify({ phase: "login", ...loginState }, null, 1));
  await expect(page).toHaveURL(/\/home$/, { timeout: 20_000 });

  // Let streamed slots (checklist, user menu) resolve.
  await page.waitForTimeout(3000);

  const top = await page.evaluate(() => {
    const doc = document.documentElement;
    const wrapper = document.querySelector(
      '[data-slot="sidebar-wrapper"]',
    ) as HTMLElement | null;
    const sticky = wrapper?.querySelector(
      ":scope > div > div.sticky",
    ) as HTMLElement | null;
    const aside = wrapper?.querySelector("aside") as HTMLElement | null;
    const stickyRect = sticky?.getBoundingClientRect();
    const asideRect = aside?.getBoundingClientRect();
    return {
      scrollY: window.scrollY,
      maxScroll: doc.scrollHeight - window.innerHeight,
      docScrollWidth: doc.scrollWidth,
      docClientWidth: doc.clientWidth,
      innerHeight: window.innerHeight,
      docClientHeight: doc.clientHeight,
      stickyTop: stickyRect?.top ?? null,
      stickyHeight: stickyRect?.height ?? null,
      asideTop: asideRect?.top ?? null,
      asideHeight: asideRect?.height ?? null,
      asideBottom: asideRect?.bottom ?? null,
    };
  });
  console.log(JSON.stringify({ phase: "top", ...top }, null, 1));

  await page.evaluate(() => {
    window.scrollTo(0, document.documentElement.scrollHeight);
  });
  await page.waitForTimeout(800);

  const bottom = await page.evaluate(() => {
    const doc = document.documentElement;
    const wrapper = document.querySelector(
      '[data-slot="sidebar-wrapper"]',
    ) as HTMLElement | null;
    const sticky = wrapper?.querySelector(
      ":scope > div > div.sticky",
    ) as HTMLElement | null;
    const aside = wrapper?.querySelector("aside") as HTMLElement | null;
    const stickyRect = sticky?.getBoundingClientRect();
    const asideRect = aside?.getBoundingClientRect();

    // Walk the main column for horizontal overflow offenders.
    const offenders: Array<{
      tag: string;
      cls: string;
      scrollW: number;
      clientW: number;
    }> = [];
    const seen = new Set<Element>();
    const main = document.querySelector('[data-slot="sidebar-inset"]');
    if (main) {
      const walker = document.createTreeWalker(main, NodeFilter.SHOW_ELEMENT);
      let node = walker.nextNode() as Element | null;
      let count = 0;
      while (node && count < 4000) {
        count += 1;
        const el = node as HTMLElement;
        if (
          el.scrollWidth > el.clientWidth + 1 &&
          el.clientWidth > 0 &&
          !seen.has(el)
        ) {
          seen.add(el);
          offenders.push({
            tag: el.tagName,
            cls: (el.className?.toString?.() ?? "").slice(0, 160),
            scrollW: el.scrollWidth,
            clientW: el.clientWidth,
          });
          if (offenders.length >= 25) break;
        }
        node = walker.nextNode() as Element | null;
      }
    }
    return {
      scrollY: window.scrollY,
      maxScroll: doc.scrollHeight - window.innerHeight,
      docScrollWidth: doc.scrollWidth,
      docClientWidth: doc.clientWidth,
      innerHeight: window.innerHeight,
      docClientHeight: doc.clientHeight,
      stickyTop: stickyRect?.top ?? null,
      stickyHeight: stickyRect?.height ?? null,
      asideTop: asideRect?.top ?? null,
      asideHeight: asideRect?.height ?? null,
      asideBottom: asideRect?.bottom ?? null,
      offenders,
    };
  });
  console.log(JSON.stringify({ phase: "bottom", ...bottom }, null, 1));

  await page.screenshot({ path: "reports/sidebar-bottom.png" });
});
