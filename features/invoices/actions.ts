"use server";

import { revalidateTag } from "next/cache";

import { getValidationActionState, getUserSafeErrorMessage } from "@/lib/action-state";
import { getBusinessMessagingSettings, getBusinessOwnerEmails, getOperationalBusinessActionContext } from "@/lib/db/business-access";
import { isEmailConfigured } from "@/lib/env";
import { getBusinessInvoiceDetailCacheTags, getBusinessInvoiceListCacheTags } from "@/lib/cache/business-tags";
import { createInvoiceForBusiness, markInvoiceSentForBusiness, recordPaymentForBusiness, updateInvoiceDraftForBusiness, voidInvoiceForBusiness, voidPaymentForBusiness } from "@/features/invoices/mutations";
import { getInvoiceForBusiness } from "@/features/invoices/queries";
import { invoiceSchema, paymentSchema } from "@/features/invoices/schemas";
import type { InvoiceActionState, PaymentActionState } from "@/features/invoices/types";
import { sendPushInvoicePaidEvent, sendPushInvoiceSentEvent } from "@/lib/inngest/send";
import { hasFeatureAccess } from "@/lib/plans/entitlements";
import { checkUsageAllowance } from "@/lib/plans/usage";
import { getResendFromEmailConfigurationError, getResendSendFailureMessage, sendInvoiceEmail } from "@/lib/resend/client";

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function invalidate(businessId: string, invoiceId?: string) {
  for (const tag of getBusinessInvoiceListCacheTags(businessId)) revalidateTag(tag, "max");
  if (invoiceId) for (const tag of getBusinessInvoiceDetailCacheTags(businessId, invoiceId)) revalidateTag(tag, "max");
}

export async function createInvoiceAction(quoteId: string | null, _prev: InvoiceActionState, formData: FormData): Promise<InvoiceActionState> {
  const access = await getOperationalBusinessActionContext();
  if (!access.ok) return { error: access.error };
  const parsed = invoiceSchema.safeParse({
    title: text(formData, "title"), customerName: text(formData, "customerName"), customerEmail: text(formData, "customerEmail"), customerContactMethod: text(formData, "customerContactMethod") || "email", customerContactHandle: text(formData, "customerContactHandle"), issueDate: text(formData, "issueDate"), dueDate: text(formData, "dueDate"), discountInCents: text(formData, "discount"), taxInCents: text(formData, "tax"), taxLabel: text(formData, "taxLabel"), notes: text(formData, "notes"), paymentTerms: text(formData, "paymentTerms"), items: (() => { try { return JSON.parse(text(formData, "items")); } catch { return []; } })(),
  });
  if (!parsed.success) return getValidationActionState(parsed.error, "Check the highlighted fields and try again.");
  try {
    const result = await createInvoiceForBusiness({ ...parsed.data, quoteId, businessId: access.businessContext.business.id, actorUserId: access.user.id, currency: access.businessContext.business.defaultCurrency });
    if (!result) return { error: "Unable to create invoice." };
    if ("error" in result) return { error: result.error };
    invalidate(access.businessContext.business.id, result.id);
    return { success: result.existing ? "This quote already has an invoice." : "Invoice created.", invoiceId: result.id, invoiceNumber: result.invoiceNumber };
  } catch (error) {
    return { error: getUserSafeErrorMessage(error, "Unable to create invoice. Please try again.") };
  }
}

export async function updateInvoiceDraftAction(invoiceId: string, _prev: InvoiceActionState, formData: FormData): Promise<InvoiceActionState> {
  const access = await getOperationalBusinessActionContext();
  if (!access.ok) return { error: access.error };
  const parsed = invoiceSchema.safeParse({
    title: text(formData, "title"), customerName: text(formData, "customerName"), customerEmail: text(formData, "customerEmail"), customerContactMethod: text(formData, "customerContactMethod") || "email", customerContactHandle: text(formData, "customerContactHandle"), issueDate: text(formData, "issueDate"), dueDate: text(formData, "dueDate"), discountInCents: text(formData, "discount"), taxInCents: text(formData, "tax"), taxLabel: text(formData, "taxLabel"), notes: text(formData, "notes"), paymentTerms: text(formData, "paymentTerms"), items: (() => { try { return JSON.parse(text(formData, "items")); } catch { return []; } })(),
  });
  if (!parsed.success) return getValidationActionState(parsed.error, "Check the highlighted fields and try again.");
  try {
    const result = await updateInvoiceDraftForBusiness({ ...parsed.data, invoiceId, businessId: access.businessContext.business.id, actorUserId: access.user.id });
    if (!result) return { error: "Invoice not found." };
    if ("error" in result) return { error: result.error };
    invalidate(access.businessContext.business.id, invoiceId);
    return { success: "Invoice updated.", invoiceId, invoiceNumber: result.invoiceNumber };
  } catch (error) {
    return { error: getUserSafeErrorMessage(error, "Unable to update invoice. Please try again.") };
  }
}

export async function sendInvoiceAction(invoiceId: string, _prev: InvoiceActionState, formData: FormData): Promise<InvoiceActionState> {
  const access = await getOperationalBusinessActionContext();
  if (!access.ok) return { error: access.error };
  const deliveryMethod = formData.get("deliveryMethod") === "manual" ? "manual" : "requo";

  try {
    const invoice = await getInvoiceForBusiness({ businessId: access.businessContext.business.id, invoiceId });
    if (!invoice) return { error: "Invoice not found." };
    if (invoice.status !== "draft") return { error: "Only draft invoices can be sent." };
    if (deliveryMethod === "requo" && !invoice.customerEmail) {
      return { error: "Add a customer email before sending this invoice with Requo email." };
    }

    if (deliveryMethod === "requo") {
      const [dailyAllowance, monthlyAllowance] = await Promise.all([
        checkUsageAllowance(access.businessContext.business.id, access.businessContext.business.plan, "requoQuoteEmailsPerDay"),
        checkUsageAllowance(access.businessContext.business.id, access.businessContext.business.plan, "requoQuoteEmailsPerMonth"),
      ]);
      if (!dailyAllowance.allowed || !monthlyAllowance.allowed) {
        return { error: "You've reached this month's Requo email limit. You can still mark the invoice as sent after manual delivery." };
      }
    }

    const businessSettings = await getBusinessMessagingSettings(access.businessContext.business.id);
    if (!businessSettings) return { error: "This business could not be loaded." };
    const ownerEmails = await getBusinessOwnerEmails(access.businessContext.business.id);

    if (deliveryMethod === "requo") {
      if (!isEmailConfigured) {
        return { error: "Invoice email delivery is unavailable right now. Configure email and try again." };
      }
      const senderError = getResendFromEmailConfigurationError();
      if (senderError) return { error: senderError };
      await sendInvoiceEmail({
        invoiceId: invoice.id,
        updatedAt: new Date(),
        businessName: access.businessContext.business.name,
        customerName: invoice.customerName,
        customerEmail: invoice.customerEmail,
        invoiceNumber: invoice.invoiceNumber,
        title: invoice.title,
        currency: invoice.currency,
        issueDate: invoice.issueDate,
        dueDate: invoice.dueDate,
        subtotalInCents: invoice.subtotalInCents,
        discountInCents: invoice.discountInCents,
        taxInCents: invoice.taxInCents,
        taxLabel: invoice.taxLabel,
        totalInCents: invoice.totalInCents,
        balanceInCents: invoice.balanceInCents,
        notes: invoice.notes,
        paymentTerms: invoice.paymentTerms,
        emailSignature: businessSettings.defaultEmailSignature,
        items: invoice.items,
        templateOverrides: hasFeatureAccess(
          access.businessContext.business.plan,
          "emailTemplates",
        )
          ? businessSettings.invoiceEmailTemplate
          : null,
        replyToEmail: businessSettings.contactEmail ?? ownerEmails[0],
        businessId: access.businessContext.business.id,
        userId: access.user.id,
      });
    }

    const result = await markInvoiceSentForBusiness({
      businessId: access.businessContext.business.id,
      invoiceId,
      actorUserId: access.user.id,
    });
    if (!result) return { error: "Invoice not found." };
    if (!result.changed) return { error: "Only draft invoices can be sent." };
    void sendPushInvoiceSentEvent({
      businessId: access.businessContext.business.id,
      businessSlug: access.businessContext.business.slug,
      invoiceId,
      invoiceNumber: invoice.invoiceNumber,
      customerName: invoice.customerName,
    }).catch((error) => {
      console.error("Failed to queue push notification for invoice sent.", error);
    });
    invalidate(access.businessContext.business.id, invoiceId);
    return {
      success:
        deliveryMethod === "manual"
          ? `Invoice ${invoice.invoiceNumber} marked as sent after manual delivery.`
          : `Invoice ${invoice.invoiceNumber} sent to ${invoice.customerEmail}.`,
    };
  } catch (error) {
    return { error: getResendSendFailureMessage(error) ?? getUserSafeErrorMessage(error, "We couldn't send that invoice right now.") };
  }
}

export async function markInvoiceSentAction(invoiceId: string, _prev: InvoiceActionState, _formData: FormData): Promise<InvoiceActionState> {
  const access = await getOperationalBusinessActionContext();
  if (!access.ok) return { error: access.error };
  try {
    const result = await markInvoiceSentForBusiness({ businessId: access.businessContext.business.id, invoiceId, actorUserId: access.user.id });
    if (!result) return { error: "Invoice not found." };
    invalidate(access.businessContext.business.id, invoiceId);
    return { success: result.changed ? "Invoice marked as sent." : "Invoice is already sent." };
  } catch (error) {
    return { error: getUserSafeErrorMessage(error, "Unable to update invoice.") };
  }
}

export async function recordPaymentAction(invoiceId: string, _prev: PaymentActionState, formData: FormData): Promise<PaymentActionState> {
  const access = await getOperationalBusinessActionContext();
  if (!access.ok) return { error: access.error };
  const parsed = paymentSchema.safeParse({ amountInCents: text(formData, "amount"), paymentDate: text(formData, "paymentDate"), method: text(formData, "method"), reference: text(formData, "reference"), notes: text(formData, "notes") });
  if (!parsed.success) return getValidationActionState(parsed.error, "Check the highlighted fields and try again.");
  try {
    const invoice = await getInvoiceForBusiness({ businessId: access.businessContext.business.id, invoiceId });
    const result = await recordPaymentForBusiness({ ...parsed.data, invoiceId, businessId: access.businessContext.business.id, actorUserId: access.user.id });
    if ("error" in result) return { error: result.error };
    if (result.status === "paid" && invoice) {
      void sendPushInvoicePaidEvent({
        businessId: access.businessContext.business.id,
        businessSlug: access.businessContext.business.slug,
        invoiceId,
        invoiceNumber: invoice.invoiceNumber,
        customerName: invoice.customerName,
      }).catch((error) => {
        console.error("Failed to queue push notification for invoice paid.", error);
      });
    }
    invalidate(access.businessContext.business.id, invoiceId);
    return { success: "Payment recorded." };
  } catch (error) {
    return { error: getUserSafeErrorMessage(error, "Unable to record payment. Please try again.") };
  }
}

export async function voidPaymentAction(paymentId: string, invoiceId: string, _prev: PaymentActionState, formData: FormData): Promise<PaymentActionState> {
  const access = await getOperationalBusinessActionContext();
  if (!access.ok) return { error: access.error };
  const result = await voidPaymentForBusiness({ businessId: access.businessContext.business.id, paymentId, actorUserId: access.user.id, reason: text(formData, "reason") });
  if (!result) return { error: "Payment not found or already voided." };
  invalidate(access.businessContext.business.id, invoiceId);
  return { success: "Payment voided." };
}

export async function voidInvoiceAction(invoiceId: string, _prev: InvoiceActionState, formData: FormData): Promise<InvoiceActionState> {
  const access = await getOperationalBusinessActionContext();
  if (!access.ok) return { error: access.error };
  const result = await voidInvoiceForBusiness({ businessId: access.businessContext.business.id, invoiceId, actorUserId: access.user.id, reason: text(formData, "reason") });
  if (!result) return { error: "Invoice not found." };
  if ("error" in result) return { error: result.error };
  invalidate(access.businessContext.business.id, invoiceId);
  return { success: "Invoice voided." };
}
