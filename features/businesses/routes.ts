export const activeBusinessSlugCookieName = "requo-active-business";

export type BusinessSettingsSection =
  | "general"
  | "members"
  | "notifications"
  | "profile"
  | "security"
  | "replies"
  | "quote"
  | "email"
  | "pricing"
  | "knowledge"
  | "integrations"
  | "billing";

export function getBusinessPath(slug: string) {
  return `/businesses/${slug}`;
}

export function getBusinessDashboardPath(slug: string) {
  return `${getBusinessPath(slug)}/dashboard`;
}

export function getBusinessAnalyticsPath(slug: string) {
  return `${getBusinessDashboardPath(slug)}/analytics`;
}

export function getBusinessInquiriesPath(slug: string) {
  return `${getBusinessDashboardPath(slug)}/inquiries`;
}

export function getBusinessNewInquiryPath(
  slug: string,
  formSlug?: string | null,
) {
  const basePath = `${getBusinessInquiriesPath(slug)}/new`;

  if (!formSlug) {
    return basePath;
  }

  const searchParams = new URLSearchParams({
    form: formSlug,
  });

  return `${basePath}?${searchParams.toString()}`;
}

export function getBusinessInquiryPath(slug: string, inquiryId: string) {
  return `${getBusinessInquiriesPath(slug)}/${inquiryId}`;
}

export function getBusinessQuotesPath(slug: string) {
  return `${getBusinessDashboardPath(slug)}/quotes`;
}

export function getBusinessFollowUpsPath(slug: string) {
  return `${getBusinessDashboardPath(slug)}/follow-ups`;
}

export function getBusinessNewQuotePath(
  slug: string,
  inquiryId?: string | null,
) {
  const basePath = `${getBusinessQuotesPath(slug)}/new`;

  if (!inquiryId) {
    return basePath;
  }

  const searchParams = new URLSearchParams({
    inquiryId,
  });

  return `${basePath}?${searchParams.toString()}`;
}

export function getBusinessQuotePath(slug: string, quoteId: string) {
  return `${getBusinessQuotesPath(slug)}/${quoteId}`;
}

export function getBusinessQuotePrintPath(slug: string, quoteId: string) {
  return `${getBusinessPath(slug)}/print/quotes/${quoteId}`;
}

export function getBusinessInquiryPrintPath(slug: string, inquiryId: string) {
  return `${getBusinessPath(slug)}/print/inquiries/${inquiryId}`;
}

export function getBusinessQuotesExportPath(slug: string) {
  return `/api/business/${slug}/quotes/export`;
}

export function getBusinessQuoteExportPath(
  slug: string,
  quoteId: string,
  format?: "pdf" | "png",
) {
  const basePath = `/api/business/${slug}/quotes/${quoteId}/export`;

  if (!format || format === "pdf") {
    return basePath;
  }

  const searchParams = new URLSearchParams({
    format,
  });

  return `${basePath}?${searchParams.toString()}`;
}

export function getBusinessQuotePdfExportPath(slug: string, quoteId: string) {
  return getBusinessQuoteExportPath(slug, quoteId, "pdf");
}

export function getBusinessInquiriesExportPath(slug: string) {
  return `/api/business/${slug}/inquiries/export`;
}

export function getBusinessInquiryExportPath(
  slug: string,
  inquiryId: string,
  format?: "pdf" | "png",
) {
  const basePath = `/api/business/${slug}/inquiries/${inquiryId}/export`;

  if (!format || format === "pdf") {
    return basePath;
  }

  const searchParams = new URLSearchParams({
    format,
  });

  return `${basePath}?${searchParams.toString()}`;
}

export function getBusinessInquiryPdfExportPath(slug: string, inquiryId: string) {
  return getBusinessInquiryExportPath(slug, inquiryId, "pdf");
}

export function getBusinessSettingsPath(
  slug: string,
  section?: BusinessSettingsSection,
) {
  const basePath = `${getBusinessDashboardPath(slug)}/settings`;

  return section ? `${basePath}/${section}` : basePath;
}

export function getBusinessMemberInvitePath(token: string) {
  return `/invite/${token}`;
}

export function getBusinessFormsPath(slug: string) {
  return `${getBusinessDashboardPath(slug)}/forms`;
}

export function getBusinessMembersPath(slug: string) {
  return `${getBusinessDashboardPath(slug)}/members`;
}

export function getBusinessFormPath(slug: string, formSlug: string) {
  return `${getBusinessFormsPath(slug)}/${formSlug}`;
}

export function getBusinessInquiryFormsPath(slug: string) {
  return getBusinessFormsPath(slug);
}

export function getBusinessInquiryFormEditorPath(
  slug: string,
  formSlug: string,
) {
  return getBusinessFormPath(slug, formSlug);
}

export function getBusinessInquiryPageEditorPath(
  slug: string,
  formSlug: string,
) {
  return getBusinessInquiryFormEditorPath(slug, formSlug);
}

export function getBusinessInquiryFormPreviewPath(
  slug: string,
  formSlug: string,
) {
  return `${getBusinessPath(slug)}/preview/inquiry/${formSlug}`;
}

export function getBusinessKnowledgeCompatibilityPath(slug: string) {
  return `${getBusinessDashboardPath(slug)}/knowledge`;
}

export function getBusinessDashboardSlugFromPathname(pathname: string) {
  const match = /^\/businesses\/([^/]+)(?:\/|$)/.exec(pathname);

  return match ? decodeURIComponent(match[1]) : null;
}
