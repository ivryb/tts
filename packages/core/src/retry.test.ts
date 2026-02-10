import { afterEach, describe, expect, it, vi } from 'vitest';
import { TTSAPICallError, TTSInvalidArgumentError } from '@tts-sdk/provider';
import { withRetries } from './retry';

describe('withRetries', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('retries transient API errors with backoff and succeeds', async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0.5);

    let calls = 0;
    const run = vi.fn(async () => {
      calls += 1;
      if (calls < 3) {
        throw new TTSAPICallError({
          message: 'temporary',
          statusCode: 503,
        });
      }

      return 'ok';
    });

    const promise = withRetries({ maxRetries: 3, run });

    await vi.runAllTimersAsync();
    await expect(promise).resolves.toBe('ok');
    expect(run).toHaveBeenCalledTimes(3);
  });

  it('does not retry non-transient argument errors', async () => {
    const run = vi.fn(async () => {
      throw new TTSInvalidArgumentError('bad input');
    });

    await expect(withRetries({ maxRetries: 3, run })).rejects.toBeInstanceOf(
      TTSInvalidArgumentError,
    );
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('honors Retry-After header when present', async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0);

    let calls = 0;
    const run = vi.fn(async () => {
      calls += 1;
      if (calls === 1) {
        throw new TTSAPICallError({
          message: 'throttled',
          statusCode: 429,
          responseHeaders: { 'retry-after': '1' },
        });
      }

      return 'ok';
    });

    const promise = withRetries({ maxRetries: 1, run });
    await Promise.resolve();

    await vi.advanceTimersByTimeAsync(999);
    expect(run).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1);
    await expect(promise).resolves.toBe('ok');
    expect(run).toHaveBeenCalledTimes(2);
  });

  it('stops retrying when aborted during backoff', async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(1);

    const controller = new AbortController();
    const run = vi.fn(async () => {
      throw new TTSAPICallError({
        message: 'temporary',
        statusCode: 503,
      });
    });

    const promise = withRetries({
      maxRetries: 3,
      abortSignal: controller.signal,
      run,
    });

    await Promise.resolve();
    controller.abort();

    await expect(promise).rejects.toMatchObject({ name: 'AbortError' });
    expect(run).toHaveBeenCalledTimes(1);
  });
});
