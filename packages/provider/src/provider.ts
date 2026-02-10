import type { TTSModel } from './tts-types';

export interface Provider {
  speechModel(modelId: string): TTSModel;
}
