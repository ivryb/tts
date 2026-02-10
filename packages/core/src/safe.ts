import type { Result } from 'neverthrow';
import { err, ok } from 'neverthrow';
import type { TTSSDKError } from '@tts-sdk/provider';
import { synthesize } from './synthesize';
import { streamSynthesize } from './stream-synthesize';
import { synthesizeWithTimestamps } from './synthesize-with-timestamps';
import type {
  SpeechResult,
  SpeechStreamResult,
  SynthesizeOptions,
  TimestampedSpeechResult,
} from './types';

function toResultError(error: unknown): TTSSDKError | Error {
  if (error instanceof Error) {
    return error;
  }

  return new Error('Unknown error');
}

export async function safeSynthesize(
  options: SynthesizeOptions,
): Promise<Result<SpeechResult, TTSSDKError | Error>> {
  try {
    return ok(await synthesize(options));
  } catch (error) {
    return err(toResultError(error));
  }
}

export async function safeStreamSynthesize(
  options: SynthesizeOptions,
): Promise<Result<SpeechStreamResult, TTSSDKError | Error>> {
  try {
    return ok(await streamSynthesize(options));
  } catch (error) {
    return err(toResultError(error));
  }
}

export async function safeSynthesizeWithTimestamps(
  options: SynthesizeOptions,
): Promise<Result<TimestampedSpeechResult, TTSSDKError | Error>> {
  try {
    return ok(await synthesizeWithTimestamps(options));
  } catch (error) {
    return err(toResultError(error));
  }
}
