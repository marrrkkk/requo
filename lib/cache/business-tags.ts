export const hotBusinessCacheLife = {
  stale: 20,
  revalidate: 20,
  expire: 300,
} as const;

export const settingsBusinessCacheLife = {
  stale: 60,
  revalidate: 60,
  expire: 600,
} as const;

function getBusinessScopeTag(businessId: string) {
  return `business:${businessId}`;
}

export function uniqueCacheTags(
  tags: Array<string | null | undefined>,
): string[] {
  return Array.from(
    new Set(tags.filter((tag): tag is string => Boolean(tag))),
  );
}

export function getBusinessSettingsCacheTags(businessId: string) {
  const scopeTag = getBusinessScopeTag(businessId);

  return uniqueCacheTags([scopeTag, `${scopeTag}:settings`]);
}

export function getBusinessMembersCacheTags(businessId: string) {
  const scopeTag = getBusinessScopeTag(businessId);

  return uniqueCacheTags([
    scopeTag,
    `${scopeTag}:settings`,
    `${scopeTag}:members`,
  ]);
}

export function getBusinessInquiryFormsCacheTags(businessId: string) {
  const scopeTag = getBusinessScopeTag(businessId);

  return uniqueCacheTags([
    scopeTag,
    `${scopeTag}:settings`,
    `${scopeTag}:inquiry-forms`,
  ]);
}

export function getBusinessInquiryFormCacheTags(
  businessId: string,
  formSlug: string,
) {
  const scopeTag = getBusinessScopeTag(businessId);

  return uniqueCacheTags([
    scopeTag,
    `${scopeTag}:settings`,
    `${scopeTag}:inquiry-forms`,
    `${scopeTag}:inquiry-form:${formSlug}`,
  ]);
}

export function getBusinessInquiryListCacheTags(businessId: string) {
  const scopeTag = getBusinessScopeTag(businessId);

  return uniqueCacheTags([
    scopeTag,
    `${scopeTag}:dashboard`,
    `${scopeTag}:inquiries`,
  ]);
}

export function getBusinessInquiryDetailCacheTags(
  businessId: string,
  inquiryId: string,
) {
  const scopeTag = getBusinessScopeTag(businessId);

  return uniqueCacheTags([
    scopeTag,
    `${scopeTag}:dashboard`,
    `${scopeTag}:inquiries`,
    `${scopeTag}:inquiry:${inquiryId}`,
    `${scopeTag}:quotes`,
  ]);
}

export function getBusinessQuoteListCacheTags(businessId: string) {
  const scopeTag = getBusinessScopeTag(businessId);

  return uniqueCacheTags([
    scopeTag,
    `${scopeTag}:dashboard`,
    `${scopeTag}:quotes`,
  ]);
}

export function getBusinessQuoteDetailCacheTags(
  businessId: string,
  quoteId: string,
) {
  const scopeTag = getBusinessScopeTag(businessId);

  return uniqueCacheTags([
    scopeTag,
    `${scopeTag}:dashboard`,
    `${scopeTag}:quotes`,
    `${scopeTag}:quote:${quoteId}`,
    `${scopeTag}:inquiries`,
  ]);
}

export function getBusinessPricingCacheTags(businessId: string) {
  const scopeTag = getBusinessScopeTag(businessId);

  return uniqueCacheTags([
    scopeTag,
    `${scopeTag}:settings`,
    `${scopeTag}:pricing`,
  ]);
}

export function getBusinessReplySnippetsCacheTags(businessId: string) {
  const scopeTag = getBusinessScopeTag(businessId);

  return uniqueCacheTags([
    scopeTag,
    `${scopeTag}:settings`,
    `${scopeTag}:inquiries`,
    `${scopeTag}:reply-snippets`,
  ]);
}

export function getBusinessKnowledgeCacheTags(businessId: string) {
  const scopeTag = getBusinessScopeTag(businessId);

  return uniqueCacheTags([
    scopeTag,
    `${scopeTag}:settings`,
    `${scopeTag}:knowledge`,
  ]);
}

export function getBusinessAnalyticsCacheTags(businessId: string) {
  const scopeTag = getBusinessScopeTag(businessId);

  return uniqueCacheTags([
    scopeTag,
    `${scopeTag}:dashboard`,
    `${scopeTag}:analytics`,
    `${scopeTag}:inquiries`,
    `${scopeTag}:quotes`,
  ]);
}

export function getBusinessOverviewCacheTags(businessId: string) {
  const scopeTag = getBusinessScopeTag(businessId);

  return uniqueCacheTags([
    scopeTag,
    `${scopeTag}:dashboard`,
    `${scopeTag}:overview`,
    `${scopeTag}:inquiries`,
    `${scopeTag}:quotes`,
  ]);
}
