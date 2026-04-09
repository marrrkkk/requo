import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFPage,
  type PDFFont,
  type RGB,
} from "pdf-lib";

const PDF_PAGE_WIDTH = 612;
const PDF_PAGE_HEIGHT = 792;
const PDF_PAGE_MARGIN = 48;

type DrawWrappedTextOptions = {
  x?: number;
  font?: PDFFont;
  size?: number;
  color?: RGB;
  maxWidth?: number;
  lineHeight?: number;
  gapAfter?: number;
  updateCursor?: boolean;
  y?: number;
};

export class PdfReport {
  readonly pdfDocument: PDFDocument;
  readonly bodyFont: PDFFont;
  readonly boldFont: PDFFont;
  readonly pageWidth = PDF_PAGE_WIDTH;
  readonly pageHeight = PDF_PAGE_HEIGHT;
  readonly margin = PDF_PAGE_MARGIN;
  readonly colors = {
    text: rgb(0.09, 0.13, 0.16),
    muted: rgb(0.4, 0.46, 0.52),
    border: rgb(0.86, 0.89, 0.92),
  };

  page: PDFPage;
  y: number;

  static async create(title: string) {
    const pdfDocument = await PDFDocument.create();
    const bodyFont = await pdfDocument.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDocument.embedFont(StandardFonts.HelveticaBold);
    const report = new PdfReport(pdfDocument, bodyFont, boldFont);

    pdfDocument.setTitle(title);

    return report;
  }

  private constructor(
    pdfDocument: PDFDocument,
    bodyFont: PDFFont,
    boldFont: PDFFont,
  ) {
    this.pdfDocument = pdfDocument;
    this.bodyFont = bodyFont;
    this.boldFont = boldFont;
    this.page = this.pdfDocument.addPage([this.pageWidth, this.pageHeight]);
    this.y = this.pageHeight - this.margin;
  }

  get contentWidth() {
    return this.pageWidth - this.margin * 2;
  }

  addPage() {
    this.page = this.pdfDocument.addPage([this.pageWidth, this.pageHeight]);
    this.y = this.pageHeight - this.margin;
  }

  ensureSpace(height: number) {
    if (this.y - height < this.margin) {
      this.addPage();
    }
  }

  wrapText(
    text: string,
    font: PDFFont,
    size: number,
    maxWidth: number,
  ) {
    const paragraphs = text.split(/\r?\n/);
    const lines: string[] = [];

    for (const paragraph of paragraphs) {
      const trimmedParagraph = paragraph.trim();

      if (!trimmedParagraph) {
        lines.push("");
        continue;
      }

      const words = trimmedParagraph.split(/\s+/);
      let currentLine = "";

      for (const word of words) {
        const nextLine = currentLine ? `${currentLine} ${word}` : word;
        const nextLineWidth = font.widthOfTextAtSize(nextLine, size);

        if (nextLineWidth <= maxWidth || !currentLine) {
          currentLine = nextLine;
          continue;
        }

        lines.push(currentLine);
        currentLine = word;
      }

      if (currentLine) {
        lines.push(currentLine);
      }
    }

    return lines.length ? lines : [""];
  }

  drawWrappedText(text: string, options: DrawWrappedTextOptions = {}) {
    const {
      x = this.margin,
      font = this.bodyFont,
      size = 11,
      color = this.colors.text,
      maxWidth = this.contentWidth,
      lineHeight = Math.round(size * 1.45),
      gapAfter = 8,
      updateCursor = true,
      y = this.y,
    } = options;
    const lines = this.wrapText(text, font, size, maxWidth);
    const blockHeight = lines.length * lineHeight + gapAfter;

    if (updateCursor) {
      this.ensureSpace(blockHeight);
    }

    const drawY = updateCursor ? this.y : y;
    let cursorY = drawY;

    for (const line of lines) {
      this.page.drawText(line, {
        x,
        y: cursorY - size,
        font,
        size,
        color,
      });
      cursorY -= lineHeight;
    }

    if (updateCursor) {
      this.y = cursorY - gapAfter;
    }

    return {
      blockHeight,
      lines,
    };
  }

  drawDivider(gapBefore = 4, gapAfter = 12) {
    this.ensureSpace(gapBefore + gapAfter + 2);
    this.y -= gapBefore;
    this.page.drawLine({
      start: { x: this.margin, y: this.y },
      end: { x: this.pageWidth - this.margin, y: this.y },
      color: this.colors.border,
      thickness: 1,
    });
    this.y -= gapAfter;
  }

  async save() {
    return this.pdfDocument.save();
  }
}
