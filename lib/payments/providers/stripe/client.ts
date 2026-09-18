import "server-only";

export const STRIPE_API_BASE = "https://api.stripe.com";

export type StripeFetch = typeof fetch;

export class StripeApiError extends Error {
  status: number;
  code?: string;
  retryable: boolean;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.name = "StripeApiError";
    this.status = status;
    this.code = code;
    this.retryable = status === 429 || status >= 500;
  }
}

function errorDetail(body: unknown): { message: string; code?: string } {
  const root = body !== null && typeof body === "object" ? (body as { error?: { message?: string; code?: string } }) : {};
  return {
    message: root.error?.message ?? "Stripe request failed.",
    code: root.error?.code,
  };
}

export async function stripeRequest<T>(input: {
  secretKey: string;
  method: "GET" | "POST";
  path: string;
  form?: Record<string, string>;
  idempotencyKey?: string;
  /** Connected account for direct charges (Stripe Connect). */
  stripeAccount?: string;
  fetchImpl?: StripeFetch;
}): Promise<T> {
  const fetchImpl = input.fetchImpl ?? fetch;
  const query = input.method === "GET" && input.form ? `?${new URLSearchParams(input.form).toString()}` : "";
  const response = await fetchImpl(`${STRIPE_API_BASE}${input.path}${query}`, {
    method: input.method,
    headers: {
      Authorization: `Bearer ${input.secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
      ...(input.idempotencyKey ? { "Idempotency-Key": input.idempotencyKey } : {}),
      ...(input.stripeAccount ? { "Stripe-Account": input.stripeAccount } : {}),
    },
    body:
      input.method === "POST" && input.form
        ? new URLSearchParams(input.form).toString()
        : undefined,
  });
  let parsed: unknown = null;
  try {
    parsed = await response.json();
  } catch {
    parsed = null;
  }
  if (!response.ok) {
    const { message, code } = errorDetail(parsed);
    throw new StripeApiError(response.status, message, code);
  }
  return parsed as T;
}
