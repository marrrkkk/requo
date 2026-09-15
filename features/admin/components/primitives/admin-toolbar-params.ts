/**
 * Shared URL-param plumbing for admin list toolbars.
 *
 * Lives outside `admin-list-toolbar.tsx` on purpose: that module is
 * `"use client"`, and server components cannot read its exports at
 * module-evaluation time (client exports arrive as proxies). Sections
 * build their toolbar `values` records with this instead.
 */

/**
 * Read one raw search-param value as plain text for toolbar state.
 *
 * Collapses array params and missing keys to a single string
 * (`""` = unset).
 */
export function getAdminToolbarParam(
  rawParams: Record<string, string | string[] | undefined>,
  key: string,
): string {
  const value = rawParams[key];

  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return "";
}
