export function getAdminHost(): string {
  if (process.env.ADMIN_SUBDOMAIN_HOST) {
    return process.env.ADMIN_SUBDOMAIN_HOST;
  }

  const url = new URL(process.env.BETTER_AUTH_URL!);

  if (url.hostname === "localhost") {
    return `admin.localhost${url.port ? `:${url.port}` : ""}`;
  }

  return `admin.${url.hostname}${url.port ? `:${url.port}` : ""}`;
}