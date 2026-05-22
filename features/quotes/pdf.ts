import { sanitizeStorageFileName } from "@/lib/files";
import { PdfReport } from "@/lib/pdf/report";
import { rgb } from "pdf-lib";
import type { QuoteDocumentData } from "@/features/quotes/documents";
import { formatQuoteDate, formatQuoteMoney } from "@/features/quotes/utils";

export async function createQuotePdf(data: QuoteDocumentData) {
  const report = await PdfReport.create(`${data.quoteNumber} ${data.title}`);
  const pageRight = report.pageWidth - report.margin;

  // ═══════════════════════════════════════════════════════════════════
  // TOP: Business name (left) + "QUOTE" (right)
  // ═══════════════════════════════════════════════════════════════════

  const quoteLabel = "QUOTE";
  const quoteLabelWidth = report.boldFont.widthOfTextAtSize(quoteLabel, 32);

  report.drawWrappedText(data.businessName, {
    font: report.boldFont,
    size: 16,
    gapAfter: 0,
  });

  const labelY = report.y + 20;
  report.page.drawText(quoteLabel, {
    x: pageRight - quoteLabelWidth,
    y: labelY,
    font: report.boldFont,
    size: 32,
    color: report.colors.text,
  });

  const numText = `# ${data.quoteNumber}`;
  const numWidth = report.bodyFont.widthOfTextAtSize(numText, 10);
  report.page.drawText(numText, {
    x: pageRight - numWidth,
    y: labelY - 18,
    font: report.bodyFont,
    size: 10,
    color: report.colors.muted,
  });

  report.y -= 28;

  // ═══════════════════════════════════════════════════════════════════
  // INFO: Prepared for (left) + Date/Valid until (right)
  // ═══════════════════════════════════════════════════════════════════

  const infoStartY = report.y;
  const rightColX = report.margin + 320;

  report.drawWrappedText("Prepared for:", {
    font: report.bodyFont,
    size: 9,
    color: report.colors.muted,
    gapAfter: 3,
  });
  report.drawWrappedText(data.customerName, {
    font: report.boldFont,
    size: 11,
    gapAfter: 2,
  });
  if (data.customerEmail) {
    report.drawWrappedText(data.customerEmail, {
      font: report.bodyFont,
      size: 10,
      color: report.colors.muted,
      gapAfter: 2,
    });
  }

  // Right column
  let rightY = infoStartY - 10;

  function drawInfoRow(label: string, value: string) {
    report.page.drawText(label, {
      x: rightColX,
      y: rightY,
      font: report.bodyFont,
      size: 9,
      color: report.colors.muted,
    });
    const valWidth = report.boldFont.widthOfTextAtSize(value, 10);
    report.page.drawText(value, {
      x: pageRight - valWidth,
      y: rightY,
      font: report.boldFont,
      size: 10,
      color: report.colors.text,
    });
    rightY -= 18;
  }

  drawInfoRow("Valid until:", formatQuoteDate(data.validUntil));

  report.y = Math.min(report.y, rightY) - 12;

  // ═══════════════════════════════════════════════════════════════════
  // TITLE
  // ═══════════════════════════════════════════════════════════════════

  report.drawWrappedText(data.title, {
    font: report.boldFont,
    size: 13,
    gapAfter: 12,
  });

  // ═══════════════════════════════════════════════════════════════════
  // LINE ITEMS TABLE
  // ═══════════════════════════════════════════════════════════════════

  report.ensureSpace(28);
  const tableHeaderY = report.y;

  // Dark header bar
  report.page.drawRectangle({
    x: report.margin,
    y: tableHeaderY - 20,
    width: report.contentWidth,
    height: 22,
    color: rgb(0.12, 0.14, 0.16),
  });

  const colDesc = report.margin + 8;
  const colQty = report.margin + 300;
  const colPrice = report.margin + 370;
  const colTotal = pageRight - 8;

  const hdrY = tableHeaderY - 14;
  const hdrColor = rgb(1, 1, 1);
  report.page.drawText("Item", { x: colDesc, y: hdrY, font: report.boldFont, size: 9, color: hdrColor });
  report.page.drawText("Qty", { x: colQty, y: hdrY, font: report.boldFont, size: 9, color: hdrColor });
  report.page.drawText("Price", { x: colPrice, y: hdrY, font: report.boldFont, size: 9, color: hdrColor });
  const totalHdrText = "Total";
  const totalHdrWidth = report.boldFont.widthOfTextAtSize(totalHdrText, 9);
  report.page.drawText(totalHdrText, { x: colTotal - totalHdrWidth, y: hdrY, font: report.boldFont, size: 9, color: hdrColor });

  report.y = tableHeaderY - 26;

  // Table rows
  for (let i = 0; i < data.items.length; i++) {
    const item = data.items[i];
    report.ensureSpace(32);

    if (i % 2 === 0) {
      report.page.drawRectangle({
        x: report.margin,
        y: report.y - 28,
        width: report.contentWidth,
        height: 30,
        color: rgb(0.97, 0.97, 0.97),
      });
    }

    const rowY = report.y - 18;
    const descLines = report.wrapText(item.description, report.bodyFont, 10, 270);
    report.page.drawText(descLines[0] ?? "", { x: colDesc, y: rowY, font: report.bodyFont, size: 10, color: report.colors.text });
    report.page.drawText(String(item.quantity), { x: colQty + 8, y: rowY, font: report.bodyFont, size: 10, color: report.colors.text });
    report.page.drawText(formatQuoteMoney(item.unitPriceInCents, data.currency), { x: colPrice, y: rowY, font: report.bodyFont, size: 10, color: report.colors.text });

    const amtText = formatQuoteMoney(item.lineTotalInCents, data.currency);
    const amtWidth = report.boldFont.widthOfTextAtSize(amtText, 10);
    report.page.drawText(amtText, { x: colTotal - amtWidth, y: rowY, font: report.boldFont, size: 10, color: report.colors.text });

    report.y -= 30;

    for (let j = 1; j < Math.min(descLines.length, 2); j++) {
      report.page.drawText(descLines[j], { x: colDesc, y: report.y - 4, font: report.bodyFont, size: 9, color: report.colors.muted });
      report.y -= 16;
    }
  }

  report.y -= 8;

  // ═══════════════════════════════════════════════════════════════════
  // TOTALS
  // ═══════════════════════════════════════════════════════════════════

  const totalsLabelX = colPrice;
  const totalsValX = colTotal;

  function drawTotal(label: string, value: string, bold = false, large = false) {
    report.ensureSpace(20);
    const rowY = report.y - 12;
    const font = bold ? report.boldFont : report.bodyFont;
    const size = large ? 13 : 10;
    const color = bold ? report.colors.text : report.colors.muted;

    report.page.drawText(label, { x: totalsLabelX, y: rowY, font, size, color });
    const valFont = report.boldFont;
    const valWidth = valFont.widthOfTextAtSize(value, size);
    report.page.drawText(value, { x: totalsValX - valWidth, y: rowY, font: valFont, size, color: report.colors.text });
    report.y -= large ? 22 : 18;
  }

  drawTotal("Subtotal:", formatQuoteMoney(data.subtotalInCents, data.currency));

  if (data.discountInCents > 0) {
    drawTotal("Discount:", `-${formatQuoteMoney(data.discountInCents, data.currency)}`);
  }

  // Separator
  report.page.drawLine({
    start: { x: totalsLabelX, y: report.y },
    end: { x: pageRight, y: report.y },
    color: report.colors.border,
    thickness: 1,
  });
  report.y -= 8;

  drawTotal("Total:", formatQuoteMoney(data.totalInCents, data.currency), true, true);

  // ═══════════════════════════════════════════════════════════════════
  // TERMS (no notes in PDF)
  // ═══════════════════════════════════════════════════════════════════

  if (data.terms?.trim()) {
    report.y -= 12;
    report.drawDivider(0, 12);
    report.drawWrappedText("Terms", {
      font: report.boldFont,
      size: 9,
      color: report.colors.muted,
      gapAfter: 4,
    });
    report.drawWrappedText(data.terms.trim().slice(0, 600), {
      size: 10,
      gapAfter: 4,
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  // FOOTER
  // ═══════════════════════════════════════════════════════════════════

  report.y -= 20;
  report.ensureSpace(20);
  const thankYou = `Thank you — ${data.businessName}`;
  const thankYouWidth = report.bodyFont.widthOfTextAtSize(thankYou, 9);
  report.page.drawText(thankYou, {
    x: (report.pageWidth - thankYouWidth) / 2,
    y: report.y - 10,
    font: report.bodyFont,
    size: 9,
    color: report.colors.muted,
  });

  return report.save();
}

export function getQuotePdfFileName(data: QuoteDocumentData) {
  return `${sanitizeStorageFileName(data.quoteNumber, "quote")}.pdf`;
}

export function getQuotePngFileName(data: QuoteDocumentData) {
  return `${sanitizeStorageFileName(data.quoteNumber, "quote")}.png`;
}
