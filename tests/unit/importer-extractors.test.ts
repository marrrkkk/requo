import { describe, expect, it } from "vitest";

import { extractFile } from "@/features/importer/extractors";
import { importerMaxExtractedChars } from "@/features/importer/types";

describe("extractFile", () => {
  it("passes PDF bytes through as base64 without touching the text pipeline", async () => {
    const bytes = Buffer.from("%PDF-1.4\n%binary-stuff\n", "utf8");

    const result = await extractFile({
      fileName: "pricing.pdf",
      mimeType: "application/pdf",
      bytes,
    });

    expect(result.kind).toBe("pdf");
    if (result.kind === "pdf") {
      expect(result.fileName).toBe("pricing.pdf");
      expect(Buffer.from(result.base64, "base64").toString("utf8")).toBe(
        "%PDF-1.4\n%binary-stuff\n",
      );
    }
  });

  it("normalises Windows line endings in CSV files", async () => {
    const raw = "name,price\r\nService A,100\r\nService B,200\r\n";

    const result = await extractFile({
      fileName: "prices.csv",
      mimeType: "text/csv",
      bytes: Buffer.from(raw, "utf8"),
    });

    expect(result.kind).toBe("text");
    if (result.kind === "text") {
      expect(result.text).not.toContain("\r");
      expect(result.text).toContain("Service A,100");
      expect(result.truncated).toBe(false);
    }
  });

  it("recognises .md and .txt files by extension when mime type is missing", async () => {
    const md = await extractFile({
      fileName: "notes.md",
      mimeType: "",
      bytes: Buffer.from("# Heading\n\nContent.", "utf8"),
    });
    const txt = await extractFile({
      fileName: "notes.txt",
      mimeType: "",
      bytes: Buffer.from("Plain text", "utf8"),
    });

    expect(md.kind).toBe("text");
    expect(txt.kind).toBe("text");
  });

  it("truncates very long text and reports truncation, keeping head and tail", async () => {
    const longText = `HEAD_MARKER\n${"a".repeat(importerMaxExtractedChars * 2)}\nTAIL_MARKER`;

    const result = await extractFile({
      fileName: "huge.txt",
      mimeType: "text/plain",
      bytes: Buffer.from(longText, "utf8"),
    });

    expect(result.kind).toBe("text");
    if (result.kind === "text") {
      expect(result.text.length).toBeLessThanOrEqual(importerMaxExtractedChars + 50);
      expect(result.text).toContain("HEAD_MARKER");
      expect(result.text).toContain("TAIL_MARKER");
      expect(result.text).toContain("[...truncated for length...]");
      expect(result.truncated).toBe(true);
    }
  });

  it("rejects unsupported file types", async () => {
    await expect(
      extractFile({
        fileName: "image.png",
        mimeType: "image/png",
        bytes: Buffer.from([0x89, 0x50, 0x4e, 0x47]),
      }),
    ).rejects.toThrow(/Unsupported file type/);
  });
});
