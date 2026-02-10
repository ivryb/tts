import {
  type TTSCallOptions,
  type TTSModel,
  type TTSStreamSynthesizeResult,
  type TTSSynthesizeResult,
  TTSUnsupportedFunctionalityError,
} from '@tts-sdk/provider';
import {
  assertOk,
  combineHeaders,
  headersToRecord,
  parseProviderOptions,
  postJson,
  readResponseBodyAsChunks,
  readSSEAudioChunks,
  responseToUint8Array,
} from '@tts-sdk/provider-utils';
import type { FetchFunction } from '@tts-sdk/provider-utils';
import {
  qwenProviderOptionsSchema,
  resolveQwenVoice,
  type QwenVoice,
} from './qwen-options';

export type QwenModelConfig = {
  provider: string;
  modelId: string;
  baseURL: string;
  headers: () => Record<string, string>;
  fetch: FetchFunction;
};

export type QwenTTSCallOptions = Omit<TTSCallOptions, 'voice'> & {
  voice?: QwenVoice;
};

export class QwenTTSModel implements TTSModel<QwenTTSCallOptions> {
  readonly capabilities = {
    supportsStreaming: true,
    supportsTimestamps: false,
    supportsSsml: false,
    supportsVoiceCloning: false,
  } as const;

  readonly provider: string;
  readonly modelId: string;

  constructor(private readonly config: QwenModelConfig) {
    this.provider = config.provider;
    this.modelId = config.modelId;
  }

  private buildBody(options: TTSCallOptions, stream: boolean): Record<string, unknown> {
    const qwenOptions = parseProviderOptions({
      provider: 'qwen',
      providerOptions: options.providerOptions,
      schema: qwenProviderOptionsSchema,
    });

    return {
      model: this.modelId,
      input: options.text,
      voice: resolveQwenVoice(options.voice),
      response_format: options.outputFormat ?? 'mp3',
      speed: options.speed,
      stream,
      ...(qwenOptions?.extraBody ?? {}),
    };
  }

  async doSynthesize(options: QwenTTSCallOptions): Promise<TTSSynthesizeResult>;
  async doSynthesize(options: TTSCallOptions): Promise<TTSSynthesizeResult> {
    if (options.ssml) {
      throw new TTSUnsupportedFunctionalityError('ssml');
    }

    const response = await postJson({
      fetch: this.config.fetch,
      url: `${this.config.baseURL}/audio/speech`,
      body: this.buildBody(options, false),
      headers: combineHeaders(this.config.headers(), options.headers),
      abortSignal: options.abortSignal,
    });

    await assertOk(response, 'Qwen TTS request');
    return {
      audio: await responseToUint8Array(response),
      mediaType: response.headers.get('content-type') ?? 'audio/mpeg',
      warnings: [],
      response: {
        timestamp: new Date(),
        modelId: this.modelId,
        headers: headersToRecord(response.headers),
      },
    };
  }

  async doStreamSynthesize(
    options: QwenTTSCallOptions,
  ): Promise<TTSStreamSynthesizeResult>;
  async doStreamSynthesize(
    options: TTSCallOptions,
  ): Promise<TTSStreamSynthesizeResult> {
    if (options.ssml) {
      throw new TTSUnsupportedFunctionalityError('ssml');
    }

    const response = await postJson({
      fetch: this.config.fetch,
      url: `${this.config.baseURL}/audio/speech`,
      body: this.buildBody(options, true),
      headers: combineHeaders(this.config.headers(), options.headers),
      abortSignal: options.abortSignal,
    });

    await assertOk(response, 'Qwen TTS stream request');

    const contentType = response.headers.get('content-type') ?? 'audio/mpeg';

    if (contentType.includes('text/event-stream')) {
      return {
        audioStream: (async function* () {
          for await (const chunk of readSSEAudioChunks(response)) {
            yield { chunk };
          }

          yield { chunk: new Uint8Array(0), isFinal: true };
        })(),
        mediaType: 'audio/mpeg',
        warnings: [],
        response: {
          timestamp: new Date(),
          modelId: this.modelId,
          headers: headersToRecord(response.headers),
        },
      };
    }

    return {
      audioStream: (async function* () {
        for await (const chunk of readResponseBodyAsChunks(response)) {
          yield { chunk };
        }

        yield { chunk: new Uint8Array(0), isFinal: true };
      })(),
      mediaType: contentType,
      warnings: [],
      response: {
        timestamp: new Date(),
        modelId: this.modelId,
        headers: headersToRecord(response.headers),
      },
    };
  }

  async doSynthesizeWithTimestamps(_options: QwenTTSCallOptions): Promise<never>;
  async doSynthesizeWithTimestamps(_options: TTSCallOptions): Promise<never> {
    throw new TTSUnsupportedFunctionalityError('synthesizeWithTimestamps');
  }
}
