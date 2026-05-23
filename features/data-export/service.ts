import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import {
  inquiries,
  inquiryAttachments,
  quotes,
  quoteItems,
  dataExports,
} from "@/lib/db/schema";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DataExportOptions {
  businessId: string;
  format: "json" | "csv";
  userId: string;
}

export interface DataExportResult {
  success: boolean;
  downloadUrl?: string;
  expiresAt?: Date;
  error?: string;
  parts?: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const EXPORT_BUCKET = "data-exports";
const SIGNED_URL_EXPIRY_SECONDS = 72 * 60 * 60; // 72 hours
const MAX_PART_SIZE_BYTES = 2 * 1024 * 1024 * 1024; // 2 GB

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateId(): string {
  return crypto.randomUUID();
}

/**
 * Serialize records to JSON format.
 */
export function serializeToJson(data: Record<string, unknown[]>): string {
  return JSON.stringify(data, null, 2);
}

/**
 * Serialize records to CSV format.
 * Each dataset gets its own section with a header row.
 */
export function serializeToCsv(data: Record<string, unknown[]>): string {
  const sections: string[] = [];

  for (const [tableName, rows] of Object.entries(data)) {
    if (rows.length === 0) continue;

    const headers = Object.keys(rows[0] as object);
    const headerLine = headers.map(escapeCsvField).join(",");

    const dataLines = rows.map((row) => {
      const record = row as Record<string, unknown>;
      return headers
        .map((h) => escapeCsvField(formatCsvValue(record[h])))
        .join(",");
    });

    sections.push(`# ${tableName}\n${headerLine}\n${dataLines.join("\n")}`);
  }

  return sections.join("\n\n");
}

function escapeCsvField(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function formatCsvValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

/**
 * Determine how to split data into parts that each fit within MAX_PART_SIZE_BYTES.
 * Returns an array of byte boundaries [start, end) for each part.
 */
export function computeArchiveParts(totalSizeBytes: number): {
  partCount: number;
  partSizes: number[];
} {
  if (totalSizeBytes <= MAX_PART_SIZE_BYTES) {
    return { partCount: 1, partSizes: [totalSizeBytes] };
  }

  const fullParts = Math.floor(totalSizeBytes / MAX_PART_SIZE_BYTES);
  const remainder = totalSizeBytes % MAX_PART_SIZE_BYTES;

  const partSizes: number[] = [];
  for (let i = 0; i < fullParts; i++) {
    partSizes.push(MAX_PART_SIZE_BYTES);
  }
  if (remainder > 0) {
    partSizes.push(remainder);
  }

  return { partCount: partSizes.length, partSizes };
}

// ---------------------------------------------------------------------------
// Core export function
// ---------------------------------------------------------------------------

export async function generateDataExport(
  options: DataExportOptions,
): Promise<DataExportResult> {
  const { businessId, format, userId } = options;
  const exportId = generateId();

  // Record the export as pending
  await db.insert(dataExports).values({
    id: exportId,
    businessId,
    userId,
    format,
    status: "pending",
  });

  try {
    // Update status to processing
    await db
      .update(dataExports)
      .set({ status: "processing" })
      .where(eq(dataExports.id, exportId));

    // Query all business data
    const [businessInquiries, businessQuotes, businessQuoteItems, businessFiles] =
      await Promise.all([
        db
          .select()
          .from(inquiries)
          .where(
            eq(inquiries.businessId, businessId),
          ),
        db
          .select()
          .from(quotes)
          .where(
            eq(quotes.businessId, businessId),
          ),
        db
          .select()
          .from(quoteItems)
          .where(eq(quoteItems.businessId, businessId)),
        db
          .select()
          .from(inquiryAttachments)
          .where(eq(inquiryAttachments.businessId, businessId)),
      ]);

    // Build the export data
    const exportData: Record<string, unknown[]> = {
      inquiries: businessInquiries,
      quotes: businessQuotes,
      quoteItems: businessQuoteItems,
      files: businessFiles,
    };

    // Serialize based on format
    const serialized =
      format === "json"
        ? serializeToJson(exportData)
        : serializeToCsv(exportData);

    const contentBuffer = Buffer.from(serialized, "utf-8");
    const totalSize = contentBuffer.byteLength;
    const { partCount, partSizes } = computeArchiveParts(totalSize);

    const supabase = createSupabaseAdminClient();
    const extension = format === "json" ? "json" : "csv";
    const basePath = `${businessId}/${exportId}`;

    if (partCount === 1) {
      // Single file upload
      const filePath = `${basePath}/export.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from(EXPORT_BUCKET)
        .upload(filePath, contentBuffer, {
          contentType:
            format === "json" ? "application/json" : "text/csv",
          upsert: false,
        });

      if (uploadError) {
        throw new Error(`Storage upload failed: ${uploadError.message}`);
      }

      // Generate signed URL
      const { data: signedUrlData, error: signedUrlError } =
        await supabase.storage
          .from(EXPORT_BUCKET)
          .createSignedUrl(filePath, SIGNED_URL_EXPIRY_SECONDS);

      if (signedUrlError || !signedUrlData) {
        throw new Error(
          `Signed URL generation failed: ${signedUrlError?.message ?? "No data returned"}`,
        );
      }

      const expiresAt = new Date(
        Date.now() + SIGNED_URL_EXPIRY_SECONDS * 1000,
      );

      // Update export record as completed
      await db
        .update(dataExports)
        .set({
          status: "completed",
          storagePath: filePath,
          fileSizeBytes: totalSize,
          parts: 1,
          expiresAt,
          completedAt: new Date(),
        })
        .where(eq(dataExports.id, exportId));

      return {
        success: true,
        downloadUrl: signedUrlData.signedUrl,
        expiresAt,
        parts: 1,
      };
    }

    // Multi-part upload
    let offset = 0;
    const downloadUrls: string[] = [];
    const expiresAt = new Date(Date.now() + SIGNED_URL_EXPIRY_SECONDS * 1000);

    for (let i = 0; i < partCount; i++) {
      const partSize = partSizes[i];
      const partBuffer = contentBuffer.subarray(offset, offset + partSize);
      offset += partSize;

      const filePath = `${basePath}/export-part-${i + 1}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from(EXPORT_BUCKET)
        .upload(filePath, partBuffer, {
          contentType:
            format === "json" ? "application/json" : "text/csv",
          upsert: false,
        });

      if (uploadError) {
        throw new Error(
          `Storage upload failed for part ${i + 1}: ${uploadError.message}`,
        );
      }

      const { data: signedUrlData, error: signedUrlError } =
        await supabase.storage
          .from(EXPORT_BUCKET)
          .createSignedUrl(filePath, SIGNED_URL_EXPIRY_SECONDS);

      if (signedUrlError || !signedUrlData) {
        throw new Error(
          `Signed URL generation failed for part ${i + 1}: ${signedUrlError?.message ?? "No data returned"}`,
        );
      }

      downloadUrls.push(signedUrlData.signedUrl);
    }

    // Update export record as completed
    await db
      .update(dataExports)
      .set({
        status: "completed",
        storagePath: basePath,
        fileSizeBytes: totalSize,
        parts: partCount,
        expiresAt,
        completedAt: new Date(),
      })
      .where(eq(dataExports.id, exportId));

    return {
      success: true,
      downloadUrl: downloadUrls[0],
      expiresAt,
      parts: partCount,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown export error";

    // Record failure
    await db
      .update(dataExports)
      .set({
        status: "failed",
        errorMessage,
      })
      .where(eq(dataExports.id, exportId));

    return {
      success: false,
      error: errorMessage,
    };
  }
}
