export function parseAdminEmailAllowlist(value: string | null | undefined) {
  return Array.from(
    new Set(
      (value ?? "")
        .split(",")
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean),
    ),
  );
}

export function isEmailInAdminAllowlist(
  email: string | null | undefined,
  allowlist: string | null | undefined,
) {
  if (!email) {
    return false;
  }

  return parseAdminEmailAllowlist(allowlist).includes(
    email.trim().toLowerCase(),
  );
}
