import { describe, expect, it } from 'vitest';
import { TTSAPICallError } from '@tts-sdk/provider';
import {
  getRetryAfterMs,
  isAbortError,
  isRetryableStatusCode,
  isTransientError,
  parseRetryAfterMs,
} from './retry';

describe('provider-utils retry helpers', () => {
  it('parses Retry-After seconds', () => {
    expect(parseRetryAfterMs('2')).toBe(2000);
  });

  it('parses Retry-After date', () => {
    const now = Date.parse('2026-02-10T00:00:00.000Z');
    const header = 'Tue, 10 Feb 2026 00:00:01 GMT';
    expect(parseRetryAfterMs(header, now)).toBe(1000);
  });

  it('extracts retry-after from API errors', () => {
    const error = new TTSAPICallError({
      message: 'throttled',
      statusCode: 429,
      responseHeaders: { 'retry-after': '1' },
    });

    expect(getRetryAfterMs(error)).toBe(1000);
  });

  it('classifies retryable HTTP status codes', () => {
    expect(isRetryableStatusCode(429)).toBe(true);
    expect(isRetryableStatusCode(503)).toBe(true);
    expect(isRetryableStatusCode(404)).toBe(false);
  });

  it('classifies transient errors', () => {
    expect(
      isTransientError(
        new TTSAPICallError({
          message: 'temporary',
          statusCode: 503,
        }),
      ),
    ).toBe(true);
    expect(isTransientError(new TypeError('fetch failed'))).toBe(true);
    expect(
      isTransientError(
        new TTSAPICallError({
          message: 'not found',
          statusCode: 404,
        }),
      ),
    ).toBe(false);
  });

  it('detects abort errors', () => {
    const abort = new DOMException('aborted', 'AbortError');
    expect(isAbortError(abort)).toBe(true);
  });
});
