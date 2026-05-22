export const RESERVED_ROUTE_SEGMENTS = new Set([
  // Auth routes
  "login",
  "signup",
  "forgot-password",
  "reset-password",
  "check-email",
  // Marketing routes
  "pricing",
  "privacy",
  "terms",
  "refund-policy",
  // App routes
  "onboarding",
  "admin",
  "api",
  "invite",
  "account",
  "verify-email",
  "dashboard",
  "new",
  "b",
  // Public routes
  "quote",
  "inquire",
  "not-found",
  // Well-known paths
  ".well-known",
]) as ReadonlySet<string>;

export function isReservedRouteSegment(segment: string): boolean {
  return RESERVED_ROUTE_SEGMENTS.has(segment);
}
