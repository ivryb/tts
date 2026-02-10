import { TTSAPICallError } from '@tts-sdk/provider';

export type FetchFunction = typeof fetch;

export async function responseToUint8Array(response: Response): Promise<Uint8Array> {
  const data = await response.arrayBuffer();
  return new Uint8Array(data);
}

export async function readJsonSafe(response: Response): Promise<unknown> {
  try {
    return await response.clone().json();
  } catch {
    try {
      return await response.clone().text();
    } catch {
      return undefined;
    }
  }
}

export async function assertOk(response: Response, context: string): Promise<void> {
  if (response.ok) {
    return;
  }

  const body = await readJsonSafe(response);
  throw new TTSAPICallError({
    message: `${context} failed with status ${response.status}.`,
    statusCode: response.status,
    responseHeaders: headersToRecord(response.headers),
    responseBody: body,
  });
}

export async function postJson({
  fetch,
  url,
  body,
  headers,
  abortSignal,
}: {
  fetch: FetchFunction;
  url: string;
  body: unknown;
  headers?: Record<string, string>;
  abortSignal?: AbortSignal;
}): Promise<Response> {
  return fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(body),
    signal: abortSignal,
  });
}

export function headersToRecord(headers: Headers): Record<string, string> {
  return Object.fromEntries(headers.entries());
}
