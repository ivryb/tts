import type { TTSModel } from '@tts-sdk/provider';
import { executeSynthesizeWithTimestamps } from './execute';
import type { SynthesizeOptions, TimestampedSpeechResult } from './types';

export async function synthesizeWithTimestamps<Model extends TTSModel>(
  options: SynthesizeOptions<Model>,
): Promise<TimestampedSpeechResult> {
  return executeSynthesizeWithTimestamps(options);
}
