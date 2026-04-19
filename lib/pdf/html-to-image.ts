import "server-only";

import { chromium } from "@playwright/test";

const EXPORT_VIEWPORT = {
  width: 1440,
  height: 2000,
} as const;

export async function renderHtmlPageElementToPng({
  url,
  selector,
  cookieHeader,
}: {
  url: string;
  selector: string;
  cookieHeader?: string | null;
}) {
  const browser = await chromium.launch();

  try {
    const context = await browser.newContext({
      colorScheme: "light",
      deviceScaleFactor: 2,
      viewport: EXPORT_VIEWPORT,
      extraHTTPHeaders: cookieHeader
        ? {
            cookie: cookieHeader,
          }
        : undefined,
    });
    const page = await context.newPage();

    await page.emulateMedia({
      media: "screen",
    });
    await page.goto(url, {
      waitUntil: "networkidle",
    });
    await page.evaluate(async () => {
      document.documentElement.classList.remove("dark");
      document.documentElement.style.colorScheme = "light";
      document.body.style.colorScheme = "light";
      await document.fonts.ready;
    });

    const documentElement = page.locator(selector);
    await documentElement.waitFor({ state: "visible" });

    const png = await documentElement.screenshot({
      animations: "disabled",
      caret: "hide",
      type: "png",
    });

    await context.close();

    return png;
  } finally {
    await browser.close();
  }
}
