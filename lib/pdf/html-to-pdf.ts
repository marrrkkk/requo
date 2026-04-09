import "server-only";

import { chromium } from "@playwright/test";

export async function renderHtmlPageToPdf({
  url,
  cookieHeader,
}: {
  url: string;
  cookieHeader?: string | null;
}) {
  const browser = await chromium.launch();

  try {
    const context = await browser.newContext({
      extraHTTPHeaders: cookieHeader
        ? {
            cookie: cookieHeader,
          }
        : undefined,
    });
    const page = await context.newPage();
    await page.goto(url, {
      waitUntil: "networkidle",
    });
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      margin: {
        top: "8mm",
        right: "8mm",
        bottom: "8mm",
        left: "8mm",
      },
    });
    await context.close();

    return pdf;
  } finally {
    await browser.close();
  }
}
