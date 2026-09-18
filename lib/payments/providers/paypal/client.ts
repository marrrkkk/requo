import "server-only";

import type { ProviderEnvironment } from "@/lib/payments/types";

export type PayPalFetch = typeof fetch;

export function paypalApiBase(environment: ProviderEnvironment): string {
  return environment === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
}

export class PayPalApiError extends Error {
  status: number;
  code?: string;
  retryable: boolean;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.name = "PayPalApiError";
    this.status = status;
    this.code = code;
    this.retryable = status === 429 || status >= 500;
  }
}

type TokenCacheEntry = { token: string; expiresAt: number };
const tokenCache = new Map<string, TokenCacheEntry>();

function errorDetail(body: unknown): { message: string; code?: string } {
  const root = body !== null && typeof body === "object" ? (body as { message?: string; name?: string; details?: Array<{ issue?: string; description?: string }> }) : {};
  return {
    message: root.details?.[0]?.description ?? root.message ?? "PayPal request failed.",
    code: root.details?.[0]?.issue ?? root.name,
  };
}

export async function paypalAccessToken(input: {
  clientId: string;
  clientSecret: string;
  environment: ProviderEnvironment;
  fetchImpl?: PayPalFetch;
}): Promise<string> {
  const cacheKey = `${input.environment}:${input.clientId}`;
  const cached = tokenCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.token;
  const fetchImpl = input.fetchImpl ?? fetch;
  const response = await fetchImpl(`${paypalApiBase(input.environment)}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${input.clientId}:${input.clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  let parsed: unknown = null;
  try {
    parsed = await response.json();
  } catch {
    parsed = null;
  }
  const token = (parsed as { access_token?: string } | null)?.access_token;
  if (!response.ok || !token) {
    const description = (parsed as { error_description?: string } | null)?.error_description;
    throw new PayPalApiError(response.status, description ?? "PayPal authentication failed.");
  }
  const expiresIn = (parsed as { expires_in?: number }).expires_in ?? 3600;
  tokenCache.set(cacheKey, {
    token,
    expiresAt: Date.now() + Math.max(0, expiresIn - 60) * 1000,
  });
  return token;
}

export function clearPaypalTokenCache(): void {
  tokenCache.clear();
}

export async function paypalRequest<T>(input: {
  clientId: string;
  clientSecret: string;
  environment: ProviderEnvironment;
  method: "GET" | "POST";
  path: string;
  body?: unknown;
  requestId?: string;
  fetchImpl?: PayPalFetch;
}): Promise<T> {
  const fetchImpl = input.fetchImpl ?? fetch;
  const token = await paypalAccessToken({
    clientId: input.clientId,
    clientSecret: input.clientSecret,
    environment: input.environment,
    fetchImpl,
  });
  const response = await fetchImpl(`${paypalApiBase(input.environment)}${input.path}`, {
    method: input.method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(input.requestId ? { "PayPal-Request-Id": input.requestId } : {}),
    },
    body: input.body === undefined ? undefined : JSON.stringify(input.body),
  });
  let parsed: unknown = null;
  try {
    parsed = await response.json();
  } catch {
    parsed = null;
  }
  if (!response.ok) {
    const { message, code } = errorDetail(parsed);
    throw new PayPalApiError(response.status, message, code);
  }
  return parsed as T;
}
