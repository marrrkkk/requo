/** PayPal Orders v2 + Payments v2 shapes (developer.paypal.com). */

export type PayPalCredentials = {
  clientId: string;
  clientSecret: string;
  webhookId: string;
};

export type PayPalMoney = {
  currency_code?: string;
  value?: string;
};

export type PayPalCapture = {
  id?: string;
  status?: string;
  amount?: PayPalMoney;
  final_capture?: boolean;
  create_time?: string;
  update_time?: string;
  supplementary_data?: { related_ids?: { order_id?: string } };
};

export type PayPalPurchaseUnit = {
  reference_id?: string;
  description?: string;
  custom_id?: string;
  invoice_id?: string;
  amount?: PayPalMoney;
  payments?: { captures?: PayPalCapture[]; refunds?: Array<{ id?: string }> };
};

export type PayPalOrder = {
  id?: string;
  intent?: string;
  status?: string;
  purchase_units?: PayPalPurchaseUnit[];
  create_time?: string;
  update_time?: string;
  links?: Array<{ href?: string; rel?: string; method?: string }>;
};

export type PayPalRefund = {
  id?: string;
  status?: string;
  amount?: PayPalMoney;
};

export type PayPalWebhookResource = {
  id?: string;
  status?: string;
  amount?: PayPalMoney;
  create_time?: string;
  update_time?: string;
  custom_id?: string;
  invoice_id?: string;
  supplementary_data?: { related_ids?: { order_id?: string } };
  purchase_units?: PayPalPurchaseUnit[];
};

export type PayPalWebhookEvent = {
  id?: string;
  event_type?: string;
  resource_type?: string;
  summary?: string;
  create_time?: string;
  resource?: PayPalWebhookResource;
};

/** PayPal zero-decimal currencies (no minor units). */
const ZERO_DECIMAL = new Set(["HUF", "JPY", "TWD"]);

export function paypalCurrencyDecimals(currency: string): number {
  return ZERO_DECIMAL.has(currency.toUpperCase()) ? 0 : 2;
}

export function paypalToCents(value: string | undefined, currency: string): number | undefined {
  if (typeof value !== "string" || !/^-?\d+(\.\d+)?$/.test(value.trim())) return undefined;
  const factor = 10 ** paypalCurrencyDecimals(currency);
  return Math.round(Number(value) * factor);
}

export function centsToPaypalValue(amountInCents: number, currency: string): string {
  const decimals = paypalCurrencyDecimals(currency);
  return (amountInCents / 10 ** decimals).toFixed(decimals);
}

export function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

export function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

export function parsePaypalDate(value: unknown): Date | undefined {
  if (typeof value !== "string" || !value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}
