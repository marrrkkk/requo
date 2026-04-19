import "server-only";

import { PDFDocument } from "pdf-lib";

const A4_PAGE_WIDTH = 595.28;
const A4_PAGE_HEIGHT = 841.89;

export async function createPdfFromPng({
  png,
  title,
}: {
  png: Uint8Array;
  title?: string;
}) {
  const pdfDocument = await PDFDocument.create();
  const image = await pdfDocument.embedPng(png);
  const scale = A4_PAGE_WIDTH / image.width;
  const scaledHeight = image.height * scale;
  const pageCount = Math.max(1, Math.ceil(scaledHeight / A4_PAGE_HEIGHT));

  if (title) {
    pdfDocument.setTitle(title);
  }

  for (let pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
    const page = pdfDocument.addPage([A4_PAGE_WIDTH, A4_PAGE_HEIGHT]);

    page.drawImage(image, {
      x: 0,
      y: A4_PAGE_HEIGHT - scaledHeight + pageIndex * A4_PAGE_HEIGHT,
      width: A4_PAGE_WIDTH,
      height: scaledHeight,
    });
  }

  return pdfDocument.save();
}
