import type {
  AudioChunk,
  TTSCallOptions,
  TTSModel,
  TTSSynthesizeResult,
  TTSStreamSynthesizeResult,
  TTSTimestampedSynthesizeResult,
} from '@tts-sdk/provider';

export type ModelCallOptions<Model extends TTSModel = TTSModel> =
  Parameters<Model['doSynthesize']>[0];

export type SynthesizeOptions<Model extends TTSModel = TTSModel> = {
  model: Model;
  text: string;
  voice?: ModelCallOptions<Model>['voice'];
  language?: TTSCallOptions['language'];
  speed?: TTSCallOptions['speed'];
  instructions?: TTSCallOptions['instructions'];
  ssml?: TTSCallOptions['ssml'];
  outputFormat?: TTSCallOptions['outputFormat'];
  sampleRate?: TTSCallOptions['sampleRate'];
  providerOptions?: TTSCallOptions['providerOptions'];
  headers?: Record<string, string>;
  maxRetries?: number;
  abortSignal?: AbortSignal;
};

export type SpeechResult = TTSSynthesizeResult;
export type SpeechStreamResult = TTSStreamSynthesizeResult;
export type TimestampedSpeechResult = TTSTimestampedSynthesizeResult;
export type SpeechChunk = AudioChunk;
