/**
 * CSRF origin validation utility.
 *
 * Validates that state-changing requests originate from the configured
 * application origin. Supports localhost, production, and Vercel preview
 * deploys without code changes via NEXT_PUBLIC_APP_URL or BETTER_AUTH_URL.
 */

export interface CsrfValidationResult {
  valid: boolean;
  reason?: string;
}

/** Paths exempt from CSRF origin validation (use alternative auth mechanisms) */
export const CSRF_EXEMPT_PATHS = [
  "/api/auth/", // Better Auth handles its own security
  "/api/billing/polar/webhook", // HMAC signature verification
  "/api/public/", // Public-facing endpoints with rate limiting
  "/api/inngest/", // Inngest signing key authentication
  "/.well-known/", // Discovery, OAuth, and MCP endpoints
  "/api/push/", // Push subscription from service workers
] as const;

/**
 * Check whether a pathname is exempt from CSRF origin validation.
 * A path is exempt if it starts with any entry in CSRF_EXEMPT_PATHS.
 */
export function isCsrfExempt(pathname: string): boolean {
  return CSRF_EXEMPT_PATHS.some((exempt) => pathname.startsWith(exempt));
}

/**
 * Extract the origin (scheme + host + port) from a URL string.
 * Returns null if the input is not a valid URL or is empty/null.
 */
function extractOrigin(value: string | null | undefined): string | null {
  if (!value || value.trim() === "") return null;

  try {
    const url = new URL(value);
    return url.origin;
  } catch {
    return null;
  }
}

/**
 * Validate that the request's Origin (or Referer) header matches the
 * configured application origin exactly (scheme + host + port).
 *
 * @param requestHeaders - The incoming request headers
 * @param allowedOrigin - The configured application origin URL
 *   (typically from NEXT_PUBLIC_APP_URL or BETTER_AUTH_URL)
 * @returns CsrfValidationResult with valid: true only on exact origin match
 */
export function validateOrigin(
  requestHeaders: Headers,
  allowedOrigin: string,
): CsrfValidationResult {
  // Parse the allowed origin to extract scheme + host + port
  const parsedAllowed = extractOrigin(allowedOrigin);
  if (!parsedAllowed) {
    return { valid: false, reason: "Invalid allowed origin configuration" };
  }

  // Check Origin header first, fall back to Referer
  const originHeader = requestHeaders.get("origin");
  const refererHeader = requestHeaders.get("referer");

  const requestOriginRaw = originHeader ?? refererHeader;

  if (!requestOriginRaw || requestOriginRaw.trim() === "") {
    return { valid: false, reason: "Missing Origin and Referer headers" };
  }

  const requestOrigin = extractOrigin(requestOriginRaw);
  if (!requestOrigin) {
    return { valid: false, reason: "Malformed Origin or Referer header" };
  }

  // Exact match on scheme + host + port
  if (requestOrigin === parsedAllowed) {
    return { valid: true };
  }

  return {
    valid: false,
    reason: `Origin mismatch: got ${requestOrigin}, expected ${parsedAllowed}`,
  };
}
