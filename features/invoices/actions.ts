"use server";

import { revalidateTag } from "next/cache";

import {
  getBusinessInvoiceDetailCacheTags,
  getBusinessInvoiceListCacheTags,
  getBusinessJobDetailCacheTags,
  getBusinessQuoteDetailCacheTags,
  uniqueCacheTags,
} from "@/lib/cache/business-tags";
import { getWorkspaceBusinessActionContext } from "@/lib/db/business-access";
import {
  createInvoiceFromJobForBusiness,
  createInvoiceFromQuoteForBusiness,
  deleteInvoiceForBusiness,
  updateInvoiceStatusForBusiness,
} from "@/features/invoices/mutations";
import { sendInvoiceEmailForBusiness } from "@/features/invoices/send-invoice";
import type {
  InvoiceEditorActionState,
  InvoiceRecordActionState,
  InvoiceStatus,
} from "@/features/invoices/types";

function revalidateCacheTags(tags: string[]) {
  for (const tag of uniqueCacheTags(tags)) {
    revalidateTag(tag, "max");
  }
}

/**
 * Generate invoice from a completed job.
 */
export async function createInvoiceFromJobAction(
  jobId: string,
): Promise<InvoiceEditorActionState> {
  const access = await getWorkspaceBusinessActionContext();

  if (!access.ok) {
    return { error: access.error };
  }

  const { user, businessContext } = access;

  const result = await createInvoiceFromJobForBusiness({
    businessId: businessContext.business.id,
    jobId,
    userId: user.id,
  });

  if (result.error) {
    return { error: result.error };
  }

  revalidateCacheTags([
    ...getBusinessInvoiceListCacheTags(businessContext.business.id),
    ...getBusinessJobDetailCacheTags(businessContext.business.id, jobId),
  ]);

  return { success: `Invoice ${result.invoiceNumber} created.` };
}

/**
 * Generate invoice directly from an accepted quote (skip jobs).
 */
export async function createInvoiceFromQuoteAction(
  quoteId: string,
): Promise<InvoiceEditorActionState> {
  const access = await getWorkspaceBusinessActionContext();

  if (!access.ok) {
    return { error: access.error };
  }

  const { user, businessContext } = access;

  const result = await createInvoiceFromQuoteForBusiness({
    businessId: businessContext.business.id,
    quoteId,
    userId: user.id,
  });

  if (result.error) {
    return { error: result.error, invoiceId: result.invoiceId };
  }

  revalidateCacheTags([
    ...getBusinessInvoiceListCacheTags(businessContext.business.id),
    ...getBusinessQuoteDetailCacheTags(businessContext.business.id, quoteId),
  ]);

  return { success: `Invoice ${result.invoiceNumber} created.`, invoiceId: result.invoiceId };
}

/**
 * Update invoice status (send, mark paid, void).
 */
export async function updateInvoiceStatusAction(
  invoiceId: string,
  status: InvoiceStatus,
): Promise<InvoiceRecordActionState> {
  const access = await getWorkspaceBusinessActionContext();

  if (!access.ok) {
    return { error: access.error };
  }

  const { user, businessContext } = access;

  const result = await updateInvoiceStatusForBusiness({
    businessId: businessContext.business.id,
    invoiceId,
    status,
    userId: user.id,
  });

  if (result.error) {
    return { error: result.error };
  }

  revalidateCacheTags([
    ...getBusinessInvoiceListCacheTags(businessContext.business.id),
    ...getBusinessInvoiceDetailCacheTags(businessContext.business.id, invoiceId),
  ]);

  return { success: "Invoice updated." };
}

/**
 * Soft-delete an invoice.
 */
export async function deleteInvoiceAction(
  invoiceId: string,
): Promise<InvoiceRecordActionState> {
  const access = await getWorkspaceBusinessActionContext();

  if (!access.ok) {
    return { error: access.error };
  }

  const { user, businessContext } = access;

  const result = await deleteInvoiceForBusiness({
    businessId: businessContext.business.id,
    invoiceId,
    userId: user.id,
  });

  if (result.error) {
    return { error: result.error };
  }

  revalidateCacheTags(getBusinessInvoiceListCacheTags(businessContext.business.id));

  return { success: "Invoice deleted." };
}


/**
 * Send an invoice via email to the customer.
 */
export async function sendInvoiceEmailAction(
  invoiceId: string,
): Promise<InvoiceRecordActionState> {
  const access = await getWorkspaceBusinessActionContext();

  if (!access.ok) {
    return { error: access.error };
  }

  const { businessContext } = access;

  const result = await sendInvoiceEmailForBusiness({
    businessId: businessContext.business.id,
    invoiceId,
  });

  if (result.error) {
    return { error: result.error };
  }

  revalidateCacheTags([
    ...getBusinessInvoiceListCacheTags(businessContext.business.id),
    ...getBusinessInvoiceDetailCacheTags(businessContext.business.id, invoiceId),
  ]);

  return { success: "Invoice sent." };
}
