import type { TTSModel } from '@tts-sdk/provider';
import { executeStreamSynthesize } from './execute';
import type { SpeechStreamResult, SynthesizeOptions } from './types';

export async function streamSynthesize<Model extends TTSModel>(
  options: SynthesizeOptions<Model>,
): Promise<SpeechStreamResult> {
  return executeStreamSynthesize(options);
}
