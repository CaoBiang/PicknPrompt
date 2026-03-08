export function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, '');
}

export function buildResponsesUrl(baseUrl: string) {
  const normalized = trimTrailingSlash(baseUrl.trim());

  if (normalized.endsWith('/v1/responses')) {
    return normalized;
  }

  if (normalized.endsWith('/v1')) {
    return `${normalized}/responses`;
  }

  return `${normalized}/v1/responses`;
}

export function isRestrictedPage(url: string) {
  return ['chrome:', 'edge:', 'about:', 'chrome-extension:', 'moz-extension:'].some((protocol) =>
    url.startsWith(protocol),
  );
}
