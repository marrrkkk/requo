"use server";

import { z } from "zod";

import { getOwnerBusinessActionContext } from "@/lib/db/business-access";
import { generateDataExport } from "@/features/data-export/service";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DataExportActionState {
  success?: string;
  error?: string;
  downloadUrl?: string;
  expiresAt?: string;
}

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const dataExportSchema = z.object({
  format: z.enum(["json", "csv"]),
});

// ---------------------------------------------------------------------------
// Action
// ---------------------------------------------------------------------------

export async function exportBusinessDataAction(
  _prevState: DataExportActionState,
  formData: FormData,
): Promise<DataExportActionState> {
  const ownerAccess = await getOwnerBusinessActionContext();

  if (!ownerAccess.ok) {
    return {
      error: ownerAccess.error,
    };
  }

  const { user, businessContext } = ownerAccess;

  const validationResult = dataExportSchema.safeParse({
    format: formData.get("format"),
  });

  if (!validationResult.success) {
    return {
      error: "Select a valid export format (JSON or CSV).",
    };
  }

  const { format } = validationResult.data;

  try {
    const result = await generateDataExport({
      businessId: businessContext.business.id,
      format,
      userId: user.id,
    });

    if (!result.success) {
      return {
        error: result.error ?? "Export failed. Please try again.",
      };
    }

    return {
      success: "Export ready for download.",
      downloadUrl: result.downloadUrl,
      expiresAt: result.expiresAt?.toISOString(),
    };
  } catch (error) {
    console.error("Data export action failed:", error);

    return {
      error: "We couldn't generate the export right now. Please try again.",
    };
  }
}
