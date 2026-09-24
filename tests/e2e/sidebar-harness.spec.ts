import { expect, test } from "@playwright/test";

test.use({
  viewport: { width: 1440, height: 900 },
  launchOptions: { args: ["--disable-features=OverlayScrollbar"] },
});

const cases = [
  { name: "baseline", query: "" },
  { name: "wide-no-clip", query: "?wide=1" },
  { name: "wide-clip", query: "?wide=1&clip=1" },
];

for (const c of cases) {
  test(`harness ${c.name}`, async ({ page }) => {
    await page.goto(`file:///C:/Users/Mark/orca/workspaces/requo/fix-ui-ux/reports/sidebar-harness.html${c.query}`);
    await page.waitForTimeout(300);
    const probe = await page.evaluate(() => {
      const el = document.createElement("div");
      el.style.cssText = "position:fixed;top:0;left:0;height:100vh;width:100vw;visibility:hidden";
      document.body.appendChild(el);
      const r = el.getBoundingClientRect();
      const vh100 = r.height;
      const vw100 = r.width;
      el.remove();
      const el2 = document.createElement("div");
      el2.style.cssText = "position:fixed;top:0;left:0;height:100svh;visibility:hidden";
      document.body.appendChild(el2);
      const svh100 = el2.getBoundingClientRect().height;
      el2.remove();
      return { vh100, vw100, svh100, innerH: window.innerHeight, innerW: window.innerWidth };
    });
    console.log(JSON.stringify({ case: c.name, probe }));
    const top = await page.evaluate(() => (window as any).__measure("top"));
    console.log(JSON.stringify(top));
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await page.waitForTimeout(400);
    const bottom = await page.evaluate(() => (window as any).__measure("bottom"));
    console.log(JSON.stringify(bottom));
    expect(true).toBe(true);
  });
}
