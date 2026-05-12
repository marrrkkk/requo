/**
 * Route registry for SEO / crawler policy.
 *
 * This module is the single source of truth for which top-level path prefixes
 * are treated as public (indexable, listed in `robots.allow`, eligible for the
 * sitemap) versus private (noindex, listed in `robots.disallow`). It is
 * consumed by `app/robots.ts`, `app/sitemap.ts`, per-route metadata helpers,
 * and audit scripts, so it must stay dependency-free (no imports from `next`,
 * `react`, or any other runtime package). Only Node / TS built-ins are
 * allowed.
 */

export const PUBLIC_ROUTE_PREFIXES = [
  "/",
  "/inquire",
  "/pricing",
  "/privacy",
  "/terms",
  "/refund-policy",
  "/businesses",
] as const;

export const PRIVATE_ROUTE_PREFIXES = [
  "/account",
  "/admin",
  "/api",
  "/forgot-password",
  "/invite",
  "/login",
  "/onboarding",
  "/quote",
  "/reset-password",
  "/signup",
  "/verify-email",
] as const;

export type PublicRoutePrefix = (typeof PUBLIC_ROUTE_PREFIXES)[number];
export type PrivateRoutePrefix = (typeof PRIVATE_ROUTE_PREFIXES)[number];

/**
 * Returns true when `pathname` either equals `prefix` exactly or sits beneath
 * `prefix` as a path segment boundary. The root prefix `"/"` only matches the
 * literal root so it does not swallow every other pathname.
 */
function pathnameStartsWithPrefix(pathname: string, prefix: string): boolean {
  if (prefix === "/") {
    return pathname === "/";
  }

  if (pathname === prefix) {
    return true;
  }

  return pathname.startsWith(`${prefix}/`);
}

export function isPublicRoutePrefix(pathname: string): boolean {
  return PUBLIC_ROUTE_PREFIXES.some((prefix) =>
    pathnameStartsWithPrefix(pathname, prefix),
  );
}

export function isPrivateRoutePrefix(pathname: string): boolean {
  return PRIVATE_ROUTE_PREFIXES.some((prefix) =>
    pathnameStartsWithPrefix(pathname, prefix),
  );
}
