export * from '@tts-sdk/provider';
export { createProviderRegistry, customProvider } from './registry';
export { synthesize } from './synthesize';
export { streamSynthesize } from './stream-synthesize';
export { synthesizeWithTimestamps } from './synthesize-with-timestamps';
export {
  safeSynthesize,
  safeStreamSynthesize,
  safeSynthesizeWithTimestamps,
} from './safe';
export type {
  SpeechChunk,
  SpeechResult,
  SpeechStreamResult,
  SynthesizeOptions,
  TimestampedSpeechResult,
} from './types';
