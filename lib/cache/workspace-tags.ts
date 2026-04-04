export const hotWorkspaceCacheLife = {
  stale: 20,
  revalidate: 20,
  expire: 300,
} as const;

export const settingsWorkspaceCacheLife = {
  stale: 60,
  revalidate: 60,
  expire: 600,
} as const;

function getWorkspaceScopeTag(workspaceId: string) {
  return `workspace:${workspaceId}`;
}

export function uniqueCacheTags(
  tags: Array<string | null | undefined>,
): string[] {
  return Array.from(
    new Set(tags.filter((tag): tag is string => Boolean(tag))),
  );
}

export function getWorkspaceSettingsCacheTags(workspaceId: string) {
  const scopeTag = getWorkspaceScopeTag(workspaceId);

  return uniqueCacheTags([scopeTag, `${scopeTag}:settings`]);
}

export function getWorkspaceInquiryFormsCacheTags(workspaceId: string) {
  const scopeTag = getWorkspaceScopeTag(workspaceId);

  return uniqueCacheTags([
    scopeTag,
    `${scopeTag}:settings`,
    `${scopeTag}:inquiry-forms`,
  ]);
}

export function getWorkspaceInquiryFormCacheTags(
  workspaceId: string,
  formSlug: string,
) {
  const scopeTag = getWorkspaceScopeTag(workspaceId);

  return uniqueCacheTags([
    scopeTag,
    `${scopeTag}:settings`,
    `${scopeTag}:inquiry-forms`,
    `${scopeTag}:inquiry-form:${formSlug}`,
  ]);
}

export function getWorkspaceInquiryListCacheTags(workspaceId: string) {
  const scopeTag = getWorkspaceScopeTag(workspaceId);

  return uniqueCacheTags([
    scopeTag,
    `${scopeTag}:dashboard`,
    `${scopeTag}:inquiries`,
  ]);
}

export function getWorkspaceInquiryDetailCacheTags(
  workspaceId: string,
  inquiryId: string,
) {
  const scopeTag = getWorkspaceScopeTag(workspaceId);

  return uniqueCacheTags([
    scopeTag,
    `${scopeTag}:dashboard`,
    `${scopeTag}:inquiries`,
    `${scopeTag}:inquiry:${inquiryId}`,
    `${scopeTag}:quotes`,
  ]);
}

export function getWorkspaceQuoteListCacheTags(workspaceId: string) {
  const scopeTag = getWorkspaceScopeTag(workspaceId);

  return uniqueCacheTags([
    scopeTag,
    `${scopeTag}:dashboard`,
    `${scopeTag}:quotes`,
  ]);
}

export function getWorkspaceQuoteDetailCacheTags(
  workspaceId: string,
  quoteId: string,
) {
  const scopeTag = getWorkspaceScopeTag(workspaceId);

  return uniqueCacheTags([
    scopeTag,
    `${scopeTag}:dashboard`,
    `${scopeTag}:quotes`,
    `${scopeTag}:quote:${quoteId}`,
    `${scopeTag}:inquiries`,
  ]);
}

export function getWorkspacePricingCacheTags(workspaceId: string) {
  const scopeTag = getWorkspaceScopeTag(workspaceId);

  return uniqueCacheTags([
    scopeTag,
    `${scopeTag}:settings`,
    `${scopeTag}:pricing`,
  ]);
}

export function getWorkspaceKnowledgeCacheTags(workspaceId: string) {
  const scopeTag = getWorkspaceScopeTag(workspaceId);

  return uniqueCacheTags([
    scopeTag,
    `${scopeTag}:settings`,
    `${scopeTag}:knowledge`,
  ]);
}

export function getWorkspaceAnalyticsCacheTags(workspaceId: string) {
  const scopeTag = getWorkspaceScopeTag(workspaceId);

  return uniqueCacheTags([
    scopeTag,
    `${scopeTag}:dashboard`,
    `${scopeTag}:analytics`,
    `${scopeTag}:inquiries`,
    `${scopeTag}:quotes`,
  ]);
}

export function getWorkspaceOverviewCacheTags(workspaceId: string) {
  const scopeTag = getWorkspaceScopeTag(workspaceId);

  return uniqueCacheTags([
    scopeTag,
    `${scopeTag}:dashboard`,
    `${scopeTag}:overview`,
    `${scopeTag}:inquiries`,
    `${scopeTag}:quotes`,
  ]);
}
