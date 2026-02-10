import type { TTSModel } from '@tts-sdk/provider';
import { executeSynthesize } from './execute';
import type { SpeechResult, SynthesizeOptions } from './types';

export async function synthesize<Model extends TTSModel>(
  options: SynthesizeOptions<Model>,
): Promise<SpeechResult> {
  return executeSynthesize(options);
}
