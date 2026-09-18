"use server";

import { revalidatePath, revalidateTag } from "next/cache";

import { getValidationActionState, getUserSafeErrorMessage } from "@/lib/action-state";
import { getBusinessInvoiceDetailCacheTags, getBusinessInvoiceListCacheTags } from "@/lib/cache/business-tags";
import { getOperationalBusinessActionContext, getOwnerBusinessActionContext } from "@/lib/db/business-access";
import { parseMoneyToCents } from "@/features/invoices/utils";
import { getBusinessSettingsPath } from "@/features/businesses/routes";
import {
  connectProviderSchema,
} from "@/features/payment-providers/schemas";
import {
  connectProviderForBusiness,
  createProviderCheckoutForBusiness,
  disconnectProviderForBusiness,
  initiateProviderRefundForBusiness,
  startStripePlatformConnection,
} from "@/features/payment-providers/mutations";
import { fakePingConnection, getProviderPaymentForBusiness } from "@/features/payment-providers/queries";
import { refreshProviderPayment } from "@/lib/payments/reconciliation";
import { absoluteUrl } from "@/lib/seo/site";

export type ProviderConnectionActionState = {
  error?: string;
  success?: string;
};

export type ProviderPaymentActionState = {
  error?: string;
  success?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  checkoutUrl?: string;
};

function invalidateInvoice(businessId: string, invoiceId: string) {
  for (const tag of getBusinessInvoiceListCacheTags(businessId)) revalidateTag(tag, "max");
  for (const tag of getBusinessInvoiceDetailCacheTags(businessId, invoiceId)) revalidateTag(tag, "max");
}

export async function connectProviderAction(
  _prev: ProviderConnectionActionState,
  formData: FormData,
): Promise<ProviderConnectionActionState> {
  const ownerAccess = await getOwnerBusinessActionContext();
  if (!ownerAccess.ok) return { error: ownerAccess.error };
  const { user, businessContext } = ownerAccess;

  const provider = String(formData.get("provider") ?? "");
  const environment = String(formData.get("environment") ?? "");
  const raw: Record<string, string> = {};
  for (const key of ["secretKey", "webhookSecret", "clientId", "clientSecret", "webhookId"]) {
    const value = formData.get(key);
    if (typeof value === "string" && value.trim()) raw[key] = value.trim();
  }
  const parsed = connectProviderSchema.safeParse({
    provider,
    environment,
    credentials: raw,
  });
  if (!parsed.success)
    return getValidationActionState(parsed.error, "Check the credentials and try again.") as ProviderConnectionActionState;

  const { credentials } = parsed.data as { credentials: Record<string, string> };
  const ping = fakePingConnection();
  if (!ping.ok) return { error: "Provider test failed." };

  const connected = await connectProviderForBusiness({
    businessId: businessContext.business.id,
    actorUserId: user.id,
    provider: parsed.data.provider,
    environment: parsed.data.environment,
    credentials,
  });
  if ("error" in connected) return { error: connected.error };
  revalidatePath(`${getBusinessSettingsPath(businessContext.business.slug)}/integrations`);
  return { success: "Provider connected." };
}

export async function disconnectProviderAction(
  _prev: ProviderConnectionActionState,
  formData: FormData,
): Promise<ProviderConnectionActionState> {
  const ownerAccess = await getOwnerBusinessActionContext();
  if (!ownerAccess.ok) return { error: ownerAccess.error };
  const { user, businessContext } = ownerAccess;
  const connectionId = String(formData.get("connectionId") ?? "");
  if (!connectionId) return { error: "Missing connection." };
  const result = await disconnectProviderForBusiness({
    businessId: businessContext.business.id,
    actorUserId: user.id,
    connectionId,
  });
  if (!result) return { error: "Connection not found." };
  revalidatePath(`${getBusinessSettingsPath(businessContext.business.slug)}/integrations`);
  return { success: "Provider disconnected." };
}

export async function startStripeConnectAction(
  _prev: ProviderPaymentActionState,
  formData: FormData,
): Promise<ProviderPaymentActionState> {
  const ownerAccess = await getOwnerBusinessActionContext();
  if (!ownerAccess.ok) return { error: ownerAccess.error };
  const { user, businessContext } = ownerAccess;
  const environment = formText(formData, "environment") === "live" ? "live" : "test";
  try {
    const origin = absoluteUrl("/").replace(/\/$/, "");
    const result = await startStripePlatformConnection({
      businessId: businessContext.business.id,
      actorUserId: user.id,
      actorEmail: user.email,
      environment,
      returnUrl: `${origin}/api/payments/stripe/connect/return`,
      refreshUrl: `${origin}/api/payments/stripe/connect/refresh`,
    });
    if ("error" in result) return { error: result.error };
    return { success: "Opening Stripe…", checkoutUrl: result.url };
  } catch (error) {
    return { error: getUserSafeErrorMessage(error, "Unable to start Stripe connection. Please try again.") };
  }
}

export async function testProviderConnectionAction(): Promise<ProviderConnectionActionState> {
  const ownerAccess = await getOwnerBusinessActionContext();
  if (!ownerAccess.ok) return { error: ownerAccess.error };
  const ping = fakePingConnection();
  return ping.ok ? { success: "Test ping ok (PR1 fake)." } : { error: "Test failed." };
}

function formText(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export async function createCheckoutAction(
  invoiceId: string,
  _prev: ProviderPaymentActionState,
  formData: FormData,
): Promise<ProviderPaymentActionState> {
  const access = await getOperationalBusinessActionContext();
  if (!access.ok) return { error: access.error };
  const { user, businessContext } = access;
  const connectionId = formText(formData, "connectionId").trim();
  const amountInCents = parseMoneyToCents(formText(formData, "amount"));
  if (!connectionId) return { error: "Choose a payment provider." };
  if (!Number.isSafeInteger(amountInCents) || amountInCents <= 0)
    return { error: "Enter a valid amount greater than zero." };
  try {
    const result = await createProviderCheckoutForBusiness({
      businessId: businessContext.business.id,
      actorUserId: user.id,
      invoiceId,
      connectionId,
      amountInCents,
      successUrl: absoluteUrl("/pay/return?status=success"),
      cancelUrl: absoluteUrl("/pay/return?status=cancelled"),
    });
    if ("error" in result) return { error: result.error };
    invalidateInvoice(businessContext.business.id, invoiceId);
    return { success: "Payment link created.", checkoutUrl: result.checkoutUrl };
  } catch (error) {
    return { error: getUserSafeErrorMessage(error, "Unable to create a payment link. Please try again.") };
  }
}

export async function refreshProviderPaymentAction(
  paymentId: string,
  invoiceId: string,
  _prev: ProviderPaymentActionState,
  _formData: FormData,
): Promise<ProviderPaymentActionState> {
  const access = await getOperationalBusinessActionContext();
  if (!access.ok) return { error: access.error };
  const { user, businessContext } = access;
  try {
    const payment = await getProviderPaymentForBusiness({ businessId: businessContext.business.id, paymentId });
    if (!payment || payment.invoiceId !== invoiceId) return { error: "Payment not found." };
    const lookupId = payment.providerPaymentId ?? payment.providerCheckoutId;
    if (!lookupId) return { error: "This payment has no provider transaction yet." };
    const result = await refreshProviderPayment({
      businessId: businessContext.business.id,
      actorUserId: user.id,
      connectionId: payment.providerConnectionId ?? "",
      providerPaymentId: lookupId,
    });
    if (!result.ok) {
      if (result.reason === "connection_not_ready")
        return { error: "This provider connection is no longer active. Reconnect to refresh payments." };
      return { error: "The provider state could not be reconciled." };
    }
    if ("ignored" in result) return { success: "Nothing new from the provider." };
    return { success: `Payment refreshed: ${result.invoiceStatus.replaceAll("_", " ")}.` };
  } catch (error) {
    return { error: getUserSafeErrorMessage(error, "Unable to refresh the payment. Please try again.") };
  }
}

export async function refundProviderPaymentAction(
  paymentId: string,
  invoiceId: string,
  _prev: ProviderPaymentActionState,
  formData: FormData,
): Promise<ProviderPaymentActionState> {
  const access = await getOperationalBusinessActionContext();
  if (!access.ok) return { error: access.error };
  const { user, businessContext } = access;
  const amountInCents = parseMoneyToCents(formText(formData, "amount"));
  if (!Number.isSafeInteger(amountInCents) || amountInCents <= 0)
    return { error: "Enter a valid refund amount greater than zero." };
  try {
    const payment = await getProviderPaymentForBusiness({ businessId: businessContext.business.id, paymentId });
    if (!payment || payment.invoiceId !== invoiceId) return { error: "Payment not found." };
    const result = await initiateProviderRefundForBusiness({
      businessId: businessContext.business.id,
      actorUserId: user.id,
      paymentId,
      amountInCents,
    });
    if ("error" in result) return { error: result.error };
    invalidateInvoice(businessContext.business.id, invoiceId);
    return { success: `Refund submitted (${result.providerRefundId}). The provider webhook will confirm it.` };
  } catch (error) {
    return { error: getUserSafeErrorMessage(error, "Unable to submit the refund. Please try again.") };
  }
}
