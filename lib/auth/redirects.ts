export function getSafeAuthRedirectPath(
  value: string | null | undefined,
  fallback = "/workspaces",
) {
  if (!value) {
    return fallback;
  }

  const normalized = value.trim();

  if (!normalized.startsWith("/") || normalized.startsWith("//")) {
    return fallback;
  }

  if (normalized.startsWith("/api/")) {
    return fallback;
  }

  return normalized;
}

export function getAuthPathWithNext(pathname: string, nextPath?: string | null) {
  const searchParams = new URLSearchParams();
  const safeNextPath = getSafeAuthRedirectPath(nextPath, "");

  if (safeNextPath) {
    searchParams.set("next", safeNextPath);
  }

  const search = searchParams.toString();

  return search ? `${pathname}?${search}` : pathname;
}
