import { sanitizeStorageFileName } from "@/lib/files";
import { PdfReport } from "@/lib/pdf/report";
import type { QuoteDocumentData } from "@/features/quotes/documents";
import { formatQuoteDate, formatQuoteMoney } from "@/features/quotes/utils";

const MAX_PDF_ITEMS = 8;
const MAX_PDF_NOTES_CHARS = 320;

function drawCompactRow(report: PdfReport, label: string, value: string) {
  const valueLines = report.wrapText(value, report.bodyFont, 10, 260).slice(0, 2);
  const rowHeight = Math.max(16, valueLines.length * 12 + 2);
  report.ensureSpace(rowHeight);
  report.page.drawText(label, {
    x: report.margin,
    y: report.y - 10,
    font: report.boldFont,
    size: 10,
    color: report.colors.muted,
  });
  report.page.drawText(valueLines.join(" "), {
    x: report.margin + 135,
    y: report.y - 10,
    font: report.bodyFont,
    size: 10,
    color: report.colors.text,
  });
  report.y -= rowHeight;
}

export async function createQuotePdf(data: QuoteDocumentData) {
  const report = await PdfReport.create(`${data.quoteNumber} ${data.title}`);
  const items = data.items.slice(0, MAX_PDF_ITEMS);
  const hiddenItemCount = Math.max(0, data.items.length - items.length);
  const notes = data.notes?.trim()
    ? data.notes.trim().slice(0, MAX_PDF_NOTES_CHARS)
    : null;
  const notesTruncated = Boolean(
    data.notes?.trim() && data.notes.trim().length > MAX_PDF_NOTES_CHARS,
  );

  report.drawWrappedText(data.businessName, {
    font: report.boldFont,
    size: 13,
    gapAfter: 2,
  });
  report.drawWrappedText(data.title, {
    font: report.boldFont,
    size: 16,
    gapAfter: 2,
  });
  report.drawWrappedText(`Quote ${data.quoteNumber}`, {
    color: report.colors.muted,
    size: 10,
    gapAfter: 1,
  });
  report.drawWrappedText(`Valid until ${formatQuoteDate(data.validUntil)}`, {
    color: report.colors.muted,
    size: 10,
    gapAfter: 6,
  });

  report.drawDivider(0, 6);
  drawCompactRow(report, "Prepared for", `${data.customerName} (${data.customerEmail})`);
  drawCompactRow(report, "Item count", `${data.items.length} line items`);
  report.drawDivider(2, 6);

  report.drawWrappedText("Line items", {
    font: report.boldFont,
    size: 11,
    gapAfter: 4,
  });
  for (const item of items) {
    drawCompactRow(
      report,
      `${item.quantity} x`,
      `${item.description || "Untitled item"} | ${formatQuoteMoney(item.lineTotalInCents, data.currency)}`,
    );
  }
  if (hiddenItemCount > 0) {
    report.drawWrappedText(
      `+${hiddenItemCount} more line item${hiddenItemCount === 1 ? "" : "s"} omitted for one-page export.`,
      {
        size: 9,
        color: report.colors.muted,
        gapAfter: 4,
      },
    );
  }

  report.drawDivider(2, 6);
  drawCompactRow(
    report,
    "Subtotal",
    formatQuoteMoney(data.subtotalInCents, data.currency),
  );
  drawCompactRow(
    report,
    "Discount",
    `-${formatQuoteMoney(data.discountInCents, data.currency)}`,
  );
  drawCompactRow(
    report,
    "Total",
    formatQuoteMoney(data.totalInCents, data.currency),
  );

  if (notes) {
    report.drawDivider(2, 6);
    report.drawWrappedText("Notes", {
      font: report.boldFont,
      size: 11,
      gapAfter: 3,
    });
    report.drawWrappedText(`${notes}${notesTruncated ? "..." : ""}`, {
      size: 10,
      gapAfter: 2,
    });
  }

  return report.save();
}

export function getQuotePdfFileName(data: QuoteDocumentData) {
  return `${sanitizeStorageFileName(data.quoteNumber, "quote")}.pdf`;
}

export function getQuotePngFileName(data: QuoteDocumentData) {
  return `${sanitizeStorageFileName(data.quoteNumber, "quote")}.png`;
}
