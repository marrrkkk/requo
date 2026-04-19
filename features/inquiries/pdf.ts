import { sanitizeStorageFileName } from "@/lib/files";
import { PdfReport } from "@/lib/pdf/report";
import type { InquiryDocumentData } from "@/features/inquiries/documents";
import {
  formatFileSize,
  formatInquiryBudget,
  formatInquiryDateTime,
} from "@/features/inquiries/utils";
import { formatQuoteMoney } from "@/features/quotes/utils";

const MAX_PDF_DETAILS_CHARS = 460;
const MAX_PDF_FIELDS = 6;
const MAX_PDF_ATTACHMENTS = 4;

function drawField(report: PdfReport, label: string, value: string) {
  const preview = value.trim().replace(/\s+/g, " ").slice(0, 180);
  report.ensureSpace(15);
  report.page.drawText(label, {
    x: report.margin,
    y: report.y - 10,
    font: report.boldFont,
    size: 10,
    color: report.colors.muted,
  });
  report.page.drawText(preview, {
    x: report.margin + 140,
    y: report.y - 10,
    font: report.bodyFont,
    size: 10,
    color: report.colors.text,
  });
  report.y -= 15;
}

export async function createInquiryPdf(data: InquiryDocumentData) {
  const report = await PdfReport.create(`${data.referenceId} request`);
  const fields = data.additionalFields.slice(0, MAX_PDF_FIELDS);
  const hiddenFieldsCount = Math.max(0, data.additionalFields.length - fields.length);
  const attachments = data.attachments.slice(0, MAX_PDF_ATTACHMENTS);
  const hiddenAttachmentsCount = Math.max(
    0,
    data.attachments.length - attachments.length,
  );
  const details = data.details.trim();
  const detailsPreview =
    details.length > MAX_PDF_DETAILS_CHARS
      ? `${details.slice(0, MAX_PDF_DETAILS_CHARS)}...`
      : details;

  report.drawWrappedText(data.businessName, {
    font: report.boldFont,
    size: 13,
    gapAfter: 2,
  });
  report.drawWrappedText(data.subject?.trim() || data.customerName, {
    font: report.boldFont,
    size: 16,
    gapAfter: 2,
  });
  report.drawWrappedText(`Request ${data.referenceId}`, {
    color: report.colors.muted,
    size: 10,
    gapAfter: 1,
  });
  report.drawWrappedText(`Received ${formatInquiryDateTime(data.submittedAt)}`, {
    color: report.colors.muted,
    size: 10,
    gapAfter: 6,
  });

  report.drawDivider(0, 6);
  drawField(report, "Customer", data.customerName);
  drawField(report, "Email", data.customerEmail);
  drawField(report, "Phone", data.customerPhone || "Not provided");
  drawField(report, "Company", data.companyName || "Not provided");
  drawField(report, "Form", data.inquiryFormName);
  drawField(report, "Category", data.serviceCategory);
  drawField(report, "Status", data.status);
  drawField(report, "Budget", formatInquiryBudget(data.budgetText));
  drawField(report, "Deadline", data.requestedDeadline || "Not provided");

  report.drawDivider(2, 6);
  report.drawWrappedText("Message", {
    font: report.boldFont,
    size: 11,
    gapAfter: 3,
  });
  report.drawWrappedText(detailsPreview, {
    size: 10,
    gapAfter: 4,
  });

  if (fields.length) {
    report.drawDivider(2, 6);
    report.drawWrappedText("Submitted fields", {
      font: report.boldFont,
      size: 11,
      gapAfter: 3,
    });

    for (const field of fields) {
      drawField(report, field.label, field.displayValue);
    }
    if (hiddenFieldsCount > 0) {
      report.drawWrappedText(
        `+${hiddenFieldsCount} more submitted field${hiddenFieldsCount === 1 ? "" : "s"} omitted for one-page export.`,
        { size: 9, color: report.colors.muted, gapAfter: 3 },
      );
    }
  }

  if (attachments.length) {
    report.drawDivider(2, 6);
    report.drawWrappedText("Attachments", {
      font: report.boldFont,
      size: 11,
      gapAfter: 3,
    });

    for (const attachment of attachments) {
      drawField(
        report,
        attachment.fileName,
        `${formatFileSize(attachment.fileSize)} | ${attachment.contentType} | ${formatInquiryDateTime(attachment.createdAt)}`,
      );
    }
    if (hiddenAttachmentsCount > 0) {
      report.drawWrappedText(
        `+${hiddenAttachmentsCount} more attachment${hiddenAttachmentsCount === 1 ? "" : "s"} omitted for one-page export.`,
        { size: 9, color: report.colors.muted, gapAfter: 3 },
      );
    }
  }

  if (data.relatedQuote) {
    report.drawDivider(2, 6);
    report.drawWrappedText("Related quote", {
      font: report.boldFont,
      size: 11,
      gapAfter: 3,
    });
    drawField(
      report,
      "Quote",
      data.relatedQuote.quoteNumber ?? data.relatedQuote.id,
    );
    drawField(report, "Status", data.relatedQuote.status);
    drawField(
      report,
      "Total",
      formatQuoteMoney(data.relatedQuote.totalInCents, data.businessCurrency),
    );
    drawField(
      report,
      "Created",
      formatInquiryDateTime(data.relatedQuote.createdAt),
    );
  }

  return report.save();
}

export function getInquiryPdfFileName(data: InquiryDocumentData) {
  return `${sanitizeStorageFileName(data.referenceId, "request")}.pdf`;
}

export function getInquiryPngFileName(data: InquiryDocumentData) {
  return `${sanitizeStorageFileName(data.referenceId, "request")}.png`;
}
