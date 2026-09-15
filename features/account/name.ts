/**
 * Shared person-name helpers.
 *
 * Auth (`user.name`) and `profiles.fullName` store a single joined string for
 * Better Auth / audit compatibility. `profiles.firstName` / `lastName` are the
 * structured source of truth; these helpers keep split/join/display in one place.
 */

export type SplitFullName = {
  firstName: string;
  lastName: string;
};

function segmentsOf(value: string): string[] {
  return value.trim().split(/\s+/).filter(Boolean);
}

export function splitFullName(fullName: string): SplitFullName {
  const segments = segmentsOf(fullName);

  if (segments.length === 0) {
    return { firstName: "", lastName: "" };
  }

  if (segments.length === 1) {
    return { firstName: segments[0] ?? "", lastName: "" };
  }

  return {
    firstName: segments[0] ?? "",
    lastName: segments.slice(1).join(" "),
  };
}

export function joinFullName(firstName: string, lastName: string): string {
  return `${firstName.trim()} ${lastName.trim()}`
    .trim()
    .replace(/\s+/g, " ");
}

export function extractFirstName(fullName: string): string {
  return splitFullName(fullName).firstName;
}

export function extractLastName(fullName: string): string {
  return splitFullName(fullName).lastName;
}

/** True for mononyms like "Madonna" (single token, no last name present). */
export function isSingleTokenName(fullName: string): boolean {
  const segments = segmentsOf(fullName);
  return segments.length === 1;
}

/**
 * User-facing display name. Per product decision this is the first name;
 * falls back to the joined full name, then to the provided fallback.
 */
export function getDisplayFirstName(input: {
  firstName?: string | null;
  fullName?: string | null;
  userName?: string | null;
  fallback?: string;
}): string {
  const direct = (input.firstName ?? "").trim();
  if (direct) return direct;

  for (const candidate of [input.fullName, input.userName]) {
    const first = candidate ? splitFullName(candidate).firstName : "";
    if (first) return first;
    const trimmed = (candidate ?? "").trim();
    if (trimmed) return trimmed;
  }

  return input.fallback ?? "";
}

export function getInitialsFromNames(
  firstName: string,
  lastName: string,
  fallbackFullName?: string,
): string {
  const joined = joinFullName(firstName, lastName) || (fallbackFullName ?? "");
  return joined
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((segment) => segment[0]?.toUpperCase())
    .join("");
}
