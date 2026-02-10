import type { ProviderOptions } from '@tts-sdk/provider';
import { TTSInvalidArgumentError } from '@tts-sdk/provider';
import type { z } from 'zod';

export function parseProviderOptions<T extends z.ZodTypeAny>({
  provider,
  providerOptions,
  schema,
}: {
  provider: string;
  providerOptions: ProviderOptions | undefined;
  schema: T;
}): z.infer<T> | undefined {
  const value = providerOptions?.[provider];
  if (value == null) {
    return undefined;
  }

  const result = schema.safeParse(value);
  if (!result.success) {
    throw new TTSInvalidArgumentError(
      `Invalid providerOptions.${provider}: ${result.error.message}`,
      result.error,
    );
  }

  return result.data;
}
