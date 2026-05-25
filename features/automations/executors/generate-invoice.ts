import type { ActionInput } from "./index";
import type { ActionResult } from "../types";
import { createInvoiceFromJobForBusiness } from "@/features/invoices/mutations";
import { db } from "@/lib/db/client";
import { businesses, jobs } from "@/lib/db/schema";
import { and, eq, isNull } from "drizzle-orm";

/**
 * Creates a draft invoice linked to a completed job using existing invoice creation logic.
 * (Requirement 4.8)
 */
export async function executeGenerateInvoice(
  input: ActionInput,
): Promise<ActionResult> {
  const payload = input.triggerPayload as Record<string, unknown>;

  const jobId = (payload.jobId as string) ?? null;

  if (!jobId) {
    return {
      success: false,
      error: "Cannot generate invoice: trigger payload must include jobId.",
    };
  }

  // Security: validate that the job belongs to this business (Requirement 10.4)
  const [job] = await db
    .select({ id: jobs.id, businessId: jobs.businessId })
    .from(jobs)
    .where(
      and(
        eq(jobs.id, jobId),
        eq(jobs.businessId, input.businessId),
        isNull(jobs.deletedAt),
      ),
    )
    .limit(1);

  if (!job) {
    return {
      success: false,
      error: "Job not found or does not belong to this business.",
    };
  }

  // Get the business owner to use as the actor
  const [business] = await db
    .select({ ownerUserId: businesses.ownerUserId })
    .from(businesses)
    .where(eq(businesses.id, input.businessId))
    .limit(1);

  if (!business) {
    return { success: false, error: "Business not found." };
  }

  const result = await createInvoiceFromJobForBusiness({
    businessId: input.businessId,
    jobId,
    userId: business.ownerUserId,
  });

  if ("error" in result && result.error) {
    // If an invoice already exists, treat as soft success (idempotent)
    if ("invoiceId" in result && result.invoiceId) {
      return {
        success: true,
        result: { invoiceId: result.invoiceId, alreadyExisted: true },
      };
    }
    return { success: false, error: result.error };
  }

  return {
    success: true,
    result: {
      invoiceId: result.invoiceId,
      invoiceNumber: result.invoiceNumber,
    },
  };
}
