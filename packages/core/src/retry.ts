import {
  TTSInvalidArgumentError,
  TTSNoSuchModelError,
  TTSNoSuchProviderError,
  TTSUnsupportedFunctionalityError,
} from '@tts-sdk/provider';
import { getRetryAfterMs, isAbortError, isTransientError } from '@tts-sdk/provider-utils';

const BASE_DELAY_MS = 200;
const MAX_DELAY_MS = 2000;

function ensureNotAborted(abortSignal?: AbortSignal): void {
  if (abortSignal?.aborted) {
    throw new DOMException('The operation was aborted.', 'AbortError');
  }
}

function shouldRetry(error: unknown): boolean {
  if (isAbortError(error)) {
    return false;
  }

  if (
    TTSInvalidArgumentError.isInstance(error) ||
    TTSUnsupportedFunctionalityError.isInstance(error) ||
    TTSNoSuchModelError.isInstance(error) ||
    TTSNoSuchProviderError.isInstance(error)
  ) {
    return false;
  }

  return isTransientError(error);
}

function getBackoffDelayMs(attempt: number): number {
  const expDelay = Math.min(MAX_DELAY_MS, BASE_DELAY_MS * 2 ** attempt);
  return Math.floor(Math.random() * expDelay);
}

async function sleepWithAbort(ms: number, abortSignal?: AbortSignal): Promise<void> {
  if (ms <= 0) {
    ensureNotAborted(abortSignal);
    return;
  }

  ensureNotAborted(abortSignal);

  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      cleanup();
      resolve();
    }, ms);

    const onAbort = () => {
      cleanup();
      reject(new DOMException('The operation was aborted.', 'AbortError'));
    };

    const cleanup = () => {
      clearTimeout(timeout);
      abortSignal?.removeEventListener('abort', onAbort);
    };

    abortSignal?.addEventListener('abort', onAbort, { once: true });
  });
}

export async function withRetries<T>({
  maxRetries,
  abortSignal,
  run,
}: {
  maxRetries: number;
  abortSignal?: AbortSignal;
  run: () => Promise<T>;
}): Promise<T> {
  for (let attempt = 0; ; attempt += 1) {
    ensureNotAborted(abortSignal);

    try {
      return await run();
    } catch (error) {
      if (attempt >= maxRetries || !shouldRetry(error)) {
        throw error;
      }

      const retryAfterMs = getRetryAfterMs(error);
      const delayMs = retryAfterMs ?? getBackoffDelayMs(attempt);
      await sleepWithAbort(delayMs, abortSignal);
    }
  }
}
