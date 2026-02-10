export function combineHeaders(
  ...headers: Array<Record<string, string | undefined> | undefined>
): Record<string, string> {
  const result: Record<string, string> = {};

  for (const headerSet of headers) {
    if (!headerSet) {
      continue;
    }

    for (const [key, value] of Object.entries(headerSet)) {
      if (value !== undefined) {
        result[key] = value;
      }
    }
  }

  return result;
}

export function withUserAgentSuffix(
  headers: Record<string, string | undefined>,
  suffix: string,
): Record<string, string> {
  const ua = headers['User-Agent'];
  const userAgent = ua ? `${ua} ${suffix}` : suffix;

  return combineHeaders(headers, { 'User-Agent': userAgent });
}
