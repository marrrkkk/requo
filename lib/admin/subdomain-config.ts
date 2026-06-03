export function getAdminHost(): string {
  if (process.env.ADMIN_SUBDOMAIN_HOST) {
    return process.env.ADMIN_SUBDOMAIN_HOST;
  }

  const baseUrl =
    process.env.BETTER_AUTH_URL ??
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : undefined);

  if (!baseUrl) {
    // Fallback for local dev when neither env var is set
    return "admin.localhost:3000";
  }

  const url = new URL(baseUrl);

  if (url.hostname === "localhost") {
    return `admin.localhost${url.port ? `:${url.port}` : ""}`;
  }

  return `admin.${url.hostname}${url.port ? `:${url.port}` : ""}`;
}