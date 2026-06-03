export const activeBusinessSlugCookieName = "requo-active-business";

export const dashboardPath = "/home";
export const newBusinessPath = "/new";

export type BusinessSettingsSection =
  | "general"
  | "members"
  | "notifications"
  | "profile"
  | "security"
  | "quote"
  | "invoices"
  | "email"
  | "pricing"
  | "knowledge"
  | "support"
  | "automations"
  | "integrations"
  | "billing"
  | "audit-log";

export function getBusinessPath(slug: string) {
  return `/${slug}`;
}

export function getBusinessDashboardPath(slug: string) {
  return `${getBusinessPath(slug)}/home`;
}

export function getBusinessAnalyticsPath(slug: string) {
  return `${getBusinessPath(slug)}/analytics`;
}

export function getBusinessInquiriesPath(slug: string) {
  return `${getBusinessPath(slug)}/inquiries`;
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
  return `${getBusinessPath(slug)}/quotes`;
}

export function getBusinessFollowUpsPath(slug: string) {
  return `${getBusinessPath(slug)}/follow-ups`;
}

export function getBusinessFollowUpPath(slug: string, followUpId: string) {
  return `${getBusinessFollowUpsPath(slug)}/${followUpId}`;
}

export function getBusinessAssistantPath(slug: string) {
  return `${getBusinessPath(slug)}/assistant`;
}

export function getBusinessChatPath(slug: string) {
  return `${getBusinessPath(slug)}/chat`;
}

export function getBusinessChatNewPath(slug: string) {
  return `${getBusinessChatPath(slug)}/new`;
}

export function getBusinessChatConversationPath(slug: string, conversationId: string) {
  return `${getBusinessChatPath(slug)}/${conversationId}`;
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

export function getBusinessQuotePreviewPath(slug: string, quoteId: string) {
  return `${getBusinessQuotesPath(slug)}/${quoteId}/preview`;
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
  const basePath = `${getBusinessPath(slug)}/settings`;

  return section ? `${basePath}/${section}` : basePath;
}

export function getBusinessMemberInvitePath(token: string) {
  return `/invite/${token}`;
}

export function getBusinessFormsPath(slug: string) {
  return `${getBusinessPath(slug)}/forms`;
}

export function getBusinessMembersPath(slug: string) {
  return `${getBusinessPath(slug)}/members`;
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

export function getBusinessAutomationsPath(slug: string) {
  return `${getBusinessPath(slug)}/automations`;
}

export function getBusinessJobsPath(slug: string) {
  return `${getBusinessPath(slug)}/jobs`;
}

export function getBusinessJobPath(slug: string, jobId: string) {
  return `${getBusinessJobsPath(slug)}/${jobId}`;
}

export function getBusinessInvoicesPath(slug: string) {
  return `${getBusinessPath(slug)}/invoices`;
}

export function getBusinessInvoicePath(slug: string, invoiceId: string) {
  return `${getBusinessInvoicesPath(slug)}/${invoiceId}`;
}

export function getBusinessKnowledgeCompatibilityPath(slug: string) {
  return `${getBusinessPath(slug)}/knowledge`;
}

export function getBusinessDashboardSlugFromPathname(pathname: string) {
  const match = /^\/([^/]+)(?:\/|$)/.exec(pathname);

  return match ? decodeURIComponent(match[1]) : null;
}
