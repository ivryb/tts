import { TTSAPICallError } from '@tts-sdk/provider';

const RETRYABLE_STATUS_CODES = new Set([408, 409, 425, 429]);

export function isAbortError(error: unknown): boolean {
  return (
    typeof DOMException !== 'undefined' &&
    error instanceof DOMException &&
    error.name === 'AbortError'
  );
}

export function isRetryableStatusCode(statusCode: number | undefined): boolean {
  if (statusCode == null) {
    return false;
  }

  return RETRYABLE_STATUS_CODES.has(statusCode) || statusCode >= 500;
}

export function parseRetryAfterMs(
  value: string | undefined,
  nowMs = Date.now(),
): number | undefined {
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return undefined;
  }

  const seconds = Number(trimmed);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.round(seconds * 1000);
  }

  const dateMs = Date.parse(trimmed);
  if (!Number.isFinite(dateMs)) {
    return undefined;
  }

  return Math.max(0, dateMs - nowMs);
}

export function getRetryAfterMs(error: unknown, nowMs = Date.now()): number | undefined {
  if (!TTSAPICallError.isInstance(error)) {
    return undefined;
  }

  const headerValue =
    error.responseHeaders?.['retry-after'] ??
    error.responseHeaders?.['Retry-After'];

  return parseRetryAfterMs(headerValue, nowMs);
}

export function isTransientError(error: unknown): boolean {
  if (isAbortError(error)) {
    return false;
  }

  if (TTSAPICallError.isInstance(error)) {
    return isRetryableStatusCode(error.statusCode);
  }

  // Network-level failures from fetch are usually surfaced as TypeError.
  if (error instanceof TypeError) {
    return true;
  }

  return false;
}
