import { describe, expect, it } from "vitest";

import {
  collapseAttachmentBlocksForDisplay,
  formatAttachmentBlock,
} from "@/components/shared/chat/attachment-text";
import {
  ChatAttachmentError,
  decodeChatFilePart,
  processChatAttachments,
} from "@/lib/ai/chat-attachments";
import { getUsageLimit } from "@/lib/plans/usage-limits";

function textFile(name: string, text: string, mimeType = "text/plain") {
  return { fileName: name, mimeType, bytes: Buffer.from(text, "utf8") };
}

function dataUrl(
  bytes: Buffer,
  mimeType = "text/plain",
  filename = "notes.txt",
) {
  return {
    mediaType: mimeType,
    filename,
    url: `data:${mimeType};base64,${bytes.toString("base64")}`,
  };
}

describe("attachment block format", () => {
  it("round-trips through the display collapse to a one-line summary", () => {
    const block = formatAttachmentBlock({
      fileName: "quote.pdf",
      kind: "pdf",
      charCount: 1234,
      truncated: false,
      text: "line one\nline two",
    });
    const collapsed = collapseAttachmentBlocksForDisplay(
      `Please quote this.\n\n${block}`,
    );

    expect(block).toContain('[Attached file: "quote.pdf"');
    expect(collapsed).toContain("Please quote this.");
    expect(collapsed).toContain("Attachment: quote.pdf (1,234 chars)");
    expect(collapsed).not.toContain("line one");
  });

  it("marks truncated blocks in both the header and the summary", () => {
    const block = formatAttachmentBlock({
      fileName: "spec.docx",
      kind: "docx",
      charCount: 9999,
      truncated: true,
      text: "abc",
    });
    expect(block).toContain("truncated");
    expect(collapseAttachmentBlocksForDisplay(block)).toContain(
      "Attachment: spec.docx (9,999 chars)",
    );
  });

  it("leaves plain messages untouched", () => {
    expect(collapseAttachmentBlocksForDisplay("Just a question?")).toBe(
      "Just a question?",
    );
  });
});

describe("decodeChatFilePart", () => {
  it("decodes a data URL back to bytes", () => {
    const bytes = Buffer.from("hello", "utf8");
    const decoded = decodeChatFilePart(dataUrl(bytes));

    expect(decoded.fileName).toBe("notes.txt");
    expect(decoded.mimeType).toBe("text/plain");
    expect(decoded.bytes.equals(bytes)).toBe(true);
  });

  it("rejects non-data URLs without decoding", () => {
    try {
      decodeChatFilePart({
        mediaType: "text/plain",
        filename: "notes.txt",
        url: "https://example.com/notes.txt",
      });
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(ChatAttachmentError);
      expect((error as ChatAttachmentError).code).toBe("unreadable");
    }
  });

  it("rejects absurd payloads before decoding", () => {
    try {
      decodeChatFilePart({
        mediaType: "text/plain",
        filename: "huge.txt",
        url: `data:text/plain;base64,${"A".repeat(4_000_000)}`,
      });
      expect.unreachable();
    } catch (error) {
      expect((error as ChatAttachmentError).code).toBe("too_large");
    }
  });
});

describe("processChatAttachments", () => {
  it("returns an empty block when no files ride along", async () => {
    const result = await processChatAttachments({
      files: [],
      maxFiles: 2,
      maxCharsPerTurn: 10_000,
    });

    expect(result).toEqual({
      block: "",
      fileCount: 0,
      charCount: 0,
      truncated: false,
    });
  });

  it("parses a text file into a delimited block", async () => {
    const result = await processChatAttachments({
      files: [textFile("scope.txt", "Paint the fence and the gate.")],
      maxFiles: 2,
      maxCharsPerTurn: 10_000,
    });

    expect(result.fileCount).toBe(1);
    expect(result.truncated).toBe(false);
    expect(result.block).toContain('[Attached file: "scope.txt"');
    expect(result.block).toContain("Paint the fence and the gate.");
    expect(result.block).toContain('[End of attached file: "scope.txt"]');
  });

  it("accepts CSV by extension when the MIME type is missing", async () => {
    const result = await processChatAttachments({
      files: [
        { fileName: "prices.csv", mimeType: "", bytes: Buffer.from("a,b\n1,2", "utf8") },
      ],
      maxFiles: 2,
      maxCharsPerTurn: 10_000,
    });

    expect(result.fileCount).toBe(1);
    expect(result.block).toContain("a,b");
  });

  it("enforces the per-turn file count", async () => {
    await expect(
      processChatAttachments({
        files: [textFile("a.txt", "a"), textFile("b.txt", "b")],
        maxFiles: 1,
        maxCharsPerTurn: 5_000,
      }),
    ).rejects.toMatchObject({ code: "too_many" });
  });

  it("rejects images before extraction", async () => {
    await expect(
      processChatAttachments({
        files: [
          {
            fileName: "photo.png",
            mimeType: "image/png",
            bytes: Buffer.from([1, 2, 3]),
          },
        ],
        maxFiles: 1,
        maxCharsPerTurn: 5_000,
      }),
    ).rejects.toMatchObject({ code: "image" });
  });

  it("rejects unsupported types", async () => {
    await expect(
      processChatAttachments({
        files: [textFile("run.exe", "MZ", "application/octet-stream")],
        maxFiles: 2,
        maxCharsPerTurn: 10_000,
      }),
    ).rejects.toMatchObject({ code: "unsupported_type" });
  });

  it("rejects empty and oversized files", async () => {
    await expect(
      processChatAttachments({
        files: [{ fileName: "empty.txt", mimeType: "text/plain", bytes: Buffer.alloc(0) }],
        maxFiles: 2,
        maxCharsPerTurn: 10_000,
      }),
    ).rejects.toMatchObject({ code: "too_large" });

    await expect(
      processChatAttachments({
        files: [
          {
            fileName: "big.txt",
            mimeType: "text/plain",
            bytes: Buffer.alloc(2 * 1024 * 1024 + 1, "a"),
          },
        ],
        maxFiles: 2,
        maxCharsPerTurn: 10_000,
      }),
    ).rejects.toMatchObject({ code: "too_large" });
  });

  it("rejects files with no readable text", async () => {
    await expect(
      processChatAttachments({
        files: [textFile("blank.txt", "   \n  ")],
        maxFiles: 2,
        maxCharsPerTurn: 10_000,
      }),
    ).rejects.toMatchObject({ code: "empty" });
  });

  it("maps corrupt DOCX bytes to unreadable instead of throwing raw", async () => {
    await expect(
      processChatAttachments({
        files: [
          {
            fileName: "broken.docx",
            mimeType:
              "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            bytes: Buffer.from("not a zip", "utf8"),
          },
        ],
        maxFiles: 2,
        maxCharsPerTurn: 10_000,
      }),
    ).rejects.toMatchObject({ code: "unreadable" });
  });

  it("truncates to the per-turn budget and marks it", async () => {
    const result = await processChatAttachments({
      files: [textFile("long.txt", `HEAD ${"x".repeat(500)}`)],
      maxFiles: 2,
      maxCharsPerTurn: 100,
    });

    expect(result.truncated).toBe(true);
    expect(result.charCount).toBeLessThanOrEqual(100);
    expect(result.block).toContain("truncated");
    expect(result.block).toContain("HEAD");
  });
});

describe("chat file-upload plan limits", () => {
  it("caps daily uploads at 5 / 20 / 50 on both surfaces", () => {
    expect(getUsageLimit("free", "assistantFileUploadsPerDay")).toBe(5);
    expect(getUsageLimit("free", "agentFileUploadsPerDay")).toBe(5);
    expect(getUsageLimit("pro", "assistantFileUploadsPerDay")).toBe(20);
    expect(getUsageLimit("pro", "agentFileUploadsPerDay")).toBe(20);
    expect(getUsageLimit("business", "assistantFileUploadsPerDay")).toBe(50);
    expect(getUsageLimit("business", "agentFileUploadsPerDay")).toBe(50);
  });
});
