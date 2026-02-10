import type { JSONObject } from './json-value';
import type { TTSWarning } from './warning';

export type ProviderOptions = Record<string, JSONObject>;

export type AudioFormat =
  | 'mp3'
  | 'wav'
  | 'pcm'
  | 'opus'
  | 'flac'
  | 'aac'
  | (string & {});

export type TTSCallOptions = {
  text: string;
  voice?: string;
  language?: string;
  speed?: number;
  instructions?: string;
  ssml?: string;
  outputFormat?: AudioFormat;
  sampleRate?: number;
  providerOptions?: ProviderOptions;
  headers?: Record<string, string | undefined>;
  abortSignal?: AbortSignal;
};

export type TTSResponseMetadata = {
  timestamp: Date;
  modelId: string;
  headers?: Record<string, string>;
  body?: unknown;
};

export type AudioChunk = {
  chunk: Uint8Array;
  isFinal?: boolean;
};

export type TTSTimeSegment = {
  text: string;
  startMs: number;
  endMs: number;
};

export type TTSTimeWord = {
  word: string;
  startMs: number;
  endMs: number;
};

export type TTSTimeViseme = {
  visemeId: string;
  startMs: number;
  endMs?: number;
};

export type TTSSynthesizeResult = {
  audio: Uint8Array;
  mediaType: string;
  warnings: TTSWarning[];
  response: TTSResponseMetadata;
  providerMetadata?: Record<string, JSONObject>;
};

export type TTSStreamSynthesizeResult = {
  audioStream: AsyncIterable<AudioChunk>;
  mediaType: string;
  warnings: TTSWarning[];
  response: TTSResponseMetadata;
  providerMetadata?: Record<string, JSONObject>;
};

export type TTSTimestampedSynthesizeResult = TTSSynthesizeResult & {
  segments: TTSTimeSegment[];
  words: TTSTimeWord[];
  visemes?: TTSTimeViseme[];
};

export type TTSModelCapabilities = {
  supportsStreaming: boolean;
  supportsTimestamps: boolean;
  supportsSsml: boolean;
  supportsVoiceCloning: boolean;
};

export interface TTSModel<CallOptions extends TTSCallOptions = TTSCallOptions> {
  readonly provider: string;
  readonly modelId: string;
  readonly capabilities: TTSModelCapabilities;

  doSynthesize(options: CallOptions): Promise<TTSSynthesizeResult>;
  doStreamSynthesize?(options: CallOptions): Promise<TTSStreamSynthesizeResult>;
  doSynthesizeWithTimestamps?(
    options: CallOptions,
  ): Promise<TTSTimestampedSynthesizeResult>;
}
