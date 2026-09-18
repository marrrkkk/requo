import "server-only";

export const PAYMONGO_API_BASE = "https://api.paymongo.com";

export type PayMongoFetch = typeof fetch;

export class PayMongoApiError extends Error {
  status: number;
  code?: string;
  retryable: boolean;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.name = "PayMongoApiError";
    this.status = status;
    this.code = code;
    this.retryable = status === 429 || status >= 500;
  }
}

function basicAuth(secretKey: string): string {
  return `Basic ${Buffer.from(`${secretKey}:`).toString("base64")}`;
}

function errorDetail(body: unknown): { message: string; code?: string } {
  const root = body !== null && typeof body === "object" ? (body as { errors?: Array<{ code?: string; detail?: string }> }) : {};
  const first = Array.isArray(root.errors) ? root.errors[0] : undefined;
  return {
    message: first?.detail ?? "PayMongo request failed.",
    code: first?.code,
  };
}

export async function paymongoRequest<T>(input: {
  secretKey: string;
  method: "GET" | "POST";
  path: string;
  body?: unknown;
  idempotencyKey?: string;
  fetchImpl?: PayMongoFetch;
}): Promise<T> {
  const fetchImpl = input.fetchImpl ?? fetch;
  const response = await fetchImpl(`${PAYMONGO_API_BASE}${input.path}`, {
    method: input.method,
    headers: {
      Authorization: basicAuth(input.secretKey),
      "Content-Type": "application/json",
      ...(input.idempotencyKey ? { "Idempotency-Key": input.idempotencyKey } : {}),
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
    throw new PayMongoApiError(response.status, message, code);
  }
  return parsed as T;
}
