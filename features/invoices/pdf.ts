import { sanitizeStorageFileName } from "@/lib/files";
import { PdfReport } from "@/lib/pdf/report";
import { rgb } from "pdf-lib";

type InvoicePdfLineItem = {
  description: string;
  quantity: number;
  unitPriceInCents: number;
  lineTotalInCents: number;
};

export type InvoiceDocumentData = {
  invoiceNumber: string;
  title: string;
  businessName: string;
  businessEmail: string | null;
  customerName: string;
  customerEmail: string | null;
  currency: string;
  subtotalInCents: number;
  discountInCents: number;
  taxInCents: number;
  taxLabel: string | null;
  totalInCents: number;
  dueAt: string | null;
  issuedAt: string | null;
  notes: string | null;
  terms: string | null;
  items: InvoicePdfLineItem[];
};

function formatMoney(amountInCents: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amountInCents / 100);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export async function createInvoicePdf(data: InvoiceDocumentData) {
  const report = await PdfReport.create(`Invoice ${data.invoiceNumber}`);
  const pageRight = report.pageWidth - report.margin;

  // ═══════════════════════════════════════════════════════════════════
  // TOP SECTION: Business name (left) + "INVOICE" (right)
  // ═══════════════════════════════════════════════════════════════════

  const invoiceLabel = "INVOICE";
  const invoiceLabelWidth = report.boldFont.widthOfTextAtSize(invoiceLabel, 32);

  // Business name — large bold, left side
  report.drawWrappedText(data.businessName, {
    font: report.boldFont,
    size: 16,
    gapAfter: 2,
  });

  if (data.businessEmail) {
    report.drawWrappedText(data.businessEmail, {
      font: report.bodyFont,
      size: 9,
      color: report.colors.muted,
      gapAfter: 0,
    });
  }

  // "INVOICE" — top right, positioned at same Y as business name start
  const invoiceY = report.y + 20; // back up to align with the business name
  report.page.drawText(invoiceLabel, {
    x: pageRight - invoiceLabelWidth,
    y: invoiceY,
    font: report.boldFont,
    size: 32,
    color: report.colors.text,
  });

  // Invoice number below "INVOICE" on the right
  const numText = `# ${data.invoiceNumber}`;
  const numWidth = report.bodyFont.widthOfTextAtSize(numText, 10);
  report.page.drawText(numText, {
    x: pageRight - numWidth,
    y: invoiceY - 18,
    font: report.bodyFont,
    size: 10,
    color: report.colors.muted,
  });

  report.y -= 28;

  // ═══════════════════════════════════════════════════════════════════
  // INFO SECTION: Bill To (left) + Date/Due/Balance (right)
  // ═══════════════════════════════════════════════════════════════════

  const infoStartY = report.y;
  const rightColX = report.margin + 320;
  const rightValX = rightColX + 90;

  // Left: Bill To
  report.drawWrappedText("Bill to:", {
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

  // Right: Date info (positioned absolutely)
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

  if (data.issuedAt) {
    drawInfoRow("Date:", formatDate(data.issuedAt));
  }
  if (data.dueAt) {
    drawInfoRow("Due Date:", formatDate(data.dueAt));
  }

  // Ensure Y is below both columns
  report.y = Math.min(report.y, rightY) - 12;

  // ═══════════════════════════════════════════════════════════════════
  // LINE ITEMS TABLE
  // ═══════════════════════════════════════════════════════════════════

  // Table header bar
  report.ensureSpace(28);
  const tableHeaderY = report.y;

  // Dark background bar for header
  report.page.drawRectangle({
    x: report.margin,
    y: tableHeaderY - 20,
    width: report.contentWidth,
    height: 22,
    color: rgb(0.12, 0.14, 0.16),
  });

  const colDesc = report.margin + 8;
  const colQty = report.margin + 300;
  const colRate = report.margin + 370;
  const colAmount = pageRight - 8;

  const hdrY = tableHeaderY - 14;
  const hdrColor = rgb(1, 1, 1);
  report.page.drawText("Item", { x: colDesc, y: hdrY, font: report.boldFont, size: 9, color: hdrColor });
  report.page.drawText("Quantity", { x: colQty, y: hdrY, font: report.boldFont, size: 9, color: hdrColor });
  report.page.drawText("Price", { x: colRate, y: hdrY, font: report.boldFont, size: 9, color: hdrColor });
  const amtHdrText = "Total";
  const amtHdrWidth = report.boldFont.widthOfTextAtSize(amtHdrText, 9);
  report.page.drawText(amtHdrText, { x: colAmount - amtHdrWidth, y: hdrY, font: report.boldFont, size: 9, color: hdrColor });

  report.y = tableHeaderY - 26;

  // Table rows
  for (let i = 0; i < data.items.length; i++) {
    const item = data.items[i];
    report.ensureSpace(32);

    // Alternating light gray background
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

    // Description (truncate to fit)
    const descLines = report.wrapText(item.description, report.bodyFont, 10, 270);
    report.page.drawText(descLines[0] ?? "", { x: colDesc, y: rowY, font: report.bodyFont, size: 10, color: report.colors.text });

    // Quantity
    report.page.drawText(String(item.quantity), { x: colQty + 16, y: rowY, font: report.bodyFont, size: 10, color: report.colors.text });

    // Rate
    report.page.drawText(formatMoney(item.unitPriceInCents, data.currency), { x: colRate, y: rowY, font: report.bodyFont, size: 10, color: report.colors.text });

    // Amount (right-aligned)
    const amtText = formatMoney(item.lineTotalInCents, data.currency);
    const amtWidth = report.boldFont.widthOfTextAtSize(amtText, 10);
    report.page.drawText(amtText, { x: colAmount - amtWidth, y: rowY, font: report.boldFont, size: 10, color: report.colors.text });

    report.y -= 30;

    // Additional wrapped lines for long descriptions
    for (let j = 1; j < Math.min(descLines.length, 2); j++) {
      report.page.drawText(descLines[j], { x: colDesc, y: report.y - 4, font: report.bodyFont, size: 9, color: report.colors.muted });
      report.y -= 16;
    }
  }

  report.y -= 8;

  // ═══════════════════════════════════════════════════════════════════
  // TOTALS
  // ═══════════════════════════════════════════════════════════════════

  const totalsLabelX = colRate;
  const totalsValX = colAmount;

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

  drawTotal("Subtotal:", formatMoney(data.subtotalInCents, data.currency));

  if (data.discountInCents > 0) {
    drawTotal("Discount:", `−${formatMoney(data.discountInCents, data.currency)}`);
  }

  if (data.taxInCents > 0) {
    drawTotal(`${data.taxLabel || "Tax"}:`, formatMoney(data.taxInCents, data.currency));
  }

  // Separator
  report.page.drawLine({
    start: { x: totalsLabelX, y: report.y },
    end: { x: pageRight, y: report.y },
    color: report.colors.border,
    thickness: 1,
  });
  report.y -= 8;

  drawTotal("Total:", formatMoney(data.totalInCents, data.currency), true, true);

  // ═══════════════════════════════════════════════════════════════════
  // TERMS
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
  const thankYou = `Thank you for your business!`;
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

export function getInvoicePdfFileName(data: InvoiceDocumentData) {
  return `${sanitizeStorageFileName(data.invoiceNumber, "invoice")}.pdf`;
}
